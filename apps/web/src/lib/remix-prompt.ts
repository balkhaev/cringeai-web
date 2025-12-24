/**
 * Remix Prompt Builder
 * Generates Kling AI prompts from element selections
 */

import type { ElementSelection } from "@/components/flat-element-list";
import type { VideoElement } from "./templates-api";

// Re-export for convenience
export type { ElementSelection };

// Kling image element type
export type KlingImageElement = {
  referenceImageUrls: string[];
  frontalImageUrl?: string;
};

/**
 * Build prompt from element selections
 * Returns prompt string and element references for Kling API
 */
export function buildElementPrompt(
  elements: VideoElement[],
  selections: ElementSelection[]
): { prompt: string; elementRefs: KlingImageElement[] } {
  const promptParts: string[] = [];
  const elementRefs: KlingImageElement[] = [];
  let elementIndex = 1;

  for (const selection of selections) {
    // Пропускаем если нет выбранной опции И нет текстового промпта
    if (!(selection.selectedOptionId || selection.customPrompt?.trim())) {
      continue;
    }

    const element = elements.find((e) => e.id === selection.elementId);
    if (!element) {
      continue;
    }

    if (selection.customImageUrl) {
      // Custom image - use @Element reference
      const description = selection.customPrompt?.trim() || element.label;
      promptParts.push(
        `Replace ${element.label} with @Element${elementIndex} (${description})`
      );
      elementRefs.push({
        referenceImageUrls: [selection.customImageUrl],
        frontalImageUrl: selection.customImageUrl,
      });
      elementIndex++;
    } else if (
      selection.selectedOptionId === "custom" &&
      selection.customPrompt?.trim()
    ) {
      // Text-only prompt (no image) - use direct text description
      promptParts.push(
        `Replace ${element.label} with ${selection.customPrompt.trim()}`
      );
    } else if (
      selection.selectedOptionId &&
      selection.selectedOptionId !== "custom"
    ) {
      // Preset option - use text prompt
      const option = element.remixOptions.find(
        (o) => o.id === selection.selectedOptionId
      );
      if (option) {
        promptParts.push(option.prompt);
      }
    }
  }

  // Build final prompt
  let prompt = "Based on @Video1";

  if (promptParts.length > 0) {
    prompt = `${prompt}, ${promptParts.join(", ")}`;
  }

  return {
    prompt: `${prompt}.`,
    elementRefs,
  };
}

/**
 * Check if generation can proceed (has at least one element selected or text prompt)
 */
export function canGenerate(selections: ElementSelection[]): boolean {
  return selections.some(
    (s) => s.selectedOptionId !== null || s.customPrompt?.trim()
  );
}

/**
 * Count selected elements (with option or text prompt)
 */
export function countSelections(selections: ElementSelection[]): number {
  return selections.filter(
    (s) => s.selectedOptionId !== null || s.customPrompt?.trim()
  ).length;
}
