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
  min_likes: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .optional()
    .openapi({ param: { name: "min_likes", in: "query" } }),
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
    aspect_ratio: z
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
    elements_count: z.number().openapi({ description: "Number of elements" }),
  })
  .openapi("AnalysisPreview");

/** Generation reference schema for VideoAnalysisDb */
export const GenerationRefSchema = z.object({
  id: z.string(),
  status: z.string(),
  created_at: z.string(),
});

export const VideoAnalysisDbSchema = z
  .object({
    id: z.string(),
    source_type: z.string(),
    source_id: z.string().nullable(),
    file_name: z.string().nullable(),
    duration: z.number().nullable(),
    aspect_ratio: z.string().nullable(),
    elements: z.array(DetectableElementSchema),
    tags: z.array(z.string()).nullable(),
    analysis_type: z.string().nullable(),
    has_scenes: z.boolean().optional(),
    scenes_count: z.number().nullable().optional(),
    created_at: z.string(),
    generations: z.array(GenerationRefSchema).optional(),
  })
  .openapi("VideoAnalysisDb");

// ===== TEMPLATE SCHEMAS =====

export const ReelPreviewSchema = z
  .object({
    id: z.string().openapi({ description: "Reel ID" }),
    url: z.string().openapi({ description: "Reel URL" }),
    thumbnail_url: z
      .string()
      .nullable()
      .openapi({ description: "Reel thumbnail URL" }),
    like_count: z
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
    generation_count: z.number().openapi({
      description: "Total videos generated using this template",
      example: 142,
    }),
    is_published: z
      .boolean()
      .openapi({ description: "Whether it's visible to public" }),
    created_at: z.string().openapi({
      description: "ISO creation date",
      example: "2023-08-01T12:00:00Z",
    }),
    updated_at: z.string().openapi({
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
    analysis_id: z.string().openapi({ description: "Related analysis ID" }),
    status: z
      .enum(["pending", "processing", "completed", "failed"])
      .openapi({ description: "Generation status" }),
    progress: z.number().openapi({ description: "Progress percentage 0-100" }),
    progress_stage: z
      .string()
      .nullable()
      .openapi({ description: "Current stage name" }),
    progress_message: z
      .string()
      .nullable()
      .openapi({ description: "Human-readable progress message" }),
    kling_progress: z
      .number()
      .nullable()
      .openapi({ description: "Kling AI progress percentage" }),
    kling_task_id: z
      .string()
      .nullable()
      .openapi({ description: "Kling AI task ID" }),
    video_url: z
      .string()
      .nullable()
      .openapi({ description: "Generated video URL" }),
    s3_key: z.string().nullable().openapi({ description: "S3 storage key" }),
    duration: z
      .number()
      .nullable()
      .openapi({ description: "Video duration in seconds" }),
    aspect_ratio: z
      .string()
      .nullable()
      .openapi({ description: "Aspect ratio" }),
    created_at: z.string().openapi({ description: "Creation timestamp" }),
    completed_at: z
      .string()
      .nullable()
      .openapi({ description: "Completion timestamp" }),
    error: z.string().nullable().openapi({ description: "Error message" }),
    last_activity_at: z
      .string()
      .nullable()
      .openapi({ description: "Last activity timestamp" }),
  })
  .openapi("VideoGeneration");

export const GenerateVideoRequestSchema = z
  .object({
    analysis_id: z.string().openapi({
      description: "Analysis ID to use for generation",
      example: "550e8400-e29b-41d4-a716-446655440000",
    }),
    prompt: z.string().openapi({
      description: "Change prompt - what to modify in the video",
      example:
        "Based on @Video1, transform the character into a cyberpunk robot",
    }),
    source_video_url: z.string().openapi({
      description: "Source video URL for video-to-video generation",
      example: "http://localhost:3000/api/files/reels/ABC123",
    }),
    options: z
      .object({
        duration: z
          .union([z.literal(5), z.literal(10)])
          .optional()
          .openapi({ description: "Video duration in seconds" }),
        aspect_ratio: z
          .enum(["16:9", "9:16", "1:1", "auto"])
          .optional()
          .openapi({ description: "Output aspect ratio" }),
        keep_audio: z
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
    reel_id: z.string().openapi({
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
    analysis_id: z.string(),
    mode: z.string().optional(),
  })
  .openapi("AnalyzedVideoResponse");

export const UpdateAnalysisRequestSchema = z
  .object({
    duration: z.number().optional(),
    aspect_ratio: z.string().optional(),
    tags: z.array(z.string()).optional(),
    elements: z.array(DetectableElementSchema).optional(),
  })
  .openapi("UpdateAnalysisRequest");

export const UploadReferenceResponseSchema = z
  .object({
    success: z.boolean(),
    url: z.string().openapi({ description: "Public URL for the image" }),
    s3_key: z.string().openapi({ description: "S3 storage key" }),
    image_id: z.string().openapi({ description: "Unique image identifier" }),
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
    is_new: z.boolean(),
  })
  .openapi("AddReelResponse");

export const ReelStatsResponseSchema = z
  .object({
    total: z.number(),
    by_status: z.object({
      scraped: z.number(),
      downloading: z.number(),
      downloaded: z.number(),
      analyzing: z.number(),
      analyzed: z.number(),
      failed: z.number(),
    }),
    templates: z.number(),
    active_generations: z.number(),
  })
  .openapi("ReelStatsResponse");

export const ProcessReelRequestSchema = z
  .object({
    use_frames: z.boolean().optional().default(false),
    force: z.boolean().optional().default(false),
  })
  .openapi("ProcessReelRequest");

export const ProcessReelResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    job_id: z.string(),
    reel_id: z.string(),
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
    original_width: z.number().optional(),
    new_width: z.number().optional(),
  })
  .openapi("ResizeReelResponse");

export const BatchRefreshDurationRequestSchema = z
  .object({
    reel_ids: z.array(z.string()).openapi({
      description: "List of reel IDs to refresh",
    }),
  })
  .openapi("BatchRefreshDurationRequest");

// ===== FILES SCHEMAS =====

export const FileStreamSchema = z
  .any()
  .openapi({ type: "string", format: "binary" });

export const FileMetadataResponseSchema = z.object({
  content_type: z.string(),
  content_length: z.string(),
});
