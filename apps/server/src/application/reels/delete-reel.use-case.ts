import prisma from "@trender/db";
import { s3Service } from "../../services/s3";

type DeleteReelResult =
  | { success: true; message: string }
  | { success: false; error: string; status: 404 | 500 };

export async function deleteReelUseCase(id: string): Promise<DeleteReelResult> {
  const reel = await prisma.reel.findUnique({ where: { id } });
  if (!reel) {
    return { success: false, error: "Reel not found", status: 404 };
  }

  // Collect S3 keys to delete
  const s3KeysToDelete: string[] = [];
  if (reel.s3Key) {
    s3KeysToDelete.push(reel.s3Key);
  }

  // Delete related data in transaction
  await prisma.$transaction(async (tx) => {
    // Delete logs
    await tx.reelLog.deleteMany({ where: { reelId: id } });
    await tx.aILog.deleteMany({ where: { reelId: id } });

    // Get analyses for this reel
    const analyses = await tx.videoAnalysis.findMany({
      where: { sourceType: "reel", sourceId: id },
      select: { id: true },
    });
    const analysisIds = analyses.map((a) => a.id);

    if (analysisIds.length > 0) {
      // Get video scenes with their S3 keys
      const scenes = await tx.videoScene.findMany({
        where: { analysisId: { in: analysisIds } },
        select: { id: true, thumbnailS3Key: true, videoS3Key: true },
      });
      const sceneIds = scenes.map((s) => s.id);

      // Collect scene S3 keys
      for (const scene of scenes) {
        if (scene.thumbnailS3Key) s3KeysToDelete.push(scene.thumbnailS3Key);
        if (scene.videoS3Key) s3KeysToDelete.push(scene.videoS3Key);
      }

      if (sceneIds.length > 0) {
        // Get scene generations with S3 keys
        const sceneGens = await tx.sceneGeneration.findMany({
          where: { sceneId: { in: sceneIds } },
          select: { s3Key: true },
        });
        for (const gen of sceneGens) {
          if (gen.s3Key) s3KeysToDelete.push(gen.s3Key);
        }

        await tx.sceneGeneration.deleteMany({
          where: { sceneId: { in: sceneIds } },
        });
        await tx.videoScene.deleteMany({ where: { id: { in: sceneIds } } });
      }

      // Delete video elements
      await tx.videoElement.deleteMany({
        where: { analysisId: { in: analysisIds } },
      });

      // Get composite generations with S3 keys
      const compositeGens = await tx.compositeGeneration.findMany({
        where: { analysisId: { in: analysisIds } },
        select: { s3Key: true },
      });
      for (const gen of compositeGens) {
        if (gen.s3Key) s3KeysToDelete.push(gen.s3Key);
      }
      await tx.compositeGeneration.deleteMany({
        where: { analysisId: { in: analysisIds } },
      });

      // Get video generations with S3 keys
      const videoGens = await tx.videoGeneration.findMany({
        where: { analysisId: { in: analysisIds } },
        select: { s3Key: true },
      });
      for (const gen of videoGens) {
        if (gen.s3Key) s3KeysToDelete.push(gen.s3Key);
      }
      await tx.videoGeneration.deleteMany({
        where: { analysisId: { in: analysisIds } },
      });

      // Delete analyses
      await tx.videoAnalysis.deleteMany({
        where: { id: { in: analysisIds } },
      });
    }

    // Finally delete the reel
    await tx.reel.delete({ where: { id } });
  });

  // Delete S3 files after transaction (non-blocking)
  if (s3KeysToDelete.length > 0) {
    console.log(`[DeleteReel] Deleting ${s3KeysToDelete.length} S3 files...`);
    Promise.all(
      s3KeysToDelete.map((key) =>
        s3Service.deleteFile(key).catch((err) => {
          console.error(`[DeleteReel] Failed to delete S3 file ${key}:`, err);
        })
      )
    ).then(() => {
      console.log(`[DeleteReel] S3 cleanup completed for reel ${id}`);
    });
  }

  return { success: true, message: "Reel deleted successfully" };
}
