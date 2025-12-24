/**
 * Internal API Schemas
 *
 * Внутренние схемы для админ/дебаг роутеров:
 * - Reels management
 * - Video analysis (detailed)
 * - Templates (admin)
 * - Pipeline/Queue management
 * - Files
 */

import { z } from "@hono/zod-openapi";
import { DetectableElementSchema } from "./public";

// ===== QUERY SCHEMAS =====

export const ListQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .openapi({ param: { name: "limit", in: "query" } }),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .openapi({ param: { name: "offset", in: "query" } }),
  category: z
    .string()
    .optional()
    .openapi({ param: { name: "category", in: "query" } }),
  tag: z
    .string()
    .optional()
    .openapi({ param: { name: "tag", in: "query" } }),
  published: z.coerce
    .boolean()
    .optional()
    .openapi({ param: { name: "published", in: "query" } }),
});

export const VideoAnalysisListQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .openapi({ param: { name: "limit", in: "query" } }),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .openapi({ param: { name: "offset", in: "query" } }),
});

export const ReelListQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .default(100)
    .openapi({ param: { name: "limit", in: "query" } }),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .openapi({ param: { name: "offset", in: "query" } }),
  minLikes: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .optional()
    .openapi({ param: { name: "minLikes", in: "query" } }),
  hashtag: z
    .string()
    .optional()
    .openapi({ param: { name: "hashtag", in: "query" } }),
  status: z
    .enum([
      "scraped",
      "downloading",
      "downloaded",
      "analyzing",
      "analyzed",
      "failed",
    ])
    .optional()
    .openapi({ param: { name: "status", in: "query" } }),
  search: z
    .string()
    .optional()
    .openapi({
      param: { name: "search", in: "query" },
      description: "Search in caption, author, hashtag",
    }),
});

// ===== ANALYSIS DETAIL SCHEMAS =====

export const AnalysisSchema = z
  .object({
    id: z.string().openapi({
      description: "Unique analysis UUID",
      example: "550e8400-e29b-41d4-a716-446655440000",
    }),
    duration: z
      .number()
      .nullable()
      .openapi({ description: "Video length in seconds", example: 15.5 }),
    aspectRatio: z
      .string()
      .openapi({ description: "Screen ratio", example: "9:16" }),
    tags: z
      .array(z.string())
      .openapi({ example: ["vlog", "coffee", "morning"] }),
    elements: z.array(DetectableElementSchema),
  })
  .openapi("VideoAnalysis");

export const AnalysisPreviewSchema = z
  .object({
    id: z.string().openapi({ description: "Analysis ID" }),
    tags: z.array(z.string()).openapi({ example: ["vlog", "coffee"] }),
    elementsCount: z.number().openapi({ description: "Number of elements" }),
  })
  .openapi("AnalysisPreview");

/** Generation reference schema for VideoAnalysisDb */
export const GenerationRefSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

export const VideoAnalysisDbSchema = z
  .object({
    id: z.string(),
    sourceType: z.string(),
    sourceId: z.string().nullable(),
    fileName: z.string().nullable(),
    duration: z.number().nullable(),
    aspectRatio: z.string().nullable(),
    elements: z.array(DetectableElementSchema),
    tags: z.array(z.string()).nullable(),
    analysisType: z.string().nullable(),
    hasScenes: z.boolean().optional(),
    scenesCount: z.number().nullable().optional(),
    createdAt: z.string(),
    generations: z.array(GenerationRefSchema).optional(),
  })
  .openapi("VideoAnalysisDb");

// ===== TEMPLATE SCHEMAS =====

export const ReelPreviewSchema = z
  .object({
    id: z.string().openapi({ description: "Reel ID" }),
    url: z.string().openapi({ description: "Reel URL" }),
    thumbnailUrl: z
      .string()
      .nullable()
      .openapi({ description: "Reel thumbnail URL" }),
    likeCount: z
      .number()
      .nullable()
      .openapi({ description: "Number of likes" }),
    author: z.string().nullable().openapi({ description: "Author name" }),
    source: z.string().openapi({ description: "Source platform/type" }),
  })
  .openapi("ReelPreview");

export const TemplateSchema = z
  .object({
    id: z.string().openapi({
      description: "Template UUID or Reel ID",
      example: "C8ABC123",
    }),
    title: z.string().nullable().openapi({
      description: "Human friendly title",
      example: "Aesthetic Morning Routine",
    }),
    tags: z.array(z.string()).openapi({ example: ["minimalist", "modern"] }),
    category: z
      .string()
      .nullable()
      .openapi({ description: "Content category", example: "Lifestyle" }),
    generationCount: z.number().openapi({
      description: "Total videos generated using this template",
      example: 142,
    }),
    isPublished: z
      .boolean()
      .openapi({ description: "Whether it's visible to public" }),
    createdAt: z.string().openapi({
      description: "ISO creation date",
      example: "2023-08-01T12:00:00Z",
    }),
    updatedAt: z.string().openapi({
      description: "ISO last update date",
      example: "2023-08-01T12:30:00Z",
    }),
    reel: ReelPreviewSchema.optional(),
    analysis: AnalysisPreviewSchema.optional(),
  })
  .openapi("Template");

// ===== VIDEO GENERATION SCHEMAS =====

export const VideoGenerationSchema = z
  .object({
    id: z.string().openapi({ description: "Generation ID" }),
    analysisId: z.string().openapi({ description: "Related analysis ID" }),
    status: z
      .enum(["pending", "processing", "completed", "failed"])
      .openapi({ description: "Generation status" }),
    progress: z.number().openapi({ description: "Progress percentage 0-100" }),
    progressStage: z
      .string()
      .nullable()
      .openapi({ description: "Current stage name" }),
    progressMessage: z
      .string()
      .nullable()
      .openapi({ description: "Human-readable progress message" }),
    klingProgress: z
      .number()
      .nullable()
      .openapi({ description: "Kling AI progress percentage" }),
    klingTaskId: z
      .string()
      .nullable()
      .openapi({ description: "Kling AI task ID" }),
    videoUrl: z
      .string()
      .nullable()
      .openapi({ description: "Generated video URL" }),
    s3Key: z.string().nullable().openapi({ description: "S3 storage key" }),
    duration: z
      .number()
      .nullable()
      .openapi({ description: "Video duration in seconds" }),
    aspectRatio: z.string().nullable().openapi({ description: "Aspect ratio" }),
    createdAt: z.string().openapi({ description: "Creation timestamp" }),
    completedAt: z
      .string()
      .nullable()
      .openapi({ description: "Completion timestamp" }),
    error: z.string().nullable().openapi({ description: "Error message" }),
    lastActivityAt: z
      .string()
      .nullable()
      .openapi({ description: "Last activity timestamp" }),
  })
  .openapi("VideoGeneration");

export const GenerateVideoRequestSchema = z
  .object({
    analysisId: z.string().openapi({
      description: "Analysis ID to use for generation",
      example: "550e8400-e29b-41d4-a716-446655440000",
    }),
    prompt: z.string().openapi({
      description: "Change prompt - what to modify in the video",
      example:
        "Based on @Video1, transform the character into a cyberpunk robot",
    }),
    sourceVideoUrl: z.string().openapi({
      description: "Source video URL for video-to-video generation",
      example: "http://localhost:3000/api/files/reels/ABC123",
    }),
    options: z
      .object({
        duration: z
          .union([z.literal(5), z.literal(10)])
          .optional()
          .openapi({ description: "Video duration in seconds" }),
        aspectRatio: z
          .enum(["16:9", "9:16", "1:1", "auto"])
          .optional()
          .openapi({ description: "Output aspect ratio" }),
        keepAudio: z
          .boolean()
          .optional()
          .openapi({ description: "Whether to keep original audio" }),
      })
      .optional()
      .openapi({ description: "Generation options" }),
  })
  .openapi("GenerateVideoRequest");

export const AnalyzeDownloadedRequestSchema = z
  .object({
    hashtag: z.string().openapi({
      description: "Hashtag folder name",
      example: "trending",
    }),
    filename: z.string().openapi({
      description: "Video filename",
      example: "video123.mp4",
    }),
  })
  .openapi("AnalyzeDownloadedRequest");

export const AnalyzeReelRequestSchema = z
  .object({
    reelId: z.string().openapi({
      description: "Reel ID from database",
      example: "ABC123",
    }),
    url: z.string().openapi({
      description: "Reel URL",
      example: "https://instagram.com/reel/ABC123",
    }),
  })
  .openapi("AnalyzeReelRequest");

export const AnalyzeVideoRequestSchema = z.object({
  video: z.any().openapi({
    type: "string",
    format: "binary",
    description: "Video file to analyze (max 100MB)",
  }),
});

export const AnalyzedVideoResponseSchema = z
  .object({
    success: z.boolean(),
    analysis: VideoAnalysisDbSchema,
    analysisId: z.string(),
    mode: z.string().optional(),
  })
  .openapi("AnalyzedVideoResponse");

export const UpdateAnalysisRequestSchema = z
  .object({
    duration: z.number().optional(),
    aspectRatio: z.string().optional(),
    tags: z.array(z.string()).optional(),
    elements: z.array(DetectableElementSchema).optional(),
  })
  .openapi("UpdateAnalysisRequest");

export const UploadReferenceResponseSchema = z
  .object({
    success: z.boolean(),
    url: z.string().openapi({ description: "Public URL for the image" }),
    s3Key: z.string().openapi({ description: "S3 storage key" }),
    imageId: z.string().openapi({ description: "Unique image identifier" }),
  })
  .openapi("UploadReferenceResponse");

export const UploadImageRequestSchema = z.object({
  file: z.any().openapi({
    type: "string",
    format: "binary",
    description: "Image file to upload (max 20MB)",
  }),
});

// ===== REELS MANAGEMENT SCHEMAS =====

export const AddReelRequestSchema = z
  .object({
    url: z.string().url().openapi({
      description: "Instagram Reel URL",
      example: "https://www.instagram.com/reel/ABC123_XYZ/",
    }),
  })
  .openapi("AddReelRequest");

export const AddReelResponseSchema = z
  .object({
    success: z.boolean(),
    reel: ReelPreviewSchema,
    message: z.string(),
    isNew: z.boolean(),
  })
  .openapi("AddReelResponse");

export const ReelStatsResponseSchema = z
  .object({
    total: z.number(),
    byStatus: z.object({
      scraped: z.number(),
      downloading: z.number(),
      downloaded: z.number(),
      analyzing: z.number(),
      analyzed: z.number(),
      failed: z.number(),
    }),
    templates: z.number(),
    activeGenerations: z.number(),
  })
  .openapi("ReelStatsResponse");

export const ProcessReelRequestSchema = z
  .object({
    useFrames: z.boolean().optional().default(false),
    force: z.boolean().optional().default(false),
  })
  .openapi("ProcessReelRequest");

export const ProcessReelResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    jobId: z.string(),
    reelId: z.string(),
  })
  .openapi("ProcessReelResponse");

export const RefreshMetadataResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    reel: ReelPreviewSchema,
  })
  .openapi("RefreshMetadataResponse");

export const ResizeReelResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    resized: z.boolean(),
    originalWidth: z.number().optional(),
    newWidth: z.number().optional(),
  })
  .openapi("ResizeReelResponse");

export const BatchRefreshDurationRequestSchema = z
  .object({
    reelIds: z.array(z.string()).openapi({
      description: "List of reel IDs to refresh",
    }),
  })
  .openapi("BatchRefreshDurationRequest");

// ===== FILES SCHEMAS =====

export const FileStreamSchema = z
  .any()
  .openapi({ type: "string", format: "binary" });

export const FileMetadataResponseSchema = z.object({
  contentType: z.string(),
  contentLength: z.string(),
});
