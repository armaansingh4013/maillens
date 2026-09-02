import prisma from "../db/prisma.js";
import { processEmailWithAI } from "../ai/chains/processEmail.chain.js";

export async function processUnprocessedEmails(userId) {
  const emails = await prisma.email.findMany({
    where: {
      userId,
      isSummarized: false,
      isIgnored: false,
    },
    take: 10,
    orderBy: {
      internalDate: "desc",
    },
  });

  for (const email of emails) {
    try {
      const ai = await processEmailWithAI(email);

      await prisma.emailSummary.upsert({
        where: { emailId: email.id },
        update: {
          shortSummary: ai.shortSummary || "",
          actionRequired: Boolean(ai.actionRequired),
          actionItem: ai.actionItem || null,
          category: ai.category || null,
          importance: ai.importance || "low",
          topic: ai.topic || null,
          platform: ai.platform || null,
          serviceType: ai.serviceType || null,
          accountType: ai.accountType || null,
          amount: ai.amount || null,
          dueDate: ai.dueDate ? new Date(ai.dueDate) : null,
          tags: ai.tags || [],
        },
        create: {
          emailId: email.id,
          shortSummary: ai.shortSummary || "",
          actionRequired: Boolean(ai.actionRequired),
          actionItem: ai.actionItem || null,
          category: ai.category || null,
          importance: ai.importance || "low",
          topic: ai.topic || null,
          platform: ai.platform || null,
          serviceType: ai.serviceType || null,
          accountType: ai.accountType || null,
          amount: ai.amount || null,
          dueDate: ai.dueDate ? new Date(ai.dueDate) : null,
          tags: ai.tags || [],
        },
      });

      if (Array.isArray(ai.memories)) {
        for (const memory of ai.memories) {
          if (!memory.title) continue;

          await prisma.emailMemory.create({
            data: {
              userId,
              emailId: email.id,
              memoryType: memory.memoryType || "general",
              title: memory.title,
              value: memory.value || null,
              confidence: memory.confidence || 0.7,
              source: memory.source || email.fromEmail,
            },
          });
        }
      }

      await prisma.email.update({
        where: { id: email.id },
        data: {
          isSummarized: true,
        },
      });

      console.log("Processed:", email.subject);
    } catch (err) {
      console.error("Failed:", email.id, err);
    }
  }
}
