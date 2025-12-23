-- AlterTable UserMedia: add generation fields
ALTER TABLE "UserMedia" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'upload';
ALTER TABLE "UserMedia" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "UserMedia" ADD COLUMN IF NOT EXISTS "prompt" TEXT;
ALTER TABLE "UserMedia" ADD COLUMN IF NOT EXISTS "style" TEXT;
ALTER TABLE "UserMedia" ADD COLUMN IF NOT EXISTS "generationParams" JSONB;

-- CreateIndex UserMedia
CREATE INDEX IF NOT EXISTS "UserMedia_source_idx" ON "UserMedia"("source");
CREATE INDEX IF NOT EXISTS "UserMedia_category_idx" ON "UserMedia"("category");

-- AlterTable VideoScene: add elementIds
ALTER TABLE "VideoScene" ADD COLUMN IF NOT EXISTS "elementIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable VideoElement
CREATE TABLE IF NOT EXISTS "VideoElement" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "remixOptions" JSONB NOT NULL DEFAULT '[]',
    "appearances" JSONB NOT NULL DEFAULT '[]',
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoElement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex VideoElement
CREATE INDEX IF NOT EXISTS "VideoElement_analysisId_idx" ON "VideoElement"("analysisId");
CREATE INDEX IF NOT EXISTS "VideoElement_type_idx" ON "VideoElement"("type");

-- AddForeignKey VideoElement
ALTER TABLE "VideoElement" DROP CONSTRAINT IF EXISTS "VideoElement_analysisId_fkey";
ALTER TABLE "VideoElement" ADD CONSTRAINT "VideoElement_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "VideoAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
