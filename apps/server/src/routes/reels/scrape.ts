/**
 * Scraping routes and worker handler
 */
import prisma from "@trender/db";
import { Hono } from "hono";
import { z } from "zod";
import { downloadVideos } from "../../services/instagram/downloader";
import { scrapeReels, testConnection } from "../../services/instagram/scraper";
import type { SortMode } from "../../services/instagram/types";
import { pipelineJobQueue, scrapeJobQueue } from "../../services/queues";

export const scrapeRouter = new Hono();

const scrapeRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(2),
  sort: z.enum(["top", "recent"]).default("top"),
  minLikes: z.number().int().min(0).default(50_000),
});

/**
 * Initialize the scrape worker handler
 * Must be called once during app startup
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: воркер содержит полный pipeline (scrape->save->download) и прогресс-репортинг.
export function initScrapeWorkerHandler(): void {
  scrapeJobQueue.setWorkerHandler(async (bullJob) => {
    const jobId = bullJob.id ?? "";
    const { sortMode, limit, minLikes } = bullJob.data;

    await scrapeJobQueue.updateJobStatus(jobId, "running");

    try {
      console.log(
        `Starting scrape job ${jobId} for /reels/ (${sortMode}, limit: ${limit}, minLikes: ${minLikes})`
      );

      const reels = await scrapeReels(
        {
          limit,
          sortMode,
          minLikes,
        },
        (update) => {
          scrapeJobQueue.updateJobProgress(jobId, {
            scanned: update.scanned,
            found: update.found,
            scraped: update.found,
            currentReelId: update.currentReelId,
            currentLikes: update.currentLikes,
            lastFoundReel: update.lastFoundReel,
          });
        }
      );

      await scrapeJobQueue.addReels(jobId, reels);
      await scrapeJobQueue.updateJobProgress(jobId, { total: reels.length });

      // Save reels to database
      console.log(`Saving ${reels.length} reels to database...`);
      let savedCount = 0;

      for (const reel of reels) {
        try {
          // Clean URL - remove query params that may contain invalid bytes
          const cleanVideoUrl = reel.videoUrl
            ? reel.videoUrl.split("?")[0]
            : null;

          await prisma.reel.upsert({
            where: { id: reel.id },
            update: {
              url: reel.url,
              videoUrl: cleanVideoUrl,
              likeCount: reel.likeCount ?? null,
              viewCount: reel.viewCount ?? null,
              commentCount: reel.commentCount ?? null,
              caption: reel.caption ?? null,
              author: reel.author ?? null,
              thumbnailUrl: reel.thumbnailUrl ?? null,
              duration: reel.duration ?? null,
              source: "reels",
              scrapedAt: new Date(),
            },
            create: {
              id: reel.id,
              url: reel.url,
              videoUrl: cleanVideoUrl,
              likeCount: reel.likeCount ?? null,
              viewCount: reel.viewCount ?? null,
              commentCount: reel.commentCount ?? null,
              caption: reel.caption ?? null,
              author: reel.author ?? null,
              thumbnailUrl: reel.thumbnailUrl ?? null,
              duration: reel.duration ?? null,
              source: "reels",
            },
          });
          savedCount += 1;
        } catch (dbError) {
          console.error(`Failed to save reel ${reel.id}:`, dbError);
        }
      }
      console.log(`Saved ${savedCount}/${reels.length} reels to database`);

      // Add refresh-duration jobs for reels without duration
      const reelsWithoutDuration = reels.filter((r) => r.duration === null);
      if (reelsWithoutDuration.length > 0) {
        console.log(
          `Adding refresh-duration jobs for ${reelsWithoutDuration.length} reels without duration...`
        );
        const reelIds = reelsWithoutDuration.map((r) => r.id);
        await pipelineJobQueue.addBatchRefreshDurationJobs(reelIds);
      }

      // Download videos via Python instaloader service
      console.log(
        `Starting downloads for ${reels.length} reels via instaloader...`
      );

      if (reels.length > 0) {
        await downloadVideos(reels, "reels", (_downloaded, filename) => {
          scrapeJobQueue.addDownloadedFile(jobId, filename);
        });
      }

      await scrapeJobQueue.completeJob(jobId);
      console.log(`Job ${jobId} completed successfully`);

      return { reels, downloadedFiles: [] };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Job ${jobId} failed:`, errorMessage);
      await scrapeJobQueue.setJobError(jobId, errorMessage);
      throw error; // Re-throw для BullMQ
    }
  });
}

// POST /scrape - start scraping
scrapeRouter.post("/", async (c) => {
  try {
    const rawBody = await c.req.json();
    const body = scrapeRequestSchema.parse(rawBody);

    const job = await scrapeJobQueue.createJob(
      body.sort as SortMode,
      body.limit,
      body.minLikes
    );

    return c.json({
      success: true,
      message: "Scraping job started",
      jobId: job.id,
    });
  } catch (error) {
    console.error("Scrape error:", error);

    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      400
    );
  }
});

// GET /status/:jobId - get job status
scrapeRouter.get("/status/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const job = await scrapeJobQueue.getJob(jobId);

  if (!job) {
    return c.json({ success: false, message: "Job not found" }, 404);
  }

  return c.json({
    success: true,
    message: "Job found",
    job: {
      id: job.id,
      status: job.status,
      sortMode: job.sortMode,
      limit: job.limit,
      minLikes: job.minLikes,
      progress: job.progress,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    },
  });
});

// GET /jobs - list all jobs
scrapeRouter.get("/jobs", async (c) => {
  const jobs = await scrapeJobQueue.getAllJobs();
  return c.json({
    jobs: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      sortMode: job.sortMode,
      limit: job.limit,
      minLikes: job.minLikes,
      progress: job.progress,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    })),
  });
});

// GET /test - test connection
scrapeRouter.get("/test", async (c) => {
  try {
    const connected = await testConnection();
    return c.json({
      success: connected,
      message: connected
        ? "Connection to Instagram successful"
        : "Failed to connect to Instagram",
    });
  } catch (error) {
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : "Connection failed",
    });
  }
});
