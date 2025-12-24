import prisma from "@trender/db";
import { parseReelUrl } from "../../services/instagram/reel-url";
import { pipelineJobQueue } from "../../services/queues";

// Use the actual Prisma return type for type safety
type ReelRecord = Awaited<ReturnType<typeof prisma.reel.create>>;

type AddReelResult =
  | {
      success: true;
      reel: ReelRecord;
      message: string;
      isNew: boolean;
    }
  | {
      success: false;
      error: string;
      status: 400 | 500;
    };

export async function addReelUseCase(url: string): Promise<AddReelResult> {
  // Parse shortcode from URL
  const shortcode = parseReelUrl(url);
  if (!shortcode) {
    return {
      success: false,
      error:
        "Invalid Instagram URL. Expected format: instagram.com/reel/SHORTCODE",
      status: 400,
    };
  }

  // Check if reel already exists
  const existing = await prisma.reel.findUnique({ where: { id: shortcode } });
  if (existing) {
    return {
      success: true,
      reel: existing,
      message: "Reel already exists",
      isNew: false,
    };
  }

  // Create reel entry
  const reel = await prisma.reel.create({
    data: {
      id: shortcode,
      url: `https://www.instagram.com/reel/${shortcode}/`,
      source: "manual",
      status: "scraped",
    },
  });

  // Start download immediately
  console.log(`[AddReel] Starting download for reel ${shortcode}...`);
  const jobId = await pipelineJobQueue.addDownloadJob(shortcode);
  console.log(`[AddReel] Download job added: ${jobId}`);

  return {
    success: true,
    reel,
    message: "Reel added and download started",
    isNew: true,
  };
}
