import cron from "node-cron";
import prisma from "../db/prisma.js";
import { summarizeEmail } from "../services/summarizerService.js";
import { filterEmail } from "../services/emailFilterService.js";

export const runSummarizeForUser = async (userId) => {
  const emails = await prisma.email.findMany({
    where: {
      userId,
      isSummarized: false,
    },
    orderBy: {
      internalDate: "desc",
    },
    take: 20,
  });

  let summarizedCount = 0;

  for (const email of emails) {
    try {
        const filterResult = filterEmail(email);

        if (filterResult.ignore) {
          await prisma.email.update({
            where: { id: email.id },
            data: {
              isSummarized: true,
              isIgnored: true,
              ignoreReason: filterResult.reason,
            },
          });
        
          continue; // skip AI call
        }
        
        const summaryData = await summarizeEmail(email);
      await prisma.emailSummary.upsert({
        where: {
          emailId: email.id,
        },
        update: {
          shortSummary: summaryData.shortSummary,
          actionRequired: summaryData.actionRequired,
          actionItem: summaryData.actionItem,
          category: summaryData.category,
          importance: summaryData.importance,
          includeInDigest: summaryData.includeInDigest,
          topic: summaryData.topic,
        },
        create: {
          emailId: email.id,
          shortSummary: summaryData.shortSummary,
          actionRequired: summaryData.actionRequired,
          actionItem: summaryData.actionItem,
          category: summaryData.category,
          importance: summaryData.importance,
          includeInDigest: summaryData.includeInDigest,
          topic: summaryData.topic,
        },
      });

      await prisma.email.update({
        where: {
          id: email.id,
        },
        data: {
          isSummarized: true,
          isIgnored: summaryData.ignoreEmail,
          ignoreReason: summaryData.ignoreReason,
        },
      });

      summarizedCount += 1;
    } catch (error) {
      console.error(`Failed to summarize email ${email.id}:`, error.message);
    }
  }

  return {
    totalPending: emails.length,
    summarizedCount,
  };
};

export const startSummarizeJob = () => {
  cron.schedule("5,35 * * * *", async () => {
    console.log("Running summarize job...");

    try {
      const users = await prisma.user.findMany();

      for (const user of users) {
        try {
          const result = await runSummarizeForUser(user.id);
          console.log(`Summarized for ${user.email}:`, result);
        } catch (error) {
          console.error(`Summarize failed for ${user.email}:`, error.message);
        }
      }

      console.log("Summarize job completed");
    } catch (error) {
      console.error("Summarize job failed:", error.message);
    }
  });
};