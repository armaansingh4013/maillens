
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
//   const prompt = `
// You are an email triage assistant.

// Return ONLY valid JSON.
// Do not add markdown.
// Do not add explanation.

// Schema:
// {
//   "include_in_digest": true,
//   "topic": "string",
//   "short_summary": "string",
//   "action_required": false,
//   "action_item": "string",
//   "category": "string",
//   "importance": "low",
//   "ignore_email": false,
//   "ignore_reason": "string"
// }

// Rules:
// - importance must be one of: low, medium, high
// - action_required must be true or false
// - include_in_digest must be true or false
// - ignore_email must be true or false
// - if no action is needed, action_item must be ""
// - topic must be short, like "interview scheduling", "invoice update", "security alert"
// - short_summary must be factual and concise
// - Ignore low-value OTPs, promotions, ads, repetitive newsletters, and social noise
// - Do NOT ignore emails that contain deadlines, invoices, interview requests, security alerts, payments, work tasks, or anything that requires action

// Email:
// Subject: ${email.subject || ""}
// From: ${email.fromEmail || ""}
// Snippet: ${email.snippet || ""}
// Body:
// ${email.bodyText || ""}
// `;


// const prompt = `
// You are an email intelligence assistant.

//  Return ONLY valid JSON. This is an example not exact resposne use this json as format.
// {
//   "include_in_digest": true,
//   "topic": "string",
//   "short_summary": "string",
//   "action_required": false,
//   "action_item": "string",
//   "category": "string",
//   "importance": "low",
//   "ignore_email": false,
//   "ignore_reason": "string",

//   "memories": [
//     {
//       "category": "string",
//       "title": "string",
//       "value": "string",
//       "confidence": number,
//       "metadata": {
//         "source": "string",
//         "timestamp": "string",
//         "facts": ["string"]
//       }
//     }
//   ],

//   "payment": {
//     "detected": false,
//     "vendor": "",
//     "amount": null,
//     "currency": "INR"
//   },

//   "subscription": {
//     "isMarketing": false,
//     "unsubscribeUrl": null
//   },

//   "job": {
//     "detected": false,
//     "company": "",
//     "position": "",
//     "status": ""
//   },

//   "task": {
//     "detected": false,
//     "title": "",
//     "dueDate": null
//   }
// }

// Email:
// Subject: ${email.subject || ""}
// From: ${email.fromEmail || ""}
// Snippet: ${email.snippet || ""}
// Body:
// ${email.bodyText || ""}
// `;

const prompt = `
You are MailLens AI.

Your job is NOT to summarize like ChatGPT.

Your job is to extract structured knowledge from ONE email.

IMPORTANT RULES

- Return ONLY valid JSON.
- Never return markdown.
- Never explain your reasoning.
- Never invent facts.
- Never use outside knowledge.
- Extract ONLY information explicitly present in the email.
- If something is unknown, return null.
- If an array has no items return [].
- Never create empty objects.
- Never guess.

------------------------
SUMMARY RULES
------------------------

short_summary

- Maximum 40 words.
- Describe only the important information.
- Ignore greetings and signatures.

topic

Examples:
Interview Scheduling
Amazon Order
Bank Transaction
Invoice
Travel Booking
Security Alert
Newsletter
Meeting Invitation
Subscription Renewal

------------------------
IMPORTANCE
------------------------

critical
- Password reset
- Security alert
- Fraud
- Legal notice
- Account locked

high
- Payment
- Invoice
- Tax
- Interview
- Meeting
- Flight
- Hotel
- Deadline
- Banking
- OTP
- Work task

medium
- Personal conversation
- Project updates
- GitHub notifications
- Client discussions

low
- Marketing
- Promotions
- Blogs
- Product announcements
- Newsletters
- Social updates

------------------------
ACTION REQUIRED
------------------------

true only if the user must do something.

Examples

✓ Pay invoice
✓ Attend interview
✓ Join meeting
✓ Verify account

false

✗ Newsletter
✗ Marketing
✗ Product launch
✗ Blog

------------------------
MEMORY RULES
------------------------

A memory MUST satisfy ALL conditions.

1. Explicitly stated in THIS email.
2. Useful after 30 days.
3. Helps answer future user questions.
4. Is a fact.
5. Never marketing.
6. Never promotional text.
7. Never general company information.
8. Never hallucinate.

GOOD MEMORIES

Amazon order
Invoice
Flight booking
Hotel booking
Interview
Meeting
Subscription
Bill
Project assignment
Client information
Payment
Tax document
Purchase
Bank transaction

BAD MEMORIES

Discounts
Ads
Blog posts
Marketing slogans
Download app
Visit website
Privacy policy
Support information
General product features

If no memories exist

Return

[]

------------------------
PAYMENT
------------------------

Only detect if the email actually contains a payment or purchase.

Return

{
  "detected": true,
  "vendor": "...",
  "amount": number,
  "currency": "...",
  "status":"paid|pending|refunded"
}

Otherwise

{
  "detected": false
}

------------------------
JOB
------------------------

Only detect if this email is about

- Interview
- Offer
- Rejection
- Application
- Assessment

Otherwise

{
 "detected":false
}

------------------------
TASK
------------------------

Only create a task if the email clearly asks the user to perform an action.

Otherwise

{
 "detected":false
}

------------------------
SUBSCRIPTION
------------------------

Marketing means

newsletter
promotion
discount
sale
offer

Return

{
"isMarketing":true,
"unsubscribeUrl":"..."
}

Otherwise

{
"isMarketing":false
}

------------------------
OUTPUT JSON
------------------------

{
  "include_in_digest": true,
  "topic": "",
  "short_summary": "",
  "action_required": false,
  "action_item": null,
  "category": "",
  "importance": "",
  "ignore_email": false,
  "ignore_reason": null,

  "memories": [
    {
      "type": "",
      "category": "",
      "title": "",
      "value": "",
      "confidence": ""
    }
  ],

  "payment": {
    "detected": false,
    "vendor": null,
    "amount": null,
    "currency": null,
    "status": null
  },

  "subscription": {
    "isMarketing": false,
    "unsubscribeUrl": null
  },

  "job": {
    "detected": false,
    "company": null,
    "position": null,
    "status": null
  },

  "task": {
    "detected": false,
    "title": null,
    "dueDate": null
  }
}

EMAIL

Subject:
${email.subject}

From:
${email.fromEmail}

Snippet:
${email.snippet}

Body:
${email.bodyText} `;


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

  // return {
  //   shortSummary: parsed.short_summary || "",
  //   actionRequired: Boolean(parsed.action_required),
  //   actionItem: parsed.action_item || "",
  //   category: parsed.category || "updates",
  //   importance: ["low", "medium", "high"].includes(parsed.importance)
  //     ? parsed.importance
  //     : "low",
  //   includeInDigest:
  //     typeof parsed.include_in_digest === "boolean"
  //       ? parsed.include_in_digest
  //       : true,
  //   topic: parsed.topic || null,
  //   ignoreEmail: Boolean(parsed.ignore_email),
  //   ignoreReason: parsed.ignore_reason || null,
  // };

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
  
    memories: parsed.memories || [],
    payment: parsed.payment || null,
    subscription: parsed.subscription || null,
    job: parsed.job || null,
    task: parsed.task || null,
  
    rawExtraction: parsed
  };

  
};