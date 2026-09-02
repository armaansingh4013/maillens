import { ChatPromptTemplate } from "@langchain/core/prompts";
import { llm } from "../llm.js";

const prompt = ChatPromptTemplate.fromTemplate(`
You are Mail Lens AI.

Analyze this email and return ONLY valid JSON.

Email:
From: {fromEmail}
Subject: {subject}
Body: {bodyText}

Return this JSON:
{{
  "shortSummary": "",
  "actionRequired": false,
  "actionItem": "",
  "category": "",
  "importance": "low",
  "topic": "",
  "platform": "",
  "serviceType": "",
  "accountType": "",
  "amount": "",
  "dueDate": null,
  "tags": [],
  "memories": [
    {{
      "memoryType": "platform",
      "title": "",
      "value": "",
      "confidence": 0.8,
      "source": ""
    }}
  ]
}}
`);

export async function processEmailWithAI(email) {
  const chain = prompt.pipe(llm);

  const result = await chain.invoke({
    fromEmail: email.fromEmail || "",
    subject: email.subject || "",
    bodyText: email.bodyText || "",
  });

  const clean = String(result.content)
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(clean);
}
