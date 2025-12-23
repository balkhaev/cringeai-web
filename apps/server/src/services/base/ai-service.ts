/**
 * Base class for AI service implementations
 * Provides common singleton pattern and configuration checking
 */

export type AIServiceConfig = {
  /** Environment variable name for the API key */
  envKey: string;
  /** Human-readable service name for error messages */
  serviceName: string;
};

/**
 * Abstract base class for AI services
 * Handles singleton pattern and configuration validation
 *
 * @template TClient - The API client type (e.g., GoogleGenerativeAI, OpenAI)
 */
export abstract class BaseAIService<TClient> {
  protected client: TClient | null = null;
  protected readonly config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  /**
   * Check if the service is properly configured
   * Override this for services with multiple required keys
   */
  isConfigured(): boolean {
    return !!process.env[this.config.envKey];
  }

  /**
   * Create the API client instance
   * Implement this in subclasses
   */
  protected abstract createClient(): TClient;

  /**
   * Get the API client, creating it if necessary
   * @throws Error if service is not configured
   */
  getClient(): TClient {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw new Error(
          `${this.config.serviceName} is not configured. Set ${this.config.envKey} environment variable.`
        );
      }
      this.client = this.createClient();
    }
    return this.client;
  }

  /**
   * Get the service name for logging
   */
  get serviceName(): string {
    return this.config.serviceName;
  }
}

/**
 * Helper type for services with multiple API keys
 */
export type MultiKeyAIServiceConfig = AIServiceConfig & {
  /** Additional required environment variable keys */
  additionalEnvKeys?: string[];
};

/**
 * Base class for AI services requiring multiple API keys
 * (e.g., Kling with access key and secret key)
 */
export abstract class MultiKeyAIService<
  TClient,
> extends BaseAIService<TClient> {
  protected readonly additionalEnvKeys: string[];

  constructor(config: MultiKeyAIServiceConfig) {
    super(config);
    this.additionalEnvKeys = config.additionalEnvKeys ?? [];
  }

  override isConfigured(): boolean {
    const primaryConfigured = super.isConfigured();
    const additionalConfigured = this.additionalEnvKeys.every(
      (key) => !!process.env[key]
    );
    return primaryConfigured && additionalConfigured;
  }
}
