-- AlterTable - set default values for VideoAnalysis legacy fields
ALTER TABLE "VideoAnalysis" ALTER COLUMN "subject" SET DEFAULT '';
ALTER TABLE "VideoAnalysis" ALTER COLUMN "action" SET DEFAULT '';
ALTER TABLE "VideoAnalysis" ALTER COLUMN "environment" SET DEFAULT '';
ALTER TABLE "VideoAnalysis" ALTER COLUMN "cameraStyle" SET DEFAULT '';
ALTER TABLE "VideoAnalysis" ALTER COLUMN "mood" SET DEFAULT '';
ALTER TABLE "VideoAnalysis" ALTER COLUMN "colorPalette" SET DEFAULT '';
ALTER TABLE "VideoAnalysis" ALTER COLUMN "style" SET DEFAULT '';
ALTER TABLE "VideoAnalysis" ALTER COLUMN "lighting" SET DEFAULT '';
