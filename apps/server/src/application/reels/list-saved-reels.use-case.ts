import prisma from "@trender/db";

type ListSavedReelsParams = {
  limit: number;
  offset: number;
  minLikes?: number;
  hashtag?: string;
  status?: string;
  search?: string;
};

type ReelWithAnalysis = Awaited<ReturnType<typeof prisma.reel.findMany>>[0] & {
  analysis: Awaited<ReturnType<typeof prisma.videoAnalysis.findMany>>[0] | null;
};

export async function listSavedReelsUseCase(
  params: ListSavedReelsParams
): Promise<{
  reels: ReelWithAnalysis[];
  total: number;
  limit: number;
  offset: number;
}> {
  const { limit, offset, minLikes, hashtag, status, search } = params;

  // biome-ignore lint/suspicious/noExplicitAny: complex prisma where
  const where: any = {};

  if (minLikes && minLikes > 0) {
    where.likeCount = { gte: minLikes };
  }

  if (hashtag) {
    where.hashtag = hashtag === "reels" ? null : hashtag;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    // Find reelIds that have analysis with matching tags
    const analysesWithTags = await prisma.videoAnalysis.findMany({
      where: {
        sourceType: "reel",
        tags: { hasSome: [search] },
      },
      select: { sourceId: true },
    });
    const reelIdsWithMatchingTags = analysesWithTags
      .map((a) => a.sourceId)
      .filter((id): id is string => id !== null);

    where.OR = [
      { caption: { contains: search, mode: "insensitive" } },
      { author: { contains: search, mode: "insensitive" } },
      { hashtag: { contains: search, mode: "insensitive" } },
      ...(reelIdsWithMatchingTags.length > 0
        ? [{ id: { in: reelIdsWithMatchingTags } }]
        : []),
    ];
  }

  const [reels, total] = await Promise.all([
    prisma.reel.findMany({
      where,
      orderBy: { likeCount: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.reel.count({ where }),
  ]);

  // Get analyses for these reels
  const reelIds = reels.map((r) => r.id);
  const analyses = await prisma.videoAnalysis.findMany({
    where: {
      sourceType: "reel",
      sourceId: { in: reelIds },
    },
    include: {
      generations: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Create a map of reelId -> analysis
  const analysisMap = new Map(analyses.map((a) => [a.sourceId, a]));

  // Merge reels with their analyses
  const reelsWithAnalysis = reels.map((reel) => ({
    ...reel,
    analysis: analysisMap.get(reel.id) || null,
  }));

  return {
    reels: reelsWithAnalysis,
    total,
    limit,
    offset,
  };
}
