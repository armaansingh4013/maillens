import prisma from "../db/prisma.js";
import { buildDailyDigest } from "./digestService.js";
import { buildDailyStats } from "./dailyStatsService.js";

function todayStart() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Builds and persists today's digest for one user. Used by both the
 * manual "/digest/today" endpoint and the evening cron job, so the
 * two never drift out of sync.
 */
export async function buildAndSaveTodayDigest(userId) {
  const start = todayStart();

  const [emails, summaries] = await Promise.all([
    prisma.email.findMany({
      where: { userId, internalDate: { gte: start } },
      select: { isIgnored: true, ignoreReason: true },
    }),
    prisma.emailSummary.findMany({
      where: { email: { userId, internalDate: { gte: start } } },
      include: { email: true },
    }),
  ]);

  const stats = buildDailyStats(emails);
  const content = buildDailyDigest(summaries, stats);

  const digest = await prisma.dailyDigest.upsert({
    where: { userId_digestDate: { userId, digestDate: start } },
    update: { content },
    create: { userId, digestDate: start, content },
  });

  return { digest, stats };
}
