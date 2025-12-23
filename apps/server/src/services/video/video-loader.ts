/**
 * Video Loader Service
 * Handles loading video files from S3 or local filesystem
 */
import { readFile } from "node:fs/promises";
import { s3Service } from "../s3";

/**
 * Load video buffer from S3 or local path
 */
export async function loadVideoBuffer(reel: {
  id: string;
  s3Key?: string | null;
  localPath?: string | null;
}): Promise<Buffer> {
  if (reel.s3Key) {
    const s3Buffer = await s3Service.downloadFile(reel.s3Key);
    if (!s3Buffer) {
      throw new Error(`Failed to download video from S3: ${reel.s3Key}`);
    }
    return s3Buffer;
  }

  if (reel.localPath) {
    return readFile(reel.localPath);
  }

  throw new Error(
    `Reel ${reel.id} has no video file (neither S3 nor local). Download first.`
  );
}
