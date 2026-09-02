import cron from "node-cron";
import prisma from "../db/prisma.js";
import { summarizeEmail } from "../services/summarizerService.js";
import { filterEmail } from "../services/emailFilterService.js";
import { runEmbeddingForUser } from "./embedEmailsJob.js";

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
        console.log('====================================');
        console.log(summaryData);
        console.log('====================================');
        console.log("emailSummary");

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

      console.log("emailExtraction");
      //=================================================
      await prisma.emailExtraction.upsert({
        where: {
          emailId: email.id
        },
        update: {
          rawResponse: summaryData.rawExtraction
        },
        create: {
          emailId: email.id,
          version: "v1",
          rawResponse: summaryData.rawExtraction
        }
      });

      for (const memory of summaryData.memories) {
        await prisma.emailMemory.create({
          data: {
            userId: email.userId,
            emailId: email.id,
      
            category: memory.category || "OTHER",
      
            memoryType: "EXTRACTED",
            metadata: memory.metadata || {},
            title: memory.title || "",
      
            value: memory.value || "",
      
            confidence: memory.confidence || 1,
      
            source: "EMAIL"
          }
        });
      }

      if (summaryData.payment?.detected) {
        await prisma.payment.create({
          data: {
            userId: email.userId,
            emailId: email.id,
      
            vendor: summaryData.payment.vendor,
      
            amount: summaryData.payment.amount || 0,
      
            currency:
              summaryData.payment.currency || "INR",
      
            paidAt:
              email.internalDate || new Date()
          }
        });
      }

      if (email.fromEmail) {
    

console.log("subscription");
        await prisma.subscription.upsert({
          where: {
            userId_senderEmail: {
              userId: email.userId,
              senderEmail: email.fromEmail
            }
          },
      
          update: {
            emailCount: {
              increment: 1
            },
            lastEmailAt: email.internalDate
          },
      
          create: {
            userId: email.userId,
            senderEmail: email.fromEmail,
            senderDomain: email.sourceDomain || "",
      
            unsubscribeUrl:
              summaryData.subscription
                ?.unsubscribeUrl || null,
      
            isMarketing:
              summaryData.subscription
                ?.isMarketing || false,
      
            emailCount: 1,
      
            lastEmailAt: email.internalDate
          }
        });
      }

      if (summaryData.job?.detected) {
        await prisma.jobApplication.create({
          data: {
            userId: email.userId,
            emailId: email.id,
      
            company:
              summaryData.job.company || "Unknown",
      
            position:
              summaryData.job.position || null,
      
            status:
              summaryData.job.status || "APPLIED",
      
            appliedAt: email.internalDate
          }
        });
      }

      if (summaryData.task?.detected) {
        await prisma.task.create({
          data: {
            userId: email.userId,
            emailId: email.id,

            title: summaryData.task.title,

            status: "OPEN",

            dueDate:
              summaryData.task.dueDate
                ? new Date(summaryData.task.dueDate)
                : null
          }
        });
      }











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
  cron.schedule("*/1 * * * *", async () => {
    console.log("Running summarize job...");

    try {
      const users = await prisma.user.findMany();
      
      for (const user of users) {
        const result = await runSummarizeForUser(user.id);
        await runEmbeddingForUser(user.id)
        try {
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