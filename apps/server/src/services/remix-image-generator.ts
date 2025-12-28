/**
 * Сервис генерации изображений для remix опций через Gemini 2.5 Flash
 * Использует native image generation (Nano Banana)
 */
import { GoogleGenAI } from "@google/genai";
import { ai } from "../config";
import { aiLogger } from "./ai-logger";
import { getS3Key, isS3Configured, s3Service } from "./s3";
import { getMediaPublicUrl } from "./url-builder";

// Типы
export type RemixOptionInput = {
  id: string;
  label: string;
  icon: string;
  prompt: string;
};

export type RemixOptionWithImage = RemixOptionInput & {
  imageUrl?: string;
};

export type ElementType = "character" | "object" | "background";

export type GenerateImagesParams = {
  elementId: string;
  elementType: ElementType;
  elementLabel: string;
  elementDescription: string;
  remixOptions: RemixOptionInput[];
  analysisId: string;
};

export type GenerateImagesResult = {
  remixOptions: RemixOptionWithImage[];
  successCount: number;
  failedCount: number;
};

// Промпт для генерации изображений
const IMAGE_GENERATION_PROMPT = `Generate a high-quality preview image for this remix concept.

Element type: {elementType}
Element: {elementLabel}
Element description: {elementDescription}

Remix concept: {remixPrompt}

Requirements:
- Create a clear, visually appealing image that represents this remix concept
- The image should be suitable as a thumbnail/preview
- Style: high quality, detailed, visually distinct
- Aspect ratio: square (1:1)
- Focus on the key visual element that makes this remix unique`;

export class RemixImageGenerator {
  private genai: GoogleGenAI;

  constructor() {
    if (!ai.gemini.isConfigured()) {
      throw new Error("GEMINI_API_KEY is required for RemixImageGenerator");
    }
    this.genai = new GoogleGenAI({ apiKey: ai.gemini.apiKey });
  }

  /**
   * Генерирует изображение для одной remix опции
   */
  async generateImage(
    elementType: ElementType,
    elementLabel: string,
    elementDescription: string,
    remixPrompt: string
  ): Promise<Buffer | null> {
    try {
      const prompt = IMAGE_GENERATION_PROMPT.replace(
        "{elementType}",
        elementType
      )
        .replace("{elementLabel}", elementLabel)
        .replace("{elementDescription}", elementDescription)
        .replace("{remixPrompt}", remixPrompt);

      const response = await this.genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["image", "text"],
        },
      });

      // Извлекаем изображение из ответа
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
        console.warn("[RemixImageGenerator] No parts in response");
        return null;
      }

      for (const part of parts) {
        if (part.inlineData?.data) {
          return Buffer.from(part.inlineData.data, "base64");
        }
      }

      console.warn("[RemixImageGenerator] No image data in response");
      return null;
    } catch (error) {
      console.error("[RemixImageGenerator] Error generating image:", error);
      return null;
    }
  }

  /**
   * Генерирует изображения для всех remix опций элемента
   */
  async generateImagesForElement(
    params: GenerateImagesParams
  ): Promise<GenerateImagesResult> {
    const {
      elementId,
      elementType,
      elementLabel,
      elementDescription,
      remixOptions,
      analysisId,
    } = params;

    const logHandle = await aiLogger.startTimer({
      provider: "gemini",
      operation: "generateRemixImages",
      model: "gemini-2.5-flash",
      reelId: analysisId,
    });

    const results: RemixOptionWithImage[] = [];
    let successCount = 0;
    let failedCount = 0;

    if (!isS3Configured()) {
      console.warn("[RemixImageGenerator] S3 not configured, skipping images");
      await logHandle.fail(new Error("S3 not configured"));
      return {
        remixOptions: remixOptions.map((opt) => ({ ...opt })),
        successCount: 0,
        failedCount: remixOptions.length,
      };
    }

    for (const option of remixOptions) {
      try {
        console.log(
          `[RemixImageGenerator] Generating image for ${elementId}/${option.id}: "${option.label}"`
        );

        const imageBuffer = await this.generateImage(
          elementType,
          elementLabel,
          elementDescription,
          option.prompt
        );

        if (imageBuffer) {
          // Загружаем в S3
          const s3Key = getS3Key(
            "media",
            `remix-options/${analysisId}/${elementId}/${option.id}.png`
          );
          await s3Service.uploadFile(s3Key, imageBuffer, "image/png");

          const imageUrl = getMediaPublicUrl(s3Key);

          results.push({
            ...option,
            imageUrl,
          });
          successCount++;

          console.log(
            `[RemixImageGenerator] Image saved: ${s3Key} -> ${imageUrl}`
          );
        } else {
          results.push({ ...option });
          failedCount++;
        }
      } catch (error) {
        console.error(
          `[RemixImageGenerator] Failed to generate image for ${option.id}:`,
          error
        );
        results.push({ ...option });
        failedCount++;
      }
    }

    await logHandle.success({
      inputMeta: {
        elementId,
        elementType,
        optionsCount: remixOptions.length,
      },
      outputMeta: {
        successCount,
        failedCount,
      },
    });

    return {
      remixOptions: results,
      successCount,
      failedCount,
    };
  }

  /**
   * Генерирует изображения для всех элементов
   */
  async generateImagesForAllElements(
    elements: Array<{
      id: string;
      type: ElementType;
      label: string;
      description: string;
      remixOptions: RemixOptionInput[];
    }>,
    analysisId: string,
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<
    Array<{
      id: string;
      type: ElementType;
      label: string;
      description: string;
      remixOptions: RemixOptionWithImage[];
    }>
  > {
    const results: Array<{
      id: string;
      type: ElementType;
      label: string;
      description: string;
      remixOptions: RemixOptionWithImage[];
    }> = [];

    const totalOptions = elements.reduce(
      (acc, el) => acc + el.remixOptions.length,
      0
    );
    let processedOptions = 0;

    for (const element of elements) {
      onProgress?.(
        processedOptions,
        totalOptions,
        `Генерация изображений для "${element.label}"...`
      );

      const result = await this.generateImagesForElement({
        elementId: element.id,
        elementType: element.type,
        elementLabel: element.label,
        elementDescription: element.description,
        remixOptions: element.remixOptions,
        analysisId,
      });

      results.push({
        id: element.id,
        type: element.type,
        label: element.label,
        description: element.description,
        remixOptions: result.remixOptions,
      });

      processedOptions += element.remixOptions.length;
    }

    onProgress?.(totalOptions, totalOptions, "Генерация изображений завершена");

    return results;
  }
}

// Singleton instance
let remixImageGeneratorInstance: RemixImageGenerator | null = null;

export function getRemixImageGenerator(): RemixImageGenerator {
  if (!remixImageGeneratorInstance) {
    remixImageGeneratorInstance = new RemixImageGenerator();
  }
  return remixImageGeneratorInstance;
}

export function isRemixImageGeneratorConfigured(): boolean {
  return ai.gemini.isConfigured() && isS3Configured();
}
