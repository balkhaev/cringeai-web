/**
 * Унифицированный API для работы с Job'ами
 * GET  /api/jobs/:jobId - Статус job'а по ID
 * GET  /api/jobs        - Список job'ов с фильтрами
 * POST /api/jobs/:jobId/cancel - Отменить job
 * POST /api/jobs/:jobId/retry  - Повторить failed job
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { unifiedJobService } from "../services/jobs/unified-job-service";

const app = new OpenAPIHono();

// Схема унифицированного ответа job'а
const UnifiedJobResponseSchema = z.object({
  id: z.string(),
  type: z.enum(["scrape", "pipeline", "video-gen"]),
  status: z.enum(["pending", "running", "completed", "failed"]),
  progress: z.number(),
  stage: z.string(),
  message: z.string(),
  entityId: z.string().optional(),
  entityType: z.enum(["reel", "generation", "scrape"]).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  result: z
    .object({
      reelsCount: z.number().optional(),
      downloadedCount: z.number().optional(),
      reelId: z.string().optional(),
      templateId: z.string().optional(),
      analysisId: z.string().optional(),
      generationId: z.string().optional(),
      videoUrl: z.string().optional(),
      s3Key: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
  attempts: z.number(),
  createdAt: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
});

// ============================================
// GET /api/jobs/:jobId - Получить статус job'а
// ============================================

const getJobRoute = createRoute({
  method: "get",
  path: "/{jobId}",
  summary: "Get job status by ID",
  tags: ["Jobs"],
  description:
    "Returns unified job status for any job type (scrape, pipeline, video-gen)",
  request: {
    params: z.object({
      jobId: z.string().openapi({
        example: "process-ABC123-1234567890",
        description: "The job ID from any queue",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: UnifiedJobResponseSchema,
        },
      },
      description: "Job status",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Job not found",
    },
  },
});

app.openapi(getJobRoute, async (c) => {
  const { jobId } = c.req.valid("param");

  const job = await unifiedJobService.getJob(jobId);

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  return c.json(job, 200);
});

// ============================================
// GET /api/jobs - Список job'ов с фильтрами
// ============================================

const listJobsRoute = createRoute({
  method: "get",
  path: "/",
  summary: "List jobs with filters",
  tags: ["Jobs"],
  description: "Returns list of jobs from all queues with optional filtering",
  request: {
    query: z.object({
      type: z.enum(["scrape", "pipeline", "video-gen"]).optional().openapi({
        description: "Filter by job type",
      }),
      status: z
        .enum(["pending", "running", "completed", "failed"])
        .optional()
        .openapi({
          description: "Filter by job status",
        }),
      limit: z
        .string()
        .optional()
        .transform((v) => (v ? Number.parseInt(v, 10) : 50))
        .openapi({
          description: "Max number of jobs to return (default: 50)",
        }),
      offset: z
        .string()
        .optional()
        .transform((v) => (v ? Number.parseInt(v, 10) : 0))
        .openapi({
          description: "Offset for pagination (default: 0)",
        }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            jobs: z.array(UnifiedJobResponseSchema),
            total: z.number(),
          }),
        },
      },
      description: "List of jobs",
    },
  },
});

app.openapi(listJobsRoute, async (c) => {
  const { type, status, limit, offset } = c.req.valid("query");

  const jobs = await unifiedJobService.listJobs({
    type,
    status,
    limit,
    offset,
  });

  return c.json({
    jobs,
    total: jobs.length,
  });
});

// ============================================
// POST /api/jobs/:jobId/cancel - Отменить job
// ============================================

const cancelJobRoute = createRoute({
  method: "post",
  path: "/{jobId}/cancel",
  summary: "Cancel a job",
  tags: ["Jobs"],
  description: "Cancel a running or pending job",
  request: {
    params: z.object({
      jobId: z.string().openapi({
        description: "The job ID to cancel",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "Job cancelled",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Job not found",
    },
  },
});

app.openapi(cancelJobRoute, async (c) => {
  const { jobId } = c.req.valid("param");

  const cancelled = await unifiedJobService.cancelJob(jobId);

  if (!cancelled) {
    return c.json({ error: "Job not found or cannot be cancelled" }, 404);
  }

  return c.json(
    {
      success: true as const,
      message: `Job ${jobId} cancelled`,
    },
    200
  );
});

// ============================================
// POST /api/jobs/:jobId/retry - Повторить failed job
// ============================================

const retryJobRoute = createRoute({
  method: "post",
  path: "/{jobId}/retry",
  summary: "Retry a failed job",
  tags: ["Jobs"],
  description: "Retry a failed job",
  request: {
    params: z.object({
      jobId: z.string().openapi({
        description: "The job ID to retry",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "Job retried",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Job not found or not in failed state",
    },
  },
});

app.openapi(retryJobRoute, async (c) => {
  const { jobId } = c.req.valid("param");

  const retried = await unifiedJobService.retryJob(jobId);

  if (!retried) {
    return c.json({ error: "Job not found or not in failed state" }, 404);
  }

  return c.json(
    {
      success: true as const,
      message: `Job ${jobId} queued for retry`,
    },
    200
  );
});

export { app as jobsRouter };
