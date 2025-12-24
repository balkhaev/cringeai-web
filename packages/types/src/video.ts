/**
 * Типы для видео анализа и генерации
 */

export type VideoProvider = "veo3" | "sora2" | "kling";

export type RemixOption = {
  id: string;
  label: string;
  icon: string;
  prompt: string;
};

export type DetectableElement = {
  id: string;
  type: "character" | "object" | "background";
  label: string;
  description: string;
  remixOptions: RemixOption[];
};

export type VideoAnalysis = {
  duration: number | null;
  aspectRatio: string;
  tags: string[];
  elements: DetectableElement[];
};

export type VideoAnalysisWithId = VideoAnalysis & {
  id: string;
  sourceType: string;
  sourceId?: string;
  fileName?: string;
  analysisType?: string;
  hasScenes?: boolean;
  scenesCount?: number | null;
  createdAt: string;
};

export type VideoGenerationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type VideoGeneration = {
  id: string;
  analysisId: string;
  provider: VideoProvider;
  status: VideoGenerationStatus;
  prompt: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  progress: number;
  progressStage: string;
  progressMessage: string;
  klingProgress?: number;
  lastActivityAt?: string;
  imageReferences?: string[];
  remixSource?: string | null;
};

export type SceneGenerationStatus =
  | "none"
  | "pending"
  | "processing"
  | "completed"
  | "original";

export type SceneGeneration = {
  id: string;
  sceneId: string;
  status: string;
  prompt: string;
  provider: string;
  videoUrl: string | null;
  s3Key: string | null;
  error: string | null;
  progress: number;
  progressStage: string;
  progressMessage: string;
  createdAt: string;
  completedAt: string | null;
  scene?: {
    index: number;
    startTime: number;
    endTime: number;
    duration: number;
    thumbnailUrl: string | null;
  };
};

export type SceneConfig = {
  sceneId: string;
  sceneIndex: number;
  useOriginal: boolean;
  generationId?: string;
  startTime: number;
  endTime: number;
};

export type CompositeGeneration = {
  id: string;
  analysisId: string;
  status: string;
  sceneConfig: SceneConfig[];
  videoUrl: string | null;
  s3Key: string | null;
  error: string | null;
  progress: number;
  progressStage: string;
  progressMessage: string;
  createdAt: string;
  completedAt: string | null;
};
