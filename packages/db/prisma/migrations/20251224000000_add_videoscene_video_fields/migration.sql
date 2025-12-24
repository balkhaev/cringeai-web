-- Add missing video fields to VideoScene
ALTER TABLE "VideoScene" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE "VideoScene" ADD COLUMN IF NOT EXISTS "videoS3Key" TEXT;
