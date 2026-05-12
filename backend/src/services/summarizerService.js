
import axios from "axios";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(match[0]);
}

export const summarizeEmail = async (email) => {
  const prompt = `
You are an email triage assistant.

Return ONLY valid JSON.
Do not add markdown.
Do not add explanation.

Schema:
{
  "include_in_digest": true,
  "topic": "string",
  "short_summary": "string",
  "action_required": false,
  "action_item": "string",
  "category": "string",
  "importance": "low",
  "ignore_email": false,
  "ignore_reason": "string"
}

Rules:
- importance must be one of: low, medium, high
- action_required must be true or false
- include_in_digest must be true or false
- ignore_email must be true or false
- if no action is needed, action_item must be ""
- topic must be short, like "interview scheduling", "invoice update", "security alert"
- short_summary must be factual and concise
- Ignore low-value OTPs, promotions, ads, repetitive newsletters, and social noise
- Do NOT ignore emails that contain deadlines, invoices, interview requests, security alerts, payments, work tasks, or anything that requires action

Email:
Subject: ${email.subject || ""}
From: ${email.fromEmail || ""}
Snippet: ${email.snippet || ""}
Body:
${email.bodyText || ""}
`;

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: "llama3.2:3b",
    prompt,
    stream: false,
    options: {
      temperature: 0.2,
    },
  });

  const raw = response.data.response;
  const parsed = extractJson(raw);

  return {
    shortSummary: parsed.short_summary || "",
    actionRequired: Boolean(parsed.action_required),
    actionItem: parsed.action_item || "",
    category: parsed.category || "updates",
    importance: ["low", "medium", "high"].includes(parsed.importance)
      ? parsed.importance
      : "low",
    includeInDigest:
      typeof parsed.include_in_digest === "boolean"
        ? parsed.include_in_digest
        : true,
    topic: parsed.topic || null,
    ignoreEmail: Boolean(parsed.ignore_email),
    ignoreReason: parsed.ignore_reason || null,
  };
};