import { API_URL } from "./api-client";

// Re-export types from @trender/api-contracts
export type {
  AssetAspectRatio as AspectRatio,
  AssetCategoriesResponse as CategoriesResponse,
  AssetCategory,
  AssetCategoryInfo as CategoryInfo,
  AssetGenerateRequest as GenerateAssetParams,
  AssetGenerateResponse as GenerateAssetResponse,
  AssetStylePreset as StylePreset,
  AssetStylePresetsResponse as StylePresetsResponse,
  GeneratedAsset,
} from "@trender/api-contracts";

// Import for internal use
import type {
  AssetCategoriesResponse,
  AssetGenerateRequest,
  AssetGenerateResponse,
  AssetStylePresetsResponse,
} from "@trender/api-contracts";

// API functions

/**
 * Generate an asset image using Imagen AI
 */
export async function generateAsset(
  params: AssetGenerateRequest
): Promise<AssetGenerateResponse> {
  const response = await fetch(`${API_URL}/api/assets/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate asset");
  }

  return response.json();
}

/**
 * Get available asset categories with examples
 */
export async function getCategories(): Promise<AssetCategoriesResponse> {
  const response = await fetch(`${API_URL}/api/assets/categories`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get categories");
  }

  return response.json();
}

/**
 * Get available style presets
 */
export async function getStylePresets(): Promise<AssetStylePresetsResponse> {
  const response = await fetch(`${API_URL}/api/assets/styles`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get style presets");
  }

  return response.json();
}
