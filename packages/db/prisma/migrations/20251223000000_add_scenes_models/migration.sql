-- Add scenes fields to VideoAnalysis
ALTER TABLE "VideoAnalysis" ADD COLUMN IF NOT EXISTS "hasScenes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VideoAnalysis" ADD COLUMN IF NOT EXISTS "scenesCount" INTEGER;

-- CreateTable VideoScene
CREATE TABLE IF NOT EXISTS "VideoScene" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "thumbnailUrl" TEXT,
    "thumbnailS3Key" TEXT,
    "elements" JSONB NOT NULL DEFAULT '[]',
    "generationStatus" TEXT NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable SceneGeneration
CREATE TABLE IF NOT EXISTS "SceneGeneration" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "jobId" TEXT,
    "selectedElements" JSONB NOT NULL DEFAULT '[]',
    "prompt" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'kling',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "klingTaskId" TEXT,
    "videoUrl" TEXT,
    "s3Key" TEXT,
    "error" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "progressStage" TEXT NOT NULL DEFAULT 'pending',
    "progressMessage" TEXT NOT NULL DEFAULT '',
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SceneGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable CompositeGeneration
CREATE TABLE IF NOT EXISTS "CompositeGeneration" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "jobId" TEXT,
    "sceneConfig" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "videoUrl" TEXT,
    "s3Key" TEXT,
    "error" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "progressStage" TEXT NOT NULL DEFAULT 'pending',
    "progressMessage" TEXT NOT NULL DEFAULT '',
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CompositeGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex VideoScene
CREATE UNIQUE INDEX IF NOT EXISTS "VideoScene_analysisId_index_key" ON "VideoScene"("analysisId", "index");
CREATE INDEX IF NOT EXISTS "VideoScene_analysisId_idx" ON "VideoScene"("analysisId");
CREATE INDEX IF NOT EXISTS "VideoScene_generationStatus_idx" ON "VideoScene"("generationStatus");

-- CreateIndex SceneGeneration
CREATE UNIQUE INDEX IF NOT EXISTS "SceneGeneration_jobId_key" ON "SceneGeneration"("jobId");
CREATE INDEX IF NOT EXISTS "SceneGeneration_sceneId_idx" ON "SceneGeneration"("sceneId");
CREATE INDEX IF NOT EXISTS "SceneGeneration_status_idx" ON "SceneGeneration"("status");
CREATE INDEX IF NOT EXISTS "SceneGeneration_klingTaskId_idx" ON "SceneGeneration"("klingTaskId");

-- CreateIndex CompositeGeneration
CREATE UNIQUE INDEX IF NOT EXISTS "CompositeGeneration_jobId_key" ON "CompositeGeneration"("jobId");
CREATE INDEX IF NOT EXISTS "CompositeGeneration_analysisId_idx" ON "CompositeGeneration"("analysisId");
CREATE INDEX IF NOT EXISTS "CompositeGeneration_status_idx" ON "CompositeGeneration"("status");

-- AddForeignKey VideoScene
DO $$ BEGIN
    ALTER TABLE "VideoScene" ADD CONSTRAINT "VideoScene_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "VideoAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey SceneGeneration
DO $$ BEGIN
    ALTER TABLE "SceneGeneration" ADD CONSTRAINT "SceneGeneration_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "VideoScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey CompositeGeneration
DO $$ BEGIN
    ALTER TABLE "CompositeGeneration" ADD CONSTRAINT "CompositeGeneration_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "VideoAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
