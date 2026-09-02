import axios from "axios";
import prisma from "../db/prisma.js";
import { searchRelevantEmailChunks } from "./vectorSearchService.js";
import { routeStructuredQuestion } from "./askRouterService.js";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

/**
 * Memory facts have no embeddings, so this is a cheap keyword overlap
 * instead of a vector search — good enough to surface a handful of
 * relevant facts (e.g. "flight booking", "AWS invoice") into the
 * context without hitting the DB for every memory row's full text.
 */
async function findRelevantMemories(userId, question, limit = 5) {
  const words = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);

  if (!words.length) return [];

  const memories = await prisma.emailMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return memories
    .filter((m) => {
      const text = `${m.title || ""} ${m.value || ""} ${m.category || ""}`.toLowerCase();
      return words.some((w) => text.includes(w));
    })
    .slice(0, limit);
}

async function answerFromSemanticSearch({ userId, question }) {
  const [matches, memories] = await Promise.all([
    searchRelevantEmailChunks({ userId, question, limit: 4 }),
    findRelevantMemories(userId, question),
  ]);

  if (!matches.length && !memories.length) {
    return {
      answer: "I could not find any relevant emails for that question.",
      matches: [],
    };
  }

  const chunkContext = matches
    .map((m, i) => {
      return `Email Chunk ${i + 1}
Subject: ${m.subject || ""}
From: ${m.fromEmail || ""}
Date: ${m.internalDate ? new Date(m.internalDate).toISOString() : ""}
Ignored: ${m.isIgnored ? "yes" : "no"}
Ignore Reason: ${m.ignoreReason || ""}
Domain: ${m.sourceDomain || ""}
Content:
${m.content}`;
    })
    .join("\n\n--------------------\n\n");

  const memoryContext = memories
    .map((m) => `- [${m.category || "fact"}] ${m.title}${m.value ? `: ${m.value}` : ""}`)
    .join("\n");

  const context = [
    memoryContext ? `Known facts about this inbox:\n${memoryContext}` : "",
    chunkContext ? `Relevant email excerpts:\n${chunkContext}` : "",
  ]
    .filter(Boolean)
    .join("\n\n====================\n\n");

  const prompt = `
You are MailLens, an assistant that answers only from the user's email data.

Rules:
- Answer only from the provided context (known facts and/or email excerpts).
- If the answer is uncertain, say so clearly.
- Mention if the answer came from ignored or filtered emails when relevant.
- Do not invent facts.
- Keep the answer useful and direct.
- Dont include phrases like "Based on the provided email context" in the final answer.

User question:
${question}

Context:
${context}

Return plain text only.
`;

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: "llama3.2:3b",
    prompt,
    stream: false,
    options: {
      temperature: 0.2,
    },
  });

  return {
    answer: response.data.response?.trim() || "No answer generated.",
    matches,
    memories,
  };
}

export const askEmailQuestion = async ({ userId, question }) => {
  const structured = await routeStructuredQuestion({ userId, question });

  if (structured.intent !== "semantic") {
    return { answer: structured.answer, matches: structured.matches, intent: structured.intent };
  }

  const result = await answerFromSemanticSearch({ userId, question });
  return { ...result, intent: "semantic" };
};
