import prisma from "@trender/db";
import { pipelineLogger } from "../../services/pipeline-logger";
import { reelPipeline } from "../../services/reel-pipeline";
import { buildReelVideoUrl } from "../../services/url-builder";

type StageStats = {
  stage: string;
  count: number;
  totalDuration: number;
  errors: number;
};

type TimelineEntry = {
  stage: string;
  level: string;
  message: string;
  duration: number | null;
  timestamp: Date;
  metadata: unknown;
};

// Use loose typing for complex query results - the actual structure
// is determined by the Prisma queries with custom selects/includes
type ReelDebugData = {
  reel: unknown;
  stageStats: StageStats[];
  recentErrors: unknown[];
  timeline: TimelineEntry[];
  logs: unknown[];
  aiLogs: unknown[];
  analyses: unknown[];
  template: unknown;
  generations: unknown[];
  sceneGenerations: unknown[];
  compositeGenerations: unknown[];
  videoUrl: string | null;
};

type ReelDebugResult =
  | { success: true; data: ReelDebugData }
  | { success: false; error: string; status: 404 | 500 };

export async function getReelDebugUseCase(
  id: string
): Promise<ReelDebugResult> {
  const reel = await reelPipeline.getReelWithDetails(id);

  if (!reel) {
    return { success: false, error: "Reel not found", status: 404 };
  }

  // Получаем статистику по этапам
  const stageStats = await pipelineLogger.getStageStats(id);

  // Получаем последние ошибки
  const recentErrors = await pipelineLogger.getRecentErrors(id);

  // Получаем все логи для таймлайна
  const logs = await pipelineLogger.getReelLogs(id);

  // Собираем таймлайн из логов
  const timeline: TimelineEntry[] = logs.map((log) => ({
    stage: log.stage,
    level: log.level,
    message: log.message,
    duration: log.duration,
    timestamp: log.createdAt,
    metadata: log.metadata,
  }));

  // Получаем все анализы для этого рила
  const analyses = await prisma.videoAnalysis.findMany({
    where: {
      sourceType: "reel",
      sourceId: id,
    },
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      analysisType: true,
      duration: true,
      aspectRatio: true,
      elements: true,
      hasScenes: true,
      scenesCount: true,
      createdAt: true,
      tags: true,
      videoScenes: {
        orderBy: { index: "asc" },
      },
      videoElements: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Получаем генерации для этого рила через analysisIds
  const analysisIds = analyses.map((a) => a.id);
  const relatedGenerations = await prisma.videoGeneration.findMany({
    where: { analysisId: { in: analysisIds } },
    orderBy: { createdAt: "desc" },
  });

  const generationIds = relatedGenerations.map((g) => g.id);

  // Получаем scene генерации через VideoScene -> SceneGeneration
  const sceneIds = analyses.flatMap(
    (a) => a.videoScenes?.map((s) => s.id) || []
  );
  const sceneGenerations =
    sceneIds.length > 0
      ? await prisma.sceneGeneration.findMany({
          where: { sceneId: { in: sceneIds } },
          orderBy: { createdAt: "desc" },
          include: {
            scene: {
              select: {
                index: true,
                startTime: true,
                endTime: true,
                duration: true,
                thumbnailUrl: true,
              },
            },
          },
        })
      : [];

  // Получаем composite генерации
  const compositeGenerations =
    analysisIds.length > 0
      ? await prisma.compositeGeneration.findMany({
          where: { analysisId: { in: analysisIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];

  // Получаем AI логи
  const aiLogs = await prisma.aILog.findMany({
    where: {
      OR: [{ reelId: id }, { generationId: { in: generationIds } }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Формируем videoUrl из s3Key или localPath
  const videoUrl = buildReelVideoUrl(reel);

  return {
    success: true,
    data: {
      reel: {
        ...reel,
        videoUrl,
      },
      stageStats,
      recentErrors,
      timeline,
      logs,
      aiLogs,
      analyses,
      template: reel.template,
      generations: relatedGenerations,
      sceneGenerations,
      compositeGenerations,
      videoUrl,
    },
  };
}
