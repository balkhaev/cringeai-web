-- Add elements and suggestions fields to VideoAnalysis
ALTER TABLE "VideoAnalysis" ADD COLUMN IF NOT EXISTS "elements" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "VideoAnalysis" ADD COLUMN IF NOT EXISTS "suggestions" JSONB NOT NULL DEFAULT '[]';
