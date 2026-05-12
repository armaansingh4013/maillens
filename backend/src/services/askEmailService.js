import axios from "axios";
import { searchRelevantEmailChunks } from "./vectorSearchService.js";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export const askEmailQuestion = async ({ userId, question }) => {
  const matches = await searchRelevantEmailChunks({
    userId,
    question,
    limit: 4,
  });

  if (!matches.length) {
    return {
      answer: "I could not find any relevant emails for that question.",
      matches: [],
    };
  }

  const context = matches
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

  const prompt = `
You are MailLens, an assistant that answers only from the user's email data.

Rules:
- Answer only from the provided email context.
- If the answer is uncertain, say so clearly.
- Mention if the answer came from ignored or filtered emails when relevant.
- Do not invent facts.
- Keep the answer useful and direct.
- Dont include phrases like "Based on the provided email context" in the final answer.

User question:
${question}

Email context:
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
  };
};