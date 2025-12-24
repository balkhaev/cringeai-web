// ===== Re-export API contracts =====
// Public API types
// Internal API types
// Common types
export type {
  // Reels
  AddReelRequest,
  AddReelResponse,
  AILog,
  AIProvider,
  AnalysisPreview,
  AnalyzeDownloadedRequest,
  AnalyzedVideoResponse,
  AnalyzeReelRequest,
  AppleAuthRequest,
  AssetAspectRatio,
  AssetCategoriesResponse,
  // Assets
  AssetCategory,
  AssetCategoryInfo,
  AssetGenerateRequest,
  AssetGenerateResponse,
  AssetStylePreset,
  AssetStylePresetsResponse,
  // Auth
  AuthResponse,
  BasicTokenRequest,
  BatchRefreshDurationRequest,
  // Bookmark
  BookmarkResponse,
  CompositeStatus,
  CompositeStatusResponse,
  ConfigureResponse,
  ContentFromUrlRequest,
  ContentFromUrlResponse,
  ContentProcessingStatus,
  // Content
  ContentStatus,
  ContentStatusResponse,
  ContentUploadResponse,
  // Common
  DetectableElement,
  ElementSelection,
  ErrorResponse,
  ExpertConfigureRequest,
  ExpertRemixDataResponse,
  ExtendedMediaItem,
  FeedQuery,
  FeedResponse,
  FeedSort,
  FeedTemplateItem,
  // Feed
  FeedType,
  GeneratedAsset,
  // Generate
  GenerateRequest,
  GenerateResponse,
  GenerateVideoRequest,
  GenerationItem,
  GenerationOptions,
  GenerationSourceType,
  GenerationStage,
  GenerationStatus,
  GenerationStatusResponse,
  GenerationsListResponse,
  GoogleAuthRequest,
  // Queue
  JobState,
  JobStatus as ApiJobStatus,
  // Query
  ListQuery,
  // Logs
  LogLevel,
  MediaItem,
  MediaSource,
  // Media
  MediaType,
  MediaUploadResponse,
  NotFoundResponse,
  PaginationParams,
  PersonalMediaQuery,
  PersonalMediaResponse,
  ProcessReelRequest,
  ProcessReelResponse,
  // Publish & Share
  PublishGenerationRequest,
  PublishGenerationResponse,
  QueueJob,
  QueueStatus,
  Reel as ApiReel,
  ReelListQuery,
  ReelLog as ApiReelLog,
  // Template
  ReelPreview,
  ReelStatsResponse,
  ReelStatus as ApiReelStatus,
  ReelWithAnalysis,
  RefreshMetadataResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RemixOption as ApiRemixOption,
  ResizeReelResponse,
  SceneSelection,
  ScrapedReel as ApiScrapedReel,
  ScrapeRequest as ApiScrapeRequest,
  ScrapeResponse as ApiScrapeResponse,
  // Search
  SearchQuery,
  SearchResponse,
  SimpleConfigureRequest,
  // Remix
  SimpleElement,
  SimpleRemixDataResponse,
  SimpleScene,
  SocialPlatform,
  SocialShareRequest,
  SocialShareResponse,
  // Scrape
  SortMode as ApiSortMode,
  // Traces
  SpanKind,
  SpanStatus,
  StockMediaItem,
  StockMediaResponse,
  SuccessResponse,
  // Trends
  TagTrend,
  TagTrendsResponse,
  Template as ApiTemplate,
  Trace,
  TraceSpan,
  UnauthorizedResponse,
  UpdateAnalysisRequest,
  UploadReferenceResponse,
  VideoAnalysisDb,
  VideoElementType as ApiVideoElementType,
  // Generation
  VideoGenerationDb,
} from "@trender/api-contracts";

// ===== Local types (domain-specific, not API contracts) =====

// Job types (with helper functions)
export type {
  EntityType,
  JobFilters,
  JobProgress,
  JobResult,
  JobStatus,
  JobType,
  UnifiedJobResponse,
} from "./job";
export { getJobTypeFromId, mapBullStateToStatus } from "./job";

// Reel types (extended domain types)
export type {
  Reel,
  ReelLog,
  ReelStatus,
  ScrapedReel,
  ScrapeRequest,
  ScrapeResponse,
  ScraperConfig,
  SortMode,
} from "./reel";

// Template types (extended domain types)
export type {
  AnalysisType,
  CategoryMeta,
  ElementAppearance,
  LegacyElement,
  RemixOption,
  Template,
  TemplateAnalysis,
  TemplateParams,
  TemplateReel,
  TemplatesListResponse,
  TemplateWithGenerations,
  VideoElement,
  VideoElementType,
  VideoScene,
} from "./template";

// Video types (extended domain types)
export type {
  CompositeGeneration,
  DetectableElement as VideoDetectableElement,
  RemixOption as VideoRemixOption,
  SceneConfig,
  SceneGeneration,
  SceneGenerationStatus,
  VideoAnalysis,
  VideoAnalysisWithId,
  VideoGeneration,
  VideoGenerationStatus,
  VideoProvider,
} from "./video";
