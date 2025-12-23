/**
 * Video Download Service
 * Handles downloading videos from Instagram and storing them
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import prisma from "@trender/db";
import type { ReelStatus } from "@trender/db/enums";
import { services } from "../../config";
import { getDownloadsPath } from "../instagram/downloader";
import { pipelineLogger } from "../pipeline-logger";
import { getS3Key, isS3Configured, s3Service } from "../s3";

// Service URLs
const INSTALOADER_SERVICE_URL = services.scrapper;
const VIDEO_FRAMES_SERVICE_URL = services.videoFrames;

// Prisma types
type Reel = NonNullable<Awaited<ReturnType<typeof prisma.reel.findFirst>>>;

/**
 * Callbacks for progress updates during download
 */
export type DownloadProgressCallbacks = {
  updateStatus: (
    reelId: string,
    status: ReelStatus,
    errorMessage?: string
  ) => Promise<Reel>;
  updateProgress: (
    reelId: string,
    stage: string,
    percent: number,
    message: string
  ) => Promise<void>;
};

/**
 * Result of a video download operation
 */
export type DownloadResult = {
  /** S3 key if uploaded to S3, or local file path */
  path: string;
  /** Whether the video was uploaded to S3 */
  isS3: boolean;
  /** Size of the video in bytes */
  size: number;
};

/**
 * Resize video for Kling API compatibility (requires 720-2160px width)
 * Uses video-frames service
 */
export async function resizeVideoIfNeeded(
  buffer: Buffer,
  reelId: string,
  callbacks?: Pick<DownloadProgressCallbacks, "updateProgress">
): Promise<Buffer> {
  try {
    const formData = new FormData();
    formData.append(
      "video",
      new Blob([new Uint8Array(buffer)], { type: "video/mp4" }),
      "video.mp4"
    );
    formData.append("min_width", "720");
    formData.append("target_width", "1080");

    const response = await fetch(`${VIDEO_FRAMES_SERVICE_URL}/resize`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return buffer;
    }

    const resized = response.headers.get("X-Resized") === "true";
    const originalWidth = response.headers.get("X-Original-Width");
    const newWidth = response.headers.get("X-New-Width");

    if (resized && callbacks?.updateProgress) {
      await callbacks.updateProgress(
        reelId,
        "download",
        60,
        `Видео увеличено: ${originalWidth}px → ${newWidth}px`
      );
    }

    const resizedBuffer = await response.arrayBuffer();
    return Buffer.from(resizedBuffer);
  } catch {
    return buffer;
  }
}

/**
 * Fetch metadata for a reel from Instagram
 */
async function fetchReelMetadata(reelId: string): Promise<{
  caption?: string;
  commentCount?: number;
  likeCount?: number;
  viewCount?: number;
  author?: string;
  thumbnailUrl?: string;
} | null> {
  try {
    const response = await fetch(`${INSTALOADER_SERVICE_URL}/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortcode: reelId }),
    });

    if (!response.ok) {
      return null;
    }

    const metadata = (await response.json()) as {
      success: boolean;
      caption?: string;
      commentCount?: number;
      likeCount?: number;
      viewCount?: number;
      author?: string;
      thumbnailUrl?: string;
    };

    return metadata.success ? metadata : null;
  } catch {
    return null;
  }
}

/**
 * Download video file from Instagram
 */
async function downloadVideoFromInstagram(reelId: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2min timeout

  try {
    const response = await fetch(`${INSTALOADER_SERVICE_URL}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortcode: reelId }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("video/mp4")) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || `Download failed: ${response.status}`);
    }

    const videoBuffer = await response.arrayBuffer();
    return Buffer.from(videoBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Download a reel video
 * Handles metadata fetching, video downloading, resizing, and storage (S3 or local)
 */
export async function downloadReel(
  reelId: string,
  callbacks: DownloadProgressCallbacks
): Promise<DownloadResult> {
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel) {
    throw new Error(`Reel ${reelId} not found`);
  }

  // Update status and progress
  await callbacks.updateStatus(reelId, "downloading");
  await callbacks.updateProgress(
    reelId,
    "download",
    0,
    "Начало загрузки видео..."
  );

  const timer = pipelineLogger.startTimer(
    reelId,
    "download",
    "Downloading video"
  );

  try {
    // Get output directory
    const folder = reel.hashtag || reel.source;
    const outputDir = getDownloadsPath(folder);
    const filename = `${reelId}.mp4`;
    const filepath = join(outputDir, filename);

    // Fetch metadata
    await callbacks.updateProgress(
      reelId,
      "download",
      5,
      "Получение метаданных..."
    );
    const metadata = await fetchReelMetadata(reelId);

    if (metadata) {
      await prisma.reel.update({
        where: { id: reelId },
        data: {
          caption: metadata.caption ?? null,
          commentCount: metadata.commentCount ?? null,
          likeCount: metadata.likeCount ?? null,
          viewCount: metadata.viewCount ?? null,
          author: metadata.author ?? null,
          thumbnailUrl: metadata.thumbnailUrl ?? null,
        },
      });
    }

    // Download video
    await callbacks.updateProgress(
      reelId,
      "download",
      15,
      "Скачивание видео..."
    );
    let buffer = await downloadVideoFromInstagram(reelId);

    await callbacks.updateProgress(
      reelId,
      "download",
      50,
      "Получение видео..."
    );

    // Resize if needed for Kling API
    await callbacks.updateProgress(
      reelId,
      "download",
      55,
      "Проверка размера видео..."
    );
    buffer = await resizeVideoIfNeeded(buffer, reelId, callbacks);

    const s3Key = getS3Key("reels", reelId);
    const videoSize = buffer.length;

    await callbacks.updateProgress(
      reelId,
      "download",
      70,
      `Видео загружено (${(videoSize / 1024 / 1024).toFixed(1)} MB)`
    );

    // Try S3 upload first
    if (isS3Configured()) {
      try {
        await callbacks.updateProgress(
          reelId,
          "uploading",
          80,
          "Загрузка в облачное хранилище..."
        );

        await s3Service.uploadFile(s3Key, buffer, "video/mp4");

        await prisma.reel.update({
          where: { id: reelId },
          data: {
            status: "downloaded",
            s3Key,
            localPath: null,
            progress: 100,
            progressStage: "download",
            progressMessage: "Загрузка завершена",
            lastActivityAt: new Date(),
          },
        });

        await timer.stop("Video downloaded and uploaded to S3", {
          fileSize: videoSize,
          s3Key,
        });

        return { path: s3Key, isS3: true, size: videoSize };
      } catch {
        // Fall through to local storage
      }
    }

    // Fall back to local storage
    await callbacks.updateProgress(
      reelId,
      "download",
      90,
      "Сохранение на диск..."
    );

    await mkdir(outputDir, { recursive: true });
    await writeFile(filepath, buffer);

    await prisma.reel.update({
      where: { id: reelId },
      data: {
        status: "downloaded",
        localPath: filepath,
        progress: 100,
        progressStage: "download",
        progressMessage: "Загрузка завершена",
        lastActivityAt: new Date(),
      },
    });

    await timer.stop("Video downloaded successfully", {
      fileSize: videoSize,
      filePath: filepath,
    });

    return { path: filepath, isS3: false, size: videoSize };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await callbacks.updateProgress(
      reelId,
      "download",
      0,
      `Ошибка: ${err.message}`
    );
    await timer.fail(err);
    await callbacks.updateStatus(reelId, "failed", err.message);
    throw err;
  }
}

/**
 * Video Download Service singleton
 */
class VideoDownloadService {
  async downloadReel(
    reelId: string,
    callbacks: DownloadProgressCallbacks
  ): Promise<DownloadResult> {
    return downloadReel(reelId, callbacks);
  }

  async resizeVideoIfNeeded(
    buffer: Buffer,
    reelId: string,
    callbacks?: Pick<DownloadProgressCallbacks, "updateProgress">
  ): Promise<Buffer> {
    return resizeVideoIfNeeded(buffer, reelId, callbacks);
  }
}

export const videoDownloadService = new VideoDownloadService();
