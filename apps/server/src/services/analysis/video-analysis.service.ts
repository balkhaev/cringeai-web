/**
 * Video Analysis Service
 * Handles video analysis using Gemini and ChatGPT
 */
import prisma from "@trender/db";
import type { ReelStatus } from "@trender/db/enums";
import { services, video as videoConfig } from "../../config";
import { type GeminiProgressCallback, getGeminiService } from "../gemini";
import { getOpenAIService, isOpenAIConfigured } from "../openai";
import { pipelineLogger } from "../pipeline-logger";
import { loadVideoBuffer } from "../video/video-loader";

// Service URLs
const VIDEO_FRAMES_SERVICE_URL = services.videoFrames;
const FRAME_INTERVAL_SEC = videoConfig.frameIntervalSec;

// Prisma types
type Reel = NonNullable<Awaited<ReturnType<typeof prisma.reel.findFirst>>>;
type VideoAnalysis = NonNullable<
  Awaited<ReturnType<typeof prisma.videoAnalysis.findFirst>>
>;

/**
 * Callbacks for progress updates during analysis
 */
export type AnalysisProgressCallbacks = {
  updateStatus: (
    reelId: string,
    status: ReelStatus,
    errorMessage?: string
  ) => Promise<Reel>;
  updateProgress: (
    reelId: string,
    stage: string,
    percent: number,
    message: string
  ) => Promise<void>;
};

/**
 * RemixOption type for elements
 */
type RemixOption = {
  id: string;
  label: string;
  icon: string;
  prompt: string;
};

/**
 * Element with options type
 */
type ElementWithOptions = {
  id: string;
  type: "character" | "object" | "background";
  label: string;
  description: string;
  remixOptions: RemixOption[];
};

/**
 * Merge elements from Gemini with options from ChatGPT
 */
async function mergeElementsWithOptions(
  elements: Array<{
    id: string;
    type: "character" | "object" | "background";
    label: string;
    description: string;
  }>,
  reelId: string,
  onProgress: GeminiProgressCallback,
  progressStart: number,
  progressMessage: string
): Promise<ElementWithOptions[]> {
  // Start with empty options
  let elementsWithOptions: ElementWithOptions[] = elements.map((el) => ({
    ...el,
    remixOptions: [],
  }));

  // Generate options with ChatGPT if configured
  if (isOpenAIConfigured() && elements.length > 0) {
    await onProgress("analyze", progressStart, progressMessage);

    try {
      const openaiService = getOpenAIService();
      const enchantingResults =
        await openaiService.generateEnchantingOptions(elements);

      elementsWithOptions = elements.map((element) => {
        const enchantingResult = enchantingResults.find(
          (r) => r.id === element.id
        );
        return {
          id: element.id,
          type: element.type,
          label: element.label,
          description: element.description,
          remixOptions: enchantingResult?.remixOptions || [],
        };
      });
    } catch (openaiError) {
      await pipelineLogger.warn({
        reelId,
        stage: "analyze",
        message: `ChatGPT ошибка: ${openaiError instanceof Error ? openaiError.message : String(openaiError)}`,
      });
    }
  }

  return elementsWithOptions;
}

/**
 * Extract frames from video using video-frames service
 */
async function extractFrames(
  buffer: Buffer,
  reelId: string
): Promise<{
  frames: string[];
  count: number;
  duration_sec: number | null;
}> {
  const formData = new FormData();
  formData.append(
    "video",
    new Blob([new Uint8Array(buffer)], { type: "video/mp4" }),
    `${reelId}.mp4`
  );
  formData.append("interval_sec", FRAME_INTERVAL_SEC.toString());

  const response = await fetch(`${VIDEO_FRAMES_SERVICE_URL}/extract-frames`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to extract frames: ${errorText}`);
  }

  const data = (await response.json()) as {
    success: boolean;
    frames: string[];
    count: number;
    duration_sec: number | null;
    error?: string;
  };

  if (!data.success || data.frames.length === 0) {
    throw new Error(data.error || "No frames extracted from video");
  }

  return data;
}

/**
 * Analyze video using standard method (Gemini full video + ChatGPT)
 */
export async function analyzeReel(
  reelId: string,
  callbacks: AnalysisProgressCallbacks
): Promise<VideoAnalysis> {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel) {
    throw new Error(`Reel ${reelId} not found`);
  }

  if (!(reel.s3Key || reel.localPath)) {
    throw new Error(
      `Reel ${reelId} has no video file (neither S3 nor local). Download first.`
    );
  }

  await callbacks.updateStatus(reelId, "analyzing");
  await callbacks.updateProgress(reelId, "analyze", 0, "Начало анализа...");

  const timer = pipelineLogger.startTimer(
    reelId,
    "analyze",
    "Analyzing video with Gemini + ChatGPT"
  );

  const onProgress: GeminiProgressCallback = async (
    stage,
    percent,
    message
  ) => {
    await callbacks.updateProgress(reelId, stage, percent, message);
  };

  try {
    await onProgress("analyze", 2, "Загрузка видеофайла...");
    const buffer = await loadVideoBuffer(reel);

    await onProgress("analyze", 10, "Gemini определяет элементы видео...");
    const geminiService = getGeminiService();
    const elementsAnalysis = await geminiService.processVideoElementsOnly(
      buffer,
      "video/mp4",
      `${reelId}.mp4`,
      onProgress
    );

    const elementsWithOptions = await mergeElementsWithOptions(
      elementsAnalysis.elements,
      reelId,
      onProgress,
      60,
      `ChatGPT генерирует варианты для ${elementsAnalysis.elements.length} элементов...`
    );

    await onProgress("analyze", 95, "Сохранение результатов анализа...");

    const savedAnalysis = await prisma.videoAnalysis.create({
      data: {
        sourceType: "reel",
        sourceId: reelId,
        fileName: `${reelId}.mp4`,
        analysisType: "standard",
        duration: elementsAnalysis.duration,
        aspectRatio: elementsAnalysis.aspectRatio,
        tags: elementsAnalysis.tags,
        elements: elementsWithOptions,
      },
    });

    await onProgress("analyze", 100, "Анализ завершён");
    await timer.stop("Video analyzed successfully (standard + ChatGPT)", {
      elementsCount: elementsWithOptions.length,
      tags: elementsAnalysis.tags,
    });

    return savedAnalysis;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await callbacks.updateProgress(
      reelId,
      "analyze",
      0,
      `Ошибка: ${err.message}`
    );
    await timer.fail(err);
    await callbacks.updateStatus(reelId, "failed", err.message);
    throw err;
  }
}

/**
 * Analyze video by frames (extract frames + Gemini + ChatGPT)
 */
export async function analyzeReelByFrames(
  reelId: string,
  callbacks: AnalysisProgressCallbacks
): Promise<VideoAnalysis> {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel) {
    throw new Error(`Reel ${reelId} not found`);
  }

  if (!(reel.s3Key || reel.localPath)) {
    throw new Error(
      `Reel ${reelId} has no video file (neither S3 nor local). Download first.`
    );
  }

  await callbacks.updateStatus(reelId, "analyzing");
  await callbacks.updateProgress(
    reelId,
    "analyze",
    0,
    "Начало анализа по кадрам..."
  );

  const timer = pipelineLogger.startTimer(
    reelId,
    "analyze",
    "Analyzing video by frames with Gemini"
  );

  const onProgress: GeminiProgressCallback = async (
    stage,
    percent,
    message
  ) => {
    await callbacks.updateProgress(reelId, stage, percent, message);
  };

  try {
    await onProgress("analyze", 2, "Загрузка видеофайла...");
    const buffer = await loadVideoBuffer(reel);

    await onProgress("processing", 5, "Извлечение кадров из видео...");
    const framesData = await extractFrames(buffer, reelId);

    await onProgress(
      "processing",
      40,
      `Извлечено ${framesData.count} кадров, начинаем анализ...`
    );

    const geminiService = getGeminiService();
    const elementsAnalysis = await geminiService.analyzeFramesElementsOnly(
      framesData.frames,
      onProgress
    );

    const elementsWithOptions = await mergeElementsWithOptions(
      elementsAnalysis.elements,
      reelId,
      onProgress,
      70,
      `ChatGPT генерирует варианты для ${elementsAnalysis.elements.length} элементов...`
    );

    await onProgress("analyze", 95, "Сохранение результатов анализа...");

    const savedAnalysis = await prisma.videoAnalysis.create({
      data: {
        sourceType: "reel",
        sourceId: reelId,
        fileName: `${reelId}.mp4`,
        analysisType: "frames",
        duration: elementsAnalysis.duration,
        aspectRatio: elementsAnalysis.aspectRatio,
        tags: elementsAnalysis.tags,
        elements: elementsWithOptions,
      },
    });

    await onProgress("analyze", 100, "Анализ по кадрам завершён");
    await timer.stop("Video analyzed by frames successfully (+ ChatGPT)", {
      frameCount: framesData.count,
      elementsCount: elementsWithOptions.length,
      tags: elementsAnalysis.tags,
    });

    return savedAnalysis;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await callbacks.updateProgress(
      reelId,
      "analyze",
      0,
      `Ошибка: ${err.message}`
    );
    await timer.fail(err);
    await callbacks.updateStatus(reelId, "failed", err.message);
    throw err;
  }
}

/**
 * Analyze video with enchanting mode (Gemini + ChatGPT mandatory)
 */
export async function analyzeReelEnchanting(
  reelId: string,
  callbacks: AnalysisProgressCallbacks
): Promise<VideoAnalysis> {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel) {
    throw new Error(`Reel ${reelId} not found`);
  }

  if (!(reel.s3Key || reel.localPath)) {
    throw new Error(
      `Reel ${reelId} has no video file (neither S3 nor local). Download first.`
    );
  }

  if (!isOpenAIConfigured()) {
    throw new Error(
      "OpenAI API is not configured. Set OPENAI_API_KEY environment variable."
    );
  }

  await callbacks.updateStatus(reelId, "analyzing");
  await callbacks.updateProgress(
    reelId,
    "analyze",
    0,
    "Начало enchanting анализа (Gemini + ChatGPT)..."
  );

  const timer = pipelineLogger.startTimer(
    reelId,
    "analyze",
    "Analyzing video with Gemini + ChatGPT (enchanting)"
  );

  const onProgress: GeminiProgressCallback = async (
    stage,
    percent,
    message
  ) => {
    await callbacks.updateProgress(reelId, stage, percent, message);
  };

  try {
    await onProgress("analyze", 2, "Загрузка видеофайла...");
    const buffer = await loadVideoBuffer(reel);

    await onProgress("analyze", 10, "Gemini определяет элементы видео...");
    const geminiService = getGeminiService();
    const elementsAnalysis = await geminiService.processVideoElementsOnly(
      buffer,
      "video/mp4",
      `${reelId}.mp4`,
      onProgress
    );

    await onProgress(
      "analyze",
      60,
      `ChatGPT генерирует варианты для ${elementsAnalysis.elements.length} элементов...`
    );
    const openaiService = getOpenAIService();
    const enchantingResults = await openaiService.generateEnchantingOptions(
      elementsAnalysis.elements
    );

    const elementsWithOptions = elementsAnalysis.elements.map((element) => {
      const enchantingResult = enchantingResults.find(
        (r) => r.id === element.id
      );
      return {
        id: element.id,
        type: element.type,
        label: element.label,
        description: element.description,
        remixOptions: enchantingResult?.remixOptions || [],
      };
    });

    await onProgress("analyze", 90, "Сохранение результатов анализа...");

    const savedAnalysis = await prisma.videoAnalysis.create({
      data: {
        sourceType: "reel",
        sourceId: reelId,
        fileName: `${reelId}.mp4`,
        analysisType: "enchanting",
        duration: elementsAnalysis.duration,
        aspectRatio: elementsAnalysis.aspectRatio,
        tags: elementsAnalysis.tags,
        elements: elementsWithOptions,
      },
    });

    await onProgress("analyze", 100, "Enchanting анализ завершён");
    await timer.stop("Video analyzed with enchanting mode successfully", {
      elementsCount: elementsWithOptions.length,
      tags: elementsAnalysis.tags,
    });

    return savedAnalysis;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await callbacks.updateProgress(
      reelId,
      "analyze",
      0,
      `Ошибка: ${err.message}`
    );
    await timer.fail(err);
    await callbacks.updateStatus(reelId, "failed", err.message);
    throw err;
  }
}

/**
 * Video Analysis Service singleton
 */
class VideoAnalysisService {
  async analyzeReel(
    reelId: string,
    callbacks: AnalysisProgressCallbacks
  ): Promise<VideoAnalysis> {
    return analyzeReel(reelId, callbacks);
  }

  async analyzeReelByFrames(
    reelId: string,
    callbacks: AnalysisProgressCallbacks
  ): Promise<VideoAnalysis> {
    return analyzeReelByFrames(reelId, callbacks);
  }

  async analyzeReelEnchanting(
    reelId: string,
    callbacks: AnalysisProgressCallbacks
  ): Promise<VideoAnalysis> {
    return analyzeReelEnchanting(reelId, callbacks);
  }
}

export const videoAnalysisService = new VideoAnalysisService();
