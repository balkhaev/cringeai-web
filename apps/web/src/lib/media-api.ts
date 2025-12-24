import { API_URL } from "./api-client";

// Re-export types from @trender/api-contracts
export type {
  AssetCategory,
  ExtendedMediaItem as MediaItem,
  MediaSource,
  MediaType,
  MediaUploadResponse,
  PersonalMediaQueryInput as PersonalMediaParams,
  PersonalMediaResponse,
} from "@trender/api-contracts";

// Import for internal use
import type {
  MediaUploadResponse,
  PersonalMediaQueryInput,
  PersonalMediaResponse,
} from "@trender/api-contracts";

type PersonalMediaParams = PersonalMediaQueryInput;

// API functions

/**
 * Get personal media library with filters
 */
export async function getPersonalMedia(
  params: PersonalMediaParams = {}
): Promise<PersonalMediaResponse> {
  const searchParams = new URLSearchParams();

  if (params.type && params.type !== "all") {
    searchParams.set("type", params.type);
  }
  if (params.source && params.source !== "all") {
    searchParams.set("source", params.source);
  }
  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.limit) {
    searchParams.set("limit", params.limit.toString());
  }
  if (params.offset) {
    searchParams.set("offset", params.offset.toString());
  }

  const response = await fetch(
    `${API_URL}/api/media/personal?${searchParams.toString()}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error("Failed to get media library");
  }

  return response.json();
}

/**
 * Upload media file to library
 */
export async function uploadMedia(file: File): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/media/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload media");
  }

  return response.json();
}

/**
 * Delete media from library
 */
export async function deleteMedia(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/api/media/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete media");
  }

  return response.json();
}
