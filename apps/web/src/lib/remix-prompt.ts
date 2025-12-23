/**
 * Remix Prompt Builder
 * Generates Kling AI prompts from element selections
 */

import type { ElementSelection } from "@/components/element-remix-selector";
import type { DetectableElement } from "./templates-api";

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
  elements: DetectableElement[],
  selections: ElementSelection[]
): { prompt: string; elementRefs: KlingImageElement[] } {
  const promptParts: string[] = [];
  const elementRefs: KlingImageElement[] = [];
  let elementIndex = 1;

  for (const selection of selections) {
    if (!selection.selectedOptionId) {
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
    } else if (selection.selectedOptionId !== "custom") {
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
 * Check if generation can proceed (has at least one element selected)
 */
export function canGenerate(selections: ElementSelection[]): boolean {
  return selections.some((s) => s.selectedOptionId !== null);
}

/**
 * Count selected elements
 */
export function countSelections(selections: ElementSelection[]): number {
  return selections.filter((s) => s.selectedOptionId !== null).length;
}
