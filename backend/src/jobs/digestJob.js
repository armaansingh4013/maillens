import cron from "node-cron";
import prisma from "../db/prisma.js";
import { buildAndSaveTodayDigest } from "../services/digestBuilderService.js";
import { sendDigestEmail } from "../services/digestMailer.js";

export const runDigestForUser = async (user) => {
  const { digest, stats } = await buildAndSaveTodayDigest(user.id);
  const mail = await sendDigestEmail({ user, digestContent: digest.content, stats });
  return { digest, stats, mail };
};

export const startDigestJob = () => {
  // Every evening at 7pm — builds the day's digest and emails it out.
  cron.schedule("0 19 * * *", async () => {
    console.log("Running daily digest job...");

    try {
      const users = await prisma.user.findMany();

      for (const user of users) {
        try {
          const result = await runDigestForUser(user);
          console.log(`Digest for ${user.email}:`, result.stats, result.mail);
        } catch (error) {
          console.error(`Digest failed for ${user.email}:`, error.message);
        }
      }
    } catch (error) {
      console.error("Digest job failed:", error.message);
    }

    console.log("Digest job completed");
  });
};
