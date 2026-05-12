import prisma from "../db/prisma.js";
import { summarizeEmail } from "../services/summarizerService.js";
import { filterEmail } from "../services/emailFilterService.js";

export const runSummarizeWorker = async (workerName) => {
  try {
    while (true) {
      const emails = await prisma.email.findMany({
        where: {
          isSummarized: false,
        },
        orderBy: {
          internalDate: "asc",
        },
        take: 20,
      });

      if (emails.length === 0) {
        break;
      }

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
            continue;
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
        } catch (error) {
          console.error(`Failed to summarize email ${email.id}:`, error.message);
        }
      }

      await prisma.workerState.update({
        where: {
          workerName,
        },
        data: {
          lastHeartbeatAt: new Date(),
        },
      });
    }
  } finally {
    await prisma.workerState.update({
      where: {
        workerName,
      },
      data: {
        isRunning: false,
      },
    });
  }
};