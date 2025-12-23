/**
 * Унифицированные типы для работы с Job'ами
 */

export type JobType = "scrape" | "pipeline" | "video-gen";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export type EntityType = "reel" | "generation" | "scrape";

/**
 * Унифицированный ответ для всех типов job'ов
 */
export interface UnifiedJobResponse {
  id: string; // jobId из BullMQ
  type: JobType;
  status: JobStatus;
  progress: number; // 0-100
  stage: string; // Текущий этап
  message: string; // Человекочитаемое сообщение

  // Связанные сущности
  entityId?: string; // reelId / generationId / scrapeJobId
  entityType?: EntityType;

  // Данные job'а (специфичные для типа)
  data?: Record<string, unknown>;

  // Результат (для completed jobs)
  result?: JobResult;

  // Метаданные
  error?: string;
  attempts: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

/**
 * Результат выполнения job'а
 */
export interface JobResult {
  // Scrape
  reelsCount?: number;
  downloadedCount?: number;

  // Pipeline
  reelId?: string;
  templateId?: string;
  analysisId?: string;

  // Video Generation
  generationId?: string;
  videoUrl?: string;
  s3Key?: string;
}

/**
 * Фильтры для списка job'ов
 */
export interface JobFilters {
  type?: JobType;
  status?: JobStatus;
  limit?: number;
  offset?: number;
}

/**
 * Маппинг состояний BullMQ на унифицированные статусы
 */
export function mapBullStateToStatus(state: string | undefined): JobStatus {
  switch (state) {
    case "waiting":
    case "delayed":
    case "prioritized":
      return "pending";
    case "active":
      return "running";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * Определяет тип job'а по его ID
 */
export function getJobTypeFromId(jobId: string): JobType | null {
  if (jobId.startsWith("scrape-")) return "scrape";
  if (
    jobId.startsWith("process-") ||
    jobId.startsWith("download-") ||
    jobId.startsWith("analyze-")
  )
    return "pipeline";
  // Support both old (gen-) and new (video-gen-) formats
  if (jobId.startsWith("video-gen-") || jobId.startsWith("gen-"))
    return "video-gen";
  return null;
}
