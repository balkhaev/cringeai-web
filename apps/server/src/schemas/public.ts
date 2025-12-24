/**
 * Public API Schemas
 *
 * Публичные схемы для клиентского флоу:
 * - Feed (templates)
 * - Content (input)
 * - Media (library)
 * - Generate
 *
 * All fields use snake_case convention for REST API compatibility
 */

import { z } from "@hono/zod-openapi";

// ===== SHARED ELEMENT SCHEMAS =====

export const RemixOptionSchema = z
  .object({
    id: z.string().openapi({ description: "Variant ID", example: "variant-1" }),
    label: z
      .string()
      .openapi({ description: "Display label", example: "Cyberpunk Robot" }),
    icon: z.string().openapi({ description: "Emoji icon", example: "🤖" }),
    prompt: z.string().openapi({
      description: "Transformation prompt",
      example: "Transform the subject into...",
    }),
  })
  .openapi("RemixOption");

// ===== AUTH SCHEMAS =====

export const AuthResponseSchema = z
  .object({
    access_token: z.string().openapi({
      description: "Short-lived JWT access token",
      example: "eyJhbG...",
    }),
    refresh_token: z.string().openapi({
      description: "Long-lived JWT refresh token",
      example: "eyJhbG...",
    }),
    expires_in: z.number().openapi({
      description: "Access token lifetime in seconds",
      example: 3600,
    }),
  })
  .openapi("AuthResponse");

export const RefreshTokenRequestSchema = z
  .object({
    refresh_token: z.string().openapi({
      description: "The refresh token obtained during initial authentication",
      example: "eyJhbG...",
    }),
  })
  .openapi("RefreshTokenRequest");

export const RefreshTokenResponseSchema = z
  .object({
    access_token: z.string().openapi({
      description: "New short-lived JWT access token",
      example: "eyJhbG...",
    }),
    expires_in: z.number().openapi({
      description: "New access token lifetime in seconds",
      example: 3600,
    }),
  })
  .openapi("RefreshTokenResponse");

export const BasicTokenRequestSchema = z
  .object({
    device_type: z
      .string()
      .openapi({ description: "Mobile platform name", example: "Android" }),
    algorithm: z.string().openapi({
      description: "Hashing algorithm used for signature (if any)",
      example: "HMAC-SHA256",
    }),
    timestamp: z.string().openapi({
      description: "Unix timestamp in milliseconds as string",
      example: "1625097600000",
    }),
    installation_hash: z.string().openapi({
      description: "Unique client-side generated device identifier",
      example: "client_generated_hash",
    }),
  })
  .openapi("BasicTokenRequest");

export const DetectableElementSchema = z
  .object({
    id: z.string().openapi({ description: "Element ID", example: "char-1" }),
    type: z
      .enum(["character", "object", "background"])
      .openapi({ description: "Element type" }),
    label: z
      .string()
      .openapi({ description: "Element label", example: "Ginger Cat" }),
    description: z.string().openapi({
      description: "Description",
      example: "A fluffy ginger cat...",
    }),
    remix_options: z.array(RemixOptionSchema),
  })
  .openapi("DetectableElement");

// ===== FEED API SCHEMAS =====

export const FeedQuerySchema = z.object({
  type: z
    .enum(["trends", "community", "bookmarks"])
    .default("trends")
    .openapi({
      param: { name: "type", in: "query" },
      description:
        "Feed type: trends (featured), community (all), bookmarks (user saved)",
    }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(20)
    .openapi({ param: { name: "limit", in: "query" } }),
  cursor: z
    .string()
    .optional()
    .openapi({ param: { name: "cursor", in: "query" } }),
  category: z
    .string()
    .optional()
    .openapi({ param: { name: "category", in: "query" } }),
  tags: z
    .string()
    .optional()
    .openapi({
      param: { name: "tags", in: "query" },
      description: "Comma-separated tags",
    }),
  sort: z
    .enum(["popular", "recent", "trending"])
    .default("popular")
    .openapi({ param: { name: "sort", in: "query" } }),
});

export const FeedTemplateItemSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable(),
    tags: z.array(z.string()),
    category: z.string().nullable(),
    thumbnail_url: z.string(),
    preview_video_url: z.string().optional(),
    generation_count: z.number(),
    is_bookmarked: z.boolean().optional(),
    reel: z.object({
      id: z.string(),
      author: z.string().nullable(),
      like_count: z.number().nullable(),
    }),
    elements: z.array(
      z.object({
        id: z.string(),
        type: z.enum(["character", "object", "background"]),
        label: z.string(),
      })
    ),
  })
  .openapi("FeedTemplateItem");

export const FeedResponseSchema = z
  .object({
    items: z.array(FeedTemplateItemSchema),
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  })
  .openapi("FeedResponse");

// ===== CONTENT API SCHEMAS =====

export const ContentFromUrlRequestSchema = z
  .object({
    url: z.string().url().openapi({
      description: "Instagram Reel URL",
      example: "https://www.instagram.com/reel/ABC123/",
    }),
    auto_process: z.boolean().default(true).openapi({
      description: "Automatically start analysis after download",
    }),
  })
  .openapi("ContentFromUrlRequest");

export const ContentFromUrlResponseSchema = z
  .object({
    success: z.boolean(),
    content_id: z.string().openapi({ description: "Content ID (reelId)" }),
    status: z.enum(["new", "existing", "processing"]),
    existing_analysis: z
      .object({
        analysis_id: z.string(),
        template_id: z.string().optional(),
      })
      .optional(),
    job_id: z.string().optional(),
  })
  .openapi("ContentFromUrlResponse");

export const ContentUploadResponseSchema = z
  .object({
    success: z.boolean(),
    content_id: z.string().openapi({ description: "Content ID" }),
    job_id: z.string(),
    status: z.literal("processing"),
  })
  .openapi("ContentUploadResponse");

export const ContentStatusResponseSchema = z
  .object({
    content_id: z.string(),
    status: z.enum(["pending", "downloading", "analyzing", "ready", "failed"]),
    progress: z.number().min(0).max(100),
    stage: z.string(),
    message: z.string(),
    analysis: z
      .object({
        id: z.string(),
        duration: z.number().nullable(),
        aspect_ratio: z.string(),
        elements: z.array(DetectableElementSchema),
        scenes: z
          .array(
            z.object({
              id: z.string(),
              index: z.number(),
              start_time: z.number(),
              end_time: z.number(),
              duration: z.number(),
              thumbnail_url: z.string().nullable(),
              elements: z.array(DetectableElementSchema),
            })
          )
          .optional(),
      })
      .optional(),
    template_id: z.string().optional(),
    error: z.string().optional(),
  })
  .openapi("ContentStatusResponse");

// ===== MEDIA LIBRARY SCHEMAS =====

export const MediaItemSchema = z
  .object({
    id: z.string(),
    type: z.enum(["image", "video"]),
    url: z.string(),
    thumbnail_url: z.string(),
    filename: z.string(),
    size: z.number(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    duration: z.number().nullable(),
    mime_type: z.string().nullable(),
    created_at: z.string(),
  })
  .openapi("MediaItem");

export const PersonalMediaQuerySchema = z.object({
  type: z
    .enum(["image", "video", "all"])
    .default("all")
    .openapi({ param: { name: "type", in: "query" } }),
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

export const PersonalMediaResponseSchema = z
  .object({
    items: z.array(MediaItemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  })
  .openapi("PersonalMediaResponse");

export const MediaUploadResponseSchema = z
  .object({
    success: z.boolean(),
    media: MediaItemSchema,
  })
  .openapi("MediaUploadResponse");

export const StockMediaQuerySchema = z.object({
  query: z
    .string()
    .optional()
    .openapi({ param: { name: "query", in: "query" } }),
  category: z
    .string()
    .optional()
    .openapi({ param: { name: "category", in: "query" } }),
  type: z
    .enum(["image", "video"])
    .optional()
    .openapi({ param: { name: "type", in: "query" } }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .openapi({ param: { name: "limit", in: "query" } }),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .openapi({ param: { name: "offset", in: "query" } }),
});

export const StockMediaItemSchema = MediaItemSchema.extend({
  source: z
    .string()
    .openapi({ description: "Stock source (pexels, unsplash)" }),
  attribution: z.string().optional(),
}).openapi("StockMediaItem");

export const StockMediaResponseSchema = z
  .object({
    items: z.array(StockMediaItemSchema),
    total: z.number(),
    categories: z.array(z.string()),
  })
  .openapi("StockMediaResponse");

// ===== GENERATION SELECTION SCHEMAS =====

export const ElementSelectionSchema = z
  .object({
    element_id: z.string().openapi({
      description: "ID элемента из analysis.videoElements",
      example: "char-1",
    }),
    option_id: z.string().optional().openapi({
      description: "ID опции из element.remixOptions",
      example: "opt-1",
    }),
    custom_image_url: z.string().url().optional().openapi({
      description: "URL кастомного изображения для замены элемента",
      example: "https://storage.example.com/uploads/my-character.jpg",
    }),
  })
  .openapi("ElementSelection");

// ===== GENERATE API SCHEMAS =====

export const GenerateRequestSchema = z
  .object({
    analysis_id: z.string().openapi({
      description: "ID анализа видео (VideoAnalysis)",
      example: "550e8400-e29b-41d4-a716-446655440000",
    }),
    selections: z.array(ElementSelectionSchema).optional().openapi({
      description:
        "Какие элементы на что заменить. Если пусто - генерация без изменений",
    }),
    keep_audio: z.boolean().default(false).openapi({
      description: "Сохранить аудио из оригинального видео",
    }),
  })
  .openapi("GenerateRequest");

export const GenerateResponseSchema = z
  .object({
    generation_id: z.string().openapi({
      description: "ID генерации для отслеживания статуса",
    }),
    status: z.literal("queued"),
    status_url: z.string().openapi({
      description: "URL для получения статуса генерации",
      example: "/api/generate/{id}/status",
    }),
    type: z.enum(["full", "composite"]).openapi({
      description: "Тип генерации: full (одно видео) или composite (по сценам)",
    }),
    estimated_wait_time: z.number().optional(),
    queue_position: z.number().optional(),
  })
  .openapi("GenerateResponse");

export const GenerationStatusResponseSchema = z
  .object({
    generation_id: z.string(),
    status: z.enum(["queued", "processing", "completed", "failed"]),
    progress: z.number(),
    stage: z
      .enum([
        "analyzing",
        "generating_character",
        "setting_up_lighting",
        "applying_style",
        "rendering",
        "finalizing",
      ])
      .openapi({
        description: "Current generation stage",
      }),
    message: z.string(),
    provider_progress: z.number().optional(),
    result: z
      .object({
        video_url: z.string(),
        thumbnail_url: z.string().nullable(),
        duration: z.number().nullable(),
      })
      .optional(),
    scene_statuses: z
      .array(
        z.object({
          scene_id: z.string(),
          status: z.string(),
          progress: z.number(),
          video_url: z.string().optional(),
        })
      )
      .optional(),
    error: z.string().optional(),
    created_at: z.string(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
  })
  .openapi("GenerationStatusResponse");

export const GenerationItemSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    progress: z.number(),
    prompt: z.string(),
    thumbnail_url: z.string().nullable(),
    video_url: z.string().nullable(),
    created_at: z.string(),
    completed_at: z.string().nullable(),
    source: z.object({
      type: z.enum(["template", "upload", "url"]),
      template_id: z.string().optional(),
      template_title: z.string().optional(),
      source_url: z.string().optional(),
    }),
  })
  .openapi("GenerationItem");

export const GenerationsListResponseSchema = z
  .object({
    generations: z.array(GenerationItemSchema),
    total: z.number(),
  })
  .openapi("GenerationsListResponse");

export const VideoGenerationListQuerySchema = z.object({
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
  status: z
    .string()
    .optional()
    .openapi({ param: { name: "status", in: "query" } }),
});

// ===== SEARCH API SCHEMAS =====

export const SearchQuerySchema = z.object({
  q: z
    .string()
    .min(1)
    .openapi({
      param: { name: "q", in: "query" },
      description: "Search query",
    }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .openapi({ param: { name: "limit", in: "query" } }),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .openapi({ param: { name: "offset", in: "query" } }),
});

export const SearchResponseSchema = z
  .object({
    items: z.array(FeedTemplateItemSchema),
    total: z.number(),
    query: z.string(),
  })
  .openapi("SearchResponse");

// ===== BOOKMARK API SCHEMAS =====

export const BookmarkResponseSchema = z
  .object({
    bookmarked: z.boolean(),
    template_id: z.string(),
  })
  .openapi("BookmarkResponse");

// ===== ASSET GENERATION SCHEMAS =====

export const AssetCategorySchema = z
  .enum(["background", "character", "object", "texture"])
  .openapi("AssetCategory");

export const AssetAspectRatioSchema = z
  .enum(["1:1", "3:4", "4:3", "9:16", "16:9"])
  .openapi("AssetAspectRatio");

export const AssetGenerateRequestSchema = z
  .object({
    prompt: z.string().min(1).max(1000).openapi({
      description: "Описание изображения для генерации",
      example: "Футуристический город на закате с неоновыми вывесками",
    }),
    category: AssetCategorySchema.openapi({
      description: "Категория ассета",
    }),
    aspect_ratio: AssetAspectRatioSchema.default("1:1").openapi({
      description: "Соотношение сторон",
    }),
    style: z.string().optional().openapi({
      description: "Стиль генерации (realistic, cartoon, anime, 3d и т.д.)",
      example: "realistic",
    }),
  })
  .openapi("AssetGenerateRequest");

export const GeneratedAssetSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    prompt: z.string(),
    category: AssetCategorySchema,
    width: z.number().optional(),
    height: z.number().optional(),
  })
  .openapi("GeneratedAsset");

export const AssetGenerateResponseSchema = z
  .object({
    success: z.boolean(),
    asset: GeneratedAssetSchema,
  })
  .openapi("AssetGenerateResponse");

export const AssetCategoryInfoSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    examples: z.array(z.string()),
  })
  .openapi("AssetCategoryInfo");

export const AssetCategoriesResponseSchema = z
  .object({
    categories: z.array(AssetCategoryInfoSchema),
  })
  .openapi("AssetCategoriesResponse");

export const AssetStylePresetSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
  })
  .openapi("AssetStylePreset");

export const AssetStylePresetsResponseSchema = z
  .object({
    styles: z.array(AssetStylePresetSchema),
  })
  .openapi("AssetStylePresetsResponse");

// Расширение MediaItemSchema для сгенерированных ассетов
export const ExtendedMediaItemSchema = MediaItemSchema.extend({
  source: z.enum(["upload", "generated"]).openapi({
    description: "Источник медиа",
  }),
  category: z.string().nullable().openapi({
    description: "Категория (для сгенерированных)",
  }),
  prompt: z.string().nullable().openapi({
    description: "Промпт генерации",
  }),
  style: z.string().nullable().openapi({
    description: "Стиль генерации",
  }),
}).openapi("ExtendedMediaItem");

export const ExtendedPersonalMediaQuerySchema = z.object({
  type: z
    .enum(["image", "video", "all"])
    .default("all")
    .openapi({ param: { name: "type", in: "query" } }),
  source: z
    .enum(["upload", "generated", "all"])
    .default("all")
    .openapi({ param: { name: "source", in: "query" } }),
  category: z
    .string()
    .optional()
    .openapi({ param: { name: "category", in: "query" } }),
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

export const ExtendedPersonalMediaResponseSchema = z
  .object({
    items: z.array(ExtendedMediaItemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  })
  .openapi("ExtendedPersonalMediaResponse");

// ===== PUBLISH & SHARE SCHEMAS =====

export const PublishGenerationRequestSchema = z
  .object({
    is_shared: z.boolean().default(true).openapi({
      description: "Whether to share the result with the community",
    }),
    community_consent: z.boolean().openapi({
      description: "User consent for community sharing",
    }),
    title: z.string().optional().openapi({
      description: "Custom title for the published template",
    }),
  })
  .openapi("PublishGenerationRequest");

export const PublishGenerationResponseSchema = z
  .object({
    success: z.boolean(),
    template_id: z.string().optional().openapi({
      description: "ID of the created template if shared",
    }),
  })
  .openapi("PublishGenerationResponse");

export const SocialShareRequestSchema = z
  .object({
    platform: z
      .enum(["instagram", "tiktok", "youtube", "generic"])
      .openapi({ description: "Target social platform" }),
  })
  .openapi("SocialShareRequest");

export const SocialShareResponseSchema = z
  .object({
    success: z.boolean(),
    share_url: z.string().optional().openapi({
      description: "Deep link or share URL if applicable",
    }),
  })
  .openapi("SocialShareResponse");

// ===== OAUTH SCHEMAS =====

export const GoogleAuthRequestSchema = z
  .object({
    id_token: z.string().openapi({ description: "Google ID Token" }),
  })
  .openapi("GoogleAuthRequest");

export const AppleAuthRequestSchema = z
  .object({
    identity_token: z.string().openapi({ description: "Apple Identity Token" }),
    user: z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
      })
      .optional(),
  })
  .openapi("AppleAuthRequest");
