/**
 * Унифицированный сервис для работы с Job'ами
 * Предоставляет единый интерфейс для всех типов очередей
 */

import prisma from "@trender/db";
import {
  getAllQueues,
  getQueueByName,
  removeJob,
  retryJob,
} from "../queues/manager";
import {
  getJobTypeFromId,
  type JobFilters,
  type JobResult,
  type JobStatus,
  type JobType,
  mapBullStateToStatus,
  type UnifiedJobResponse,
} from "./types";

// Маппинг названий очередей на типы job'ов
const QUEUE_TO_JOB_TYPE: Record<string, JobType> = {
  "scrape-reels": "scrape",
  "reel-pipeline": "pipeline",
  "video-generation": "video-gen",
};

const JOB_TYPE_TO_QUEUE: Record<JobType, string> = {
  scrape: "scrape-reels",
  pipeline: "reel-pipeline",
  "video-gen": "video-generation",
};

/**
 * Получить job по ID из любой очереди
 */
export async function getJob(
  jobId: string
): Promise<UnifiedJobResponse | null> {
  // 1. Определяем тип job'а по ID
  const jobType = getJobTypeFromId(jobId);

  // 2. Ищем в BullMQ
  const queues = getAllQueues();

  for (const queue of queues) {
    const job = await queue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      const queueJobType = QUEUE_TO_JOB_TYPE[queue.name];
      if (!queueJobType) {
        continue;
      }

      return mapBullJobToResponse(job, queueJobType, state);
    }
  }

  // 3. Если не найден в BullMQ, ищем в Prisma (для completed/исторических)
  if (jobType) {
    return await findJobInDatabase(jobId, jobType);
  }

  return null;
}

/**
 * Получить список job'ов с фильтрацией
 */
export async function listJobs(
  filters: JobFilters = {}
): Promise<UnifiedJobResponse[]> {
  const { type, status, limit = 50, offset = 0 } = filters;
  const results: UnifiedJobResponse[] = [];

  // Определяем какие очереди запрашивать
  const queuesToQuery = type
    ? [JOB_TYPE_TO_QUEUE[type]]
    : Object.values(JOB_TYPE_TO_QUEUE);

  // Определяем какие состояния запрашивать из BullMQ
  const statesToQuery = status
    ? mapStatusToBullStates(status)
    : ["waiting", "active", "completed", "failed", "delayed"];

  for (const queueName of queuesToQuery) {
    const queue = getQueueByName(queueName);
    if (!queue) {
      continue;
    }

    const jobType = QUEUE_TO_JOB_TYPE[queueName];
    if (!jobType) {
      continue;
    }

    for (const state of statesToQuery) {
      const jobs = await queue.getJobs(
        [state as "waiting" | "active" | "completed" | "failed" | "delayed"],
        0,
        limit
      );

      for (const job of jobs) {
        const jobState = await job.getState();
        results.push(mapBullJobToResponse(job, jobType, jobState));
      }
    }
  }

  // Сортируем по времени создания (новые первые)
  results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Применяем offset и limit
  return results.slice(offset, offset + limit);
}

/**
 * Отменить job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  // Определяем очередь по типу job'а
  const jobType = getJobTypeFromId(jobId);
  if (!jobType) {
    // Пробуем найти в любой очереди
    const queues = getAllQueues();
    for (const queue of queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        return await removeJob(queue.name, jobId);
      }
    }
    return false;
  }

  const queueName = JOB_TYPE_TO_QUEUE[jobType];
  return await removeJob(queueName, jobId);
}

/**
 * Повторить failed job
 */
export async function retryFailedJob(jobId: string): Promise<boolean> {
  const jobType = getJobTypeFromId(jobId);
  if (!jobType) {
    // Пробуем найти в любой очереди
    const queues = getAllQueues();
    for (const queue of queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        const state = await job.getState();
        if (state === "failed") {
          return await retryJob(queue.name, jobId);
        }
        return false;
      }
    }
    return false;
  }

  const queueName = JOB_TYPE_TO_QUEUE[jobType];
  return await retryJob(queueName, jobId);
}

// ============================================
// Вспомогательные функции
// ============================================

// Тип job из BullMQ очереди
type BullJob = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getAllQueues>[number]["getJob"]>>
>;

/**
 * Маппинг BullMQ job на унифицированный ответ
 */
function mapBullJobToResponse(
  job: BullJob,
  jobType: JobType,
  state: string
): UnifiedJobResponse {
  if (!job) {
    throw new Error("Job is null");
  }

  const progress =
    typeof job.progress === "number"
      ? job.progress
      : typeof job.progress === "object" &&
          job.progress !== null &&
          "percent" in job.progress
        ? (job.progress as { percent: number }).percent
        : 0;

  const stage = getStageFromJob(job, jobType);
  const message = getMessageFromJob(job, jobType);
  const { entityId, entityType } = getEntityFromJob(job, jobType);

  return {
    id: job.id ?? "",
    type: jobType,
    status: mapBullStateToStatus(state),
    progress,
    stage,
    message,
    entityId,
    entityType,
    data: job.data as Record<string, unknown>,
    result: job.returnvalue as JobResult | undefined,
    error: job.failedReason ?? undefined,
    attempts: job.attemptsMade,
    createdAt: new Date(job.timestamp).toISOString(),
    startedAt: job.processedOn
      ? new Date(job.processedOn).toISOString()
      : undefined,
    finishedAt: job.finishedOn
      ? new Date(job.finishedOn).toISOString()
      : undefined,
  };
}

/**
 * Получить stage из job'а
 */
function getStageFromJob(job: BullJob, jobType: JobType): string {
  const progress = job.progress;

  if (
    typeof progress === "object" &&
    progress !== null &&
    "stage" in progress
  ) {
    return (progress as { stage: string }).stage;
  }

  // Дефолтные стейджи
  switch (jobType) {
    case "scrape":
      return "scraping";
    case "pipeline":
      return (job.data as { action?: string })?.action ?? "processing";
    case "video-gen":
      return "generating";
    default:
      return "processing";
  }
}

/**
 * Получить сообщение из job'а
 */
function getMessageFromJob(job: BullJob, jobType: JobType): string {
  const progress = job.progress;

  if (
    typeof progress === "object" &&
    progress !== null &&
    "message" in progress
  ) {
    return (progress as { message: string }).message;
  }

  // Дефолтные сообщения
  switch (jobType) {
    case "scrape":
      return "Скрейпинг рилсов...";
    case "pipeline":
      return "Обработка видео...";
    case "video-gen":
      return "Генерация видео...";
    default:
      return "Обработка...";
  }
}

/**
 * Получить связанную сущность из job'а
 */
function getEntityFromJob(
  job: BullJob,
  jobType: JobType
): { entityId?: string; entityType?: "reel" | "generation" | "scrape" } {
  const data = job.data as Record<string, unknown>;

  switch (jobType) {
    case "scrape":
      return { entityType: "scrape" };
    case "pipeline":
      return {
        entityId: data.reelId as string | undefined,
        entityType: "reel",
      };
    case "video-gen":
      return {
        entityId: data.generationId as string | undefined,
        entityType: "generation",
      };
    default:
      return {};
  }
}

/**
 * Маппинг статуса на состояния BullMQ
 */
function mapStatusToBullStates(status: JobStatus): string[] {
  switch (status) {
    case "pending":
      return ["waiting", "delayed"];
    case "running":
      return ["active"];
    case "completed":
      return ["completed"];
    case "failed":
      return ["failed"];
    default:
      return ["waiting", "active", "completed", "failed", "delayed"];
  }
}

/**
 * Поиск job'а в базе данных (для completed/исторических)
 */
async function findJobInDatabase(
  jobId: string,
  jobType: JobType
): Promise<UnifiedJobResponse | null> {
  switch (jobType) {
    case "scrape": {
      const scrapeJob = await prisma.scrapeJob.findFirst({
        where: { jobId },
      });

      if (scrapeJob) {
        return {
          id: jobId,
          type: "scrape",
          status: scrapeJob.status as JobStatus,
          progress: 100,
          stage: "completed",
          message: scrapeJob.error ?? "Завершено",
          entityId: scrapeJob.id,
          entityType: "scrape",
          result: {
            reelsCount: scrapeJob.found,
            downloadedCount: scrapeJob.downloaded,
          },
          error: scrapeJob.error ?? undefined,
          attempts: 1,
          createdAt: scrapeJob.createdAt.toISOString(),
          finishedAt: scrapeJob.updatedAt.toISOString(),
        };
      }
      break;
    }

    case "video-gen": {
      const generation = await prisma.videoGeneration.findFirst({
        where: { jobId },
      });

      if (generation) {
        return {
          id: jobId,
          type: "video-gen",
          status: generation.status as JobStatus,
          progress: generation.progress,
          stage: generation.progressStage,
          message: generation.progressMessage,
          entityId: generation.id,
          entityType: "generation",
          result: {
            generationId: generation.id,
            videoUrl: generation.videoUrl ?? undefined,
            s3Key: generation.s3Key ?? undefined,
          },
          error: generation.error ?? undefined,
          attempts: 1,
          createdAt: generation.createdAt.toISOString(),
          finishedAt: generation.completedAt?.toISOString(),
        };
      }
      break;
    }

    case "pipeline": {
      // Pipeline jobs связаны с Reel, но у Reel нет jobId
      // Поэтому пока возвращаем null - pipeline jobs должны быть в BullMQ
      break;
    }
  }

  return null;
}

export const unifiedJobService = {
  getJob,
  listJobs,
  cancelJob,
  retryJob: retryFailedJob,
};
