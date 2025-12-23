/**
 * Scene-based Video Analysis & Generation Routes
 */

import prisma from "@trender/db";
import { Hono } from "hono";
import { pipelineJobQueue } from "../services/queues/pipeline-queue";
import { sceneGenJobQueue } from "../services/queues/scene-gen-queue";
import { buildReelVideoUrl } from "../services/url-builder";

const app = new Hono();

/**
 * POST /api/scenes/analyze
 * Start scene-based analysis for a reel
 */
app.post("/analyze", async (c) => {
  try {
    const body = await c.req.json();
    const { reelId, threshold = 27.0, minSceneLen = 1.0 } = body;

    if (!reelId) {
      return c.json({ success: false, error: "reelId is required" }, 400);
    }

    // Check if reel exists
    const reel = await prisma.reel.findUnique({ where: { id: reelId } });
    if (!reel) {
      return c.json({ success: false, error: "Reel not found" }, 404);
    }

    // Add to pipeline queue with new analyze-scenes action
    const jobId = await pipelineJobQueue.addAnalyzeScenesJob(reelId, {
      threshold,
      minSceneLen,
    });

    return c.json({
      success: true,
      message: "Scene analysis started",
      jobId,
      reelId,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * GET /api/scenes/:analysisId
 * Get all scenes for a video analysis
 */
app.get("/:analysisId", async (c) => {
  try {
    const analysisId = c.req.param("analysisId");

    const analysis = await prisma.videoAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        videoScenes: {
          orderBy: { index: "asc" },
          include: {
            generations: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!analysis) {
      return c.json({ success: false, error: "Analysis not found" }, 404);
    }

    return c.json({
      success: true,
      analysis: {
        id: analysis.id,
        hasScenes: analysis.hasScenes,
        scenesCount: analysis.scenesCount,
        duration: analysis.duration,
        aspectRatio: analysis.aspectRatio,
        tags: analysis.tags,
      },
      scenes: analysis.videoScenes.map((scene) => ({
        id: scene.id,
        index: scene.index,
        startTime: scene.startTime,
        endTime: scene.endTime,
        duration: scene.duration,
        thumbnailUrl: scene.thumbnailUrl,
        elements: scene.elements,
        generationStatus: scene.generationStatus,
        latestGeneration: scene.generations[0] || null,
      })),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * POST /api/scenes/generate
 * Start generation for selected scenes
 */
app.post("/generate", async (c) => {
  try {
    const body = await c.req.json();
    const { analysisId, sceneSelections } = body;

    // sceneSelections: [
    //   { sceneId: "...", useOriginal: true },
    //   { sceneId: "...", useOriginal: false, prompt: "...", elementSelections: [...] }
    // ]

    if (!(analysisId && sceneSelections && Array.isArray(sceneSelections))) {
      return c.json(
        {
          success: false,
          error: "analysisId and sceneSelections are required",
        },
        400
      );
    }

    // Get analysis with scenes
    const analysis = await prisma.videoAnalysis.findUnique({
      where: { id: analysisId },
      include: { videoScenes: { orderBy: { index: "asc" } } },
    });

    if (!analysis) {
      return c.json({ success: false, error: "Analysis not found" }, 404);
    }

    // Get source video URL
    const reel = analysis.sourceId
      ? await prisma.reel.findUnique({ where: { id: analysis.sourceId } })
      : null;

    if (!reel) {
      return c.json({ success: false, error: "Source reel not found" }, 404);
    }

    const sourceVideoUrl = buildReelVideoUrl(reel.id, reel.s3Key);

    // Start generations for non-original scenes
    const sceneGenerationIds: string[] = [];
    const sceneConfigs: {
      sceneId: string;
      sceneIndex: number;
      useOriginal: boolean;
      generationId?: string;
      startTime: number;
      endTime: number;
    }[] = [];

    for (const selection of sceneSelections) {
      const scene = analysis.videoScenes.find(
        (s) => s.id === selection.sceneId
      );
      if (!scene) continue;

      if (selection.useOriginal) {
        sceneConfigs.push({
          sceneId: scene.id,
          sceneIndex: scene.index,
          useOriginal: true,
          startTime: scene.startTime,
          endTime: scene.endTime,
        });
      } else {
        // Build prompt from element selections or use provided prompt
        const prompt =
          selection.prompt ||
          buildPromptFromSelections(selection.elementSelections);

        // Start scene generation
        const generationId = await sceneGenJobQueue.startSceneGeneration(
          scene.id,
          prompt,
          sourceVideoUrl,
          scene.startTime,
          scene.endTime,
          selection.options
        );

        sceneGenerationIds.push(generationId);
        sceneConfigs.push({
          sceneId: scene.id,
          sceneIndex: scene.index,
          useOriginal: false,
          generationId,
          startTime: scene.startTime,
          endTime: scene.endTime,
        });
      }
    }

    // Start composite generation
    const compositeId = await sceneGenJobQueue.startCompositeGeneration(
      analysisId,
      sourceVideoUrl,
      sceneConfigs
    );

    return c.json({
      success: true,
      compositeGenerationId: compositeId,
      sceneGenerationIds,
      message: `Started generation for ${sceneGenerationIds.length} scenes`,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Build prompt from element selections
 */
function buildPromptFromSelections(
  elementSelections?: Array<{
    elementId: string;
    selectedOptionId: string;
    prompt?: string;
  }>
): string {
  if (!elementSelections || elementSelections.length === 0) {
    return "Transform the video with creative visual effects";
  }

  const transformations = elementSelections
    .map((sel) => sel.prompt || `Transform ${sel.elementId}`)
    .join(". ");

  return `Based on @Video1, ${transformations}`;
}

/**
 * GET /api/scenes/generation/:compositeId/status
 * Get status of composite generation
 */
app.get("/generation/:compositeId/status", async (c) => {
  try {
    const compositeId = c.req.param("compositeId");

    const composite = await prisma.compositeGeneration.findUnique({
      where: { id: compositeId },
    });

    if (!composite) {
      return c.json(
        { success: false, error: "Composite generation not found" },
        404
      );
    }

    // Get scene generation statuses
    const sceneConfig = composite.sceneConfig as Array<{
      sceneId: string;
      useOriginal: boolean;
      generationId?: string;
    }>;

    const sceneGenerationIds = sceneConfig
      .filter((c) => !c.useOriginal && c.generationId)
      .map((c) => c.generationId!);

    const sceneGenerations = await prisma.sceneGeneration.findMany({
      where: { id: { in: sceneGenerationIds } },
    });

    return c.json({
      success: true,
      composite: {
        id: composite.id,
        status: composite.status,
        progress: composite.progress,
        stage: composite.progressStage,
        message: composite.progressMessage,
        videoUrl: composite.videoUrl,
        error: composite.error,
      },
      scenes: sceneGenerations.map((gen) => ({
        id: gen.id,
        sceneId: gen.sceneId,
        status: gen.status,
        progress: gen.progress,
        stage: gen.progressStage,
        message: gen.progressMessage,
        videoUrl: gen.videoUrl,
        error: gen.error,
      })),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * GET /api/scenes/generation/:sceneGenId/scene-status
 * Get status of single scene generation
 */
app.get("/generation/:sceneGenId/scene-status", async (c) => {
  try {
    const sceneGenId = c.req.param("sceneGenId");

    const generation = await prisma.sceneGeneration.findUnique({
      where: { id: sceneGenId },
      include: { scene: true },
    });

    if (!generation) {
      return c.json(
        { success: false, error: "Scene generation not found" },
        404
      );
    }

    return c.json({
      success: true,
      generation: {
        id: generation.id,
        sceneId: generation.sceneId,
        sceneIndex: generation.scene.index,
        status: generation.status,
        progress: generation.progress,
        stage: generation.progressStage,
        message: generation.progressMessage,
        videoUrl: generation.videoUrl,
        error: generation.error,
        klingTaskId: generation.klingTaskId,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * GET /api/scenes/composite/:analysisId
 * Get all composite generations for an analysis
 */
app.get("/composite/:analysisId", async (c) => {
  try {
    const analysisId = c.req.param("analysisId");

    const composites = await prisma.compositeGeneration.findMany({
      where: { analysisId },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      success: true,
      composites: composites.map((comp) => ({
        id: comp.id,
        status: comp.status,
        progress: comp.progress,
        stage: comp.progressStage,
        message: comp.progressMessage,
        videoUrl: comp.videoUrl,
        error: comp.error,
        createdAt: comp.createdAt,
        completedAt: comp.completedAt,
      })),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
