import cron from "node-cron";
import prisma from "../db/prisma.js";
import { buildDailyDigest } from "../services/digestService.js";

export const startDigestJob = () => {
  cron.schedule("0 19 * * *", async () => {
    console.log("Running daily digest job...");

    const users = await prisma.user.findMany();

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    for (const user of users) {
      const summaries = await prisma.emailSummary.findMany({
        where: {
          email: {
            userId: user.id,
            internalDate: {
              gte: start,
            },
          },
        },
      });

      const digest = buildDailyDigest(summaries);

      await prisma.dailyDigest.upsert({
        where: {
          userId_digestDate: {
            userId: user.id,
            digestDate: start,
          },
        },
        update: {
          content: digest,
        },
        create: {
          userId: user.id,
          digestDate: start,
          content: digest,
        },
      });
    }

    console.log("Digest job completed");
  });
};