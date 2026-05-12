import prisma from "../db/prisma.js";
import { embedText } from "./embeddingService.js";

function toVectorLiteral(embedding) {
  return `[${embedding.join(",")}]`;
}

export const searchRelevantEmailChunks = async ({
  userId,
  question,
  limit = 8,
}) => {
  const questionEmbedding = await embedText(question);
  const vectorLiteral = toVectorLiteral(questionEmbedding);

  const results = await prisma.$queryRawUnsafe(
    `
    SELECT
      ec."id",
      ec."emailId",
      ec."chunkIndex",
      ec."content",
      e."subject",
      e."fromEmail",
      e."internalDate",
      e."isIgnored",
      e."ignoreReason",
      e."sourceDomain",
      (ec."embedding" <=> $2::vector) AS distance
    FROM "EmailChunk" ec
    JOIN "Email" e ON e."id" = ec."emailId"
    WHERE ec."userId" = $1
     AND (ec."embedding" <=> $2::vector) < $3
    ORDER BY ec."embedding" <=> $2::vector
    LIMIT $4
    `,
    userId,
    vectorLiteral,
    0.45, // distance threshold - adjust based on experimentation
    limit
  );

  return results;
};