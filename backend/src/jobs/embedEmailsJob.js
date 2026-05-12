import prisma from "../db/prisma.js";
import { chunkEmailContent } from "../services/chunkService.js";
import { embedText } from "../services/embeddingService.js";

function toVectorLiteral(embedding) {
  return `[${embedding.join(",")}]`;
}

export const runEmbeddingForUser = async (userId) => {
  const emails = await prisma.email.findMany({
    where: {
      userId,
      isEmbedded: false,
    },
    orderBy: {
      internalDate: "asc",
    },
    // take: 10,
  });

  let embeddedCount = 0;

  for (const email of emails) {
    try {
      const chunks = chunkEmailContent(email);

      if (!chunks.length) {
        await prisma.email.update({
          where: { id: email.id },
          data: { isEmbedded: true },
        });
        continue;
      }

      // remove old chunks if reprocessing
      await prisma.emailChunk.deleteMany({
        where: {
          emailId: email.id,
        },
      });

      for (const chunk of chunks) {
        const embedding = await embedText(chunk.content);
        const vectorLiteral = toVectorLiteral(embedding);

        await prisma.$executeRawUnsafe(
          `
          INSERT INTO "EmailChunk" ("id", "userId", "emailId", "chunkIndex", "content", "embedding", "createdAt")
          VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, NOW())
          `,
          userId,
          email.id,
          chunk.chunkIndex,
          chunk.content,
          vectorLiteral
        );
      }

      await prisma.email.update({
        where: { id: email.id },
        data: { isEmbedded: true },
      });

      embeddedCount += 1;
    } catch (error) {
      console.error(`Embedding failed for email ${email.id}:`, error.message);
    }
  }

  return {
    totalPending: emails.length,
    embeddedCount,
  };
};