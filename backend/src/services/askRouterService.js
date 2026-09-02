import prisma from "../db/prisma.js";

const MONEY_KEYWORDS = ["spend", "spent", "paid", "payment", "cost", "expense", "expenses", "bill", "bills"];
const ACCOUNT_KEYWORDS = [
  "linked account",
  "linked accounts",
  "social media",
  "social account",
  "subscription",
  "subscriptions",
  "subscribed",
  "how many accounts",
  "how many platforms",
  "how many services",
];
const TASK_KEYWORDS = ["task", "tasks", "to-do", "to do", "todo", "pending", "due date", "due"];
const JOB_KEYWORDS = ["job application", "job applications", "interview", "applied for", "job offer", "rejection"];

// "Summarize my whole inbox" has no single email it's semantically similar
// to, so vector search over chunks legitimately finds nothing for it. This
// needs a two-part match (an action word + a "the whole thing" word) rather
// than a single keyword like "summarize", which would also swallow specific
// requests like "summarize the invoice email from Amazon" that should still
// go to semantic search.
const OVERVIEW_ACTION_WORDS = ["summar", "overview", "recap", "digest"];
const OVERVIEW_SCOPE_WORDS = ["inbox", "email box", "emailbox", "emails", "everything", "whole", "entire", "mailbox", "all my"];

function isOverviewQuestion(q) {
  return OVERVIEW_ACTION_WORDS.some((a) => q.includes(a)) && OVERVIEW_SCOPE_WORDS.some((s) => q.includes(s));
}

/**
 * Cheap keyword classifier — good enough to route obviously-structured
 * questions (spend, subscriptions, tasks, jobs, whole-inbox overviews) to
 * direct DB queries instead of paying for an LLM call and hoping it can
 * either add numbers correctly from retrieved text chunks, or find chunks
 * at all for a question with no specific semantic match. Anything else
 * falls through to semantic search over email content + memory facts.
 */
export function classifyIntent(question = "") {
  const q = question.toLowerCase();

  if (isOverviewQuestion(q)) return "overview";
  if (MONEY_KEYWORDS.some((k) => q.includes(k))) return "spend";
  if (ACCOUNT_KEYWORDS.some((k) => q.includes(k))) return "accounts";
  if (TASK_KEYWORDS.some((k) => q.includes(k))) return "tasks";
  if (JOB_KEYWORDS.some((k) => q.includes(k))) return "jobs";
  return "semantic";
}

export function detectMonthRange(question = "") {
  const q = question.toLowerCase();
  const now = new Date();

  if (q.includes("this month")) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end, label: "this month" };
  }

  if (q.includes("last month")) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end, label: "last month" };
  }

  return null;
}

/** Pure formatter — kept separate so it can be unit tested without a DB. */
export function formatSpendAnswer(payments, range) {
  const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const currency = payments[0]?.currency || "INR";

  const byVendor = {};
  for (const p of payments) {
    if (!p.vendor) continue;
    byVendor[p.vendor] = (byVendor[p.vendor] || 0) + (Number(p.amount) || 0);
  }

  const vendorLines = Object.entries(byVendor)
    .sort((a, b) => b[1] - a[1])
    .map(([vendor, amt]) => `${vendor}: ${currency} ${amt.toFixed(2)}`);

  const scopeLabel = range ? range.label : "on record";

  if (!payments.length) {
    return `I couldn't find any recorded payments ${scopeLabel}.`;
  }

  return `You spent ${currency} ${total.toFixed(2)} ${scopeLabel} across ${payments.length} payment${
    payments.length === 1 ? "" : "s"
  }.${vendorLines.length ? "\n\n" + vendorLines.join("\n") : ""}`;
}

export async function answerSpend({ userId, question }) {
  const range = detectMonthRange(question);

  const payments = await prisma.payment.findMany({
    where: {
      userId,
      ...(range ? { paidAt: { gte: range.start, lt: range.end } } : {}),
    },
  });

  return { answer: formatSpendAnswer(payments, range), matches: payments };
}

export function formatAccountsAnswer(subscriptions) {
  if (!subscriptions.length) {
    return "I couldn't find any linked accounts or subscriptions yet — run the summarize job first.";
  }

  const marketing = subscriptions.filter((s) => s.isMarketing).length;
  const list = subscriptions
    .slice(0, 10)
    .map((s) => `${s.senderDomain || s.senderEmail} (${s.emailCount} email${s.emailCount === 1 ? "" : "s"})`);

  return `This inbox is linked to ${subscriptions.length} account${
    subscriptions.length === 1 ? "" : "s"
  }/services — ${marketing} of them marketing or newsletter senders.\n\nTop ones:\n${list.join("\n")}`;
}

export async function answerAccounts({ userId }) {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { emailCount: "desc" },
  });

  return { answer: formatAccountsAnswer(subscriptions), matches: subscriptions };
}

export function formatTasksAnswer(tasks) {
  if (!tasks.length) {
    return "No tasks have been extracted from your emails yet.";
  }

  const open = tasks.filter((t) => t.status === "OPEN");
  const lines = open
    .slice(0, 10)
    .map((t) => `- ${t.title}${t.dueDate ? ` (due ${new Date(t.dueDate).toLocaleDateString()})` : ""}`);

  return `You have ${open.length} open task${open.length === 1 ? "" : "s"} out of ${tasks.length} total.${
    lines.length ? "\n\n" + lines.join("\n") : ""
  }`;
}

export async function answerTasks({ userId }) {
  const tasks = await prisma.task.findMany({ where: { userId } });
  return { answer: formatTasksAnswer(tasks), matches: tasks };
}

export function formatJobsAnswer(jobs) {
  if (!jobs.length) {
    return "No job applications have been detected in your inbox yet.";
  }

  const lines = jobs.slice(0, 10).map((j) => `- ${j.company}${j.position ? ` (${j.position})` : ""}: ${j.status}`);

  return `You have ${jobs.length} job application${jobs.length === 1 ? "" : "s"} tracked.\n\n${lines.join("\n")}`;
}

export async function answerJobs({ userId }) {
  const jobs = await prisma.jobApplication.findMany({ where: { userId } });
  return { answer: formatJobsAnswer(jobs), matches: jobs };
}

function topCounts(list, keyFn, limit = 6) {
  const counts = {};
  for (const item of list) {
    const key = keyFn(item);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Pure formatter — kept separate so it can be unit tested without a DB. */
export function formatOverviewAnswer({ totalEmails, summarizedEmails, topTopics, importanceCounts, actionItems }) {
  if (!totalEmails) {
    return "Your inbox is empty, or nothing has synced yet — try running Sync Gmail first.";
  }

  const lines = [
    `Your inbox has ${totalEmails} email${totalEmails === 1 ? "" : "s"}${
      summarizedEmails ? `, ${summarizedEmails} of them AI-summarized` : " — none summarized yet, run Summarize Inbox for a fuller answer"
    }.`,
  ];

  if (topTopics.length) {
    lines.push(`\nMost common topics:\n${topTopics.map((t) => `- ${t.key} (${t.count})`).join("\n")}`);
  }

  const urgentCount =
    (importanceCounts.find((i) => i.key === "critical")?.count || 0) +
    (importanceCounts.find((i) => i.key === "high")?.count || 0);
  if (urgentCount) {
    lines.push(`\n${urgentCount} email${urgentCount === 1 ? " is" : "s are"} marked high priority or critical.`);
  }

  lines.push(
    actionItems.length
      ? `\nThings that need your attention:\n${actionItems.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
      : "\nNothing flagged as needing action right now."
  );

  return lines.join("\n");
}

export async function answerOverview({ userId }) {
  const [totalEmails, summaries] = await Promise.all([
    prisma.email.count({ where: { userId, isIgnored: false } }),
    prisma.emailSummary.findMany({
      where: { email: { userId, isIgnored: false } },
      include: { email: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const topTopics = topCounts(summaries, (s) => s.topic || s.category);
  const importanceCounts = topCounts(summaries, (s) => s.importance);
  const actionItems = summaries
    .filter((s) => s.actionRequired && s.actionItem)
    .slice(0, 8)
    .map((s) => s.actionItem);

  const answer = formatOverviewAnswer({
    totalEmails,
    summarizedEmails: summaries.length,
    topTopics,
    importanceCounts,
    actionItems,
  });

  return { answer, matches: summaries.slice(0, 10) };
}

export async function routeStructuredQuestion({ userId, question }) {
  const intent = classifyIntent(question);

  if (intent === "overview") return { intent, ...(await answerOverview({ userId })) };
  if (intent === "spend") return { intent, ...(await answerSpend({ userId, question })) };
  if (intent === "accounts") return { intent, ...(await answerAccounts({ userId })) };
  if (intent === "tasks") return { intent, ...(await answerTasks({ userId })) };
  if (intent === "jobs") return { intent, ...(await answerJobs({ userId })) };

  return { intent: "semantic" };
}
