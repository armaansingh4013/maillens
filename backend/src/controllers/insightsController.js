import prisma from "../db/prisma.js";

const AD_REASONS = ["promotion", "newsletter"];
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function countBy(list, keyFn) {
  const out = {};
  for (const item of list) {
    const key = keyFn(item);
    if (key === null || key === undefined || key === "") continue;
    out[key] = (out[key] || 0) + 1;
  }
  return Object.entries(out)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export const getInsightsSummary = async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId is required" });
    }

    const [emails, summaries, payments, subscriptions, tasks, jobApplications, memories] =
      await Promise.all([
        prisma.email.findMany({
          where: { userId },
          select: {
            id: true,
            isSummarized: true,
            isIgnored: true,
            ignoreReason: true,
            internalDate: true,
            sourceDomain: true,
          },
        }),
        prisma.emailSummary.findMany({
          where: { email: { userId } },
          select: {
            category: true,
            importance: true,
            topic: true,
            actionRequired: true,
            actionItem: true,
            createdAt: true,
            email: { select: { internalDate: true, isIgnored: true } },
          },
        }),
        prisma.payment.findMany({
          where: { userId },
          select: { vendor: true, amount: true, currency: true, paidAt: true, createdAt: true },
        }),
        prisma.subscription.findMany({
          where: { userId },
          orderBy: { emailCount: "desc" },
        }),
        prisma.task.findMany({ where: { userId } }),
        prisma.jobApplication.findMany({ where: { userId } }),
        prisma.emailMemory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      ]);

    // ---- totals ----
    const totalEmails = emails.length;
    const summarizedEmails = emails.filter((e) => e.isSummarized).length;
    const ignoredEmails = emails.filter((e) => e.isIgnored).length;
    const adEmails = emails.filter((e) => AD_REASONS.includes(e.ignoreReason)).length;

    const totals = {
      totalEmails,
      summarizedEmails,
      ignoredEmails,
      adEmails,
      importantEmails: Math.max(totalEmails - ignoredEmails, 0),
      summarizedPct: totalEmails ? Math.round((summarizedEmails / totalEmails) * 100) : 0,
    };

    // ---- today ----
    const todayStart = startOfDay(new Date());
    const todaysEmails = emails.filter(
      (e) => e.internalDate && new Date(e.internalDate) >= todayStart
    );
    const todaysAds = todaysEmails.filter((e) => AD_REASONS.includes(e.ignoreReason)).length;
    const todaysIgnored = todaysEmails.filter((e) => e.isIgnored).length;

    const today = {
      received: todaysEmails.length,
      ads: todaysAds,
      ignored: todaysIgnored,
      important: Math.max(todaysEmails.length - todaysIgnored, 0),
    };

    // ---- breakdowns ----
    const byCategory = countBy(summaries, (s) => s.category).slice(0, 8);
    const byImportance = countBy(summaries, (s) => s.importance);
    const byIgnoreReason = countBy(emails.filter((e) => e.isIgnored), (e) => e.ignoreReason || "other");

    // ---- action items ----
    const actionItems = summaries
      .filter((s) => s.actionRequired && s.actionItem)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map((s) => ({ item: s.actionItem, topic: s.topic, createdAt: s.createdAt }));

    // ---- spend ----
    const now = new Date();
    const thisMonthKey = monthKey(now);
    let thisMonthTotal = 0;
    const byVendorMap = {};
    const byMonthMap = {};
    let currency = "INR";

    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      const when = p.paidAt || p.createdAt;
      const mKey = monthKey(when);
      currency = p.currency || currency;

      byMonthMap[mKey] = (byMonthMap[mKey] || 0) + amt;
      if (p.vendor) byVendorMap[p.vendor] = (byVendorMap[p.vendor] || 0) + amt;
      if (mKey === thisMonthKey) thisMonthTotal += amt;
    }

    // last 6 months trend, oldest -> newest
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      trend.push({ month: monthLabel(key), total: Math.round((byMonthMap[key] || 0) * 100) / 100 });
    }

    const byVendor = Object.entries(byVendorMap)
      .map(([vendor, total]) => ({ vendor, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const spend = {
      currency,
      thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
      totalAllTime: Math.round(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100) / 100,
      byVendor,
      trend,
    };

    // ---- subscriptions / linked accounts ----
    const marketingCount = subscriptions.filter((s) => s.isMarketing).length;
    const topAccounts = subscriptions.slice(0, 8).map((s) => ({
      name: s.senderDomain || s.senderEmail,
      senderEmail: s.senderEmail,
      count: s.emailCount,
      isMarketing: s.isMarketing,
      unsubscribeUrl: s.unsubscribeUrl,
    }));

    const subscriptionsSummary = {
      total: subscriptions.length,
      marketingCount,
      nonMarketingCount: subscriptions.length - marketingCount,
      top: topAccounts,
    };

    // ---- tasks ----
    const openTasks = tasks.filter((t) => t.status === "OPEN");
    const tasksSummary = {
      open: openTasks.length,
      completed: tasks.length - openTasks.length,
      upcoming: openTasks
        .filter((t) => t.dueDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5)
        .map((t) => ({ title: t.title, dueDate: t.dueDate })),
    };

    // ---- job applications ----
    const jobsSummary = {
      total: jobApplications.length,
      byStatus: countBy(jobApplications, (j) => j.status || "APPLIED"),
    };

    // ---- memories ----
    const memoriesSummary = {
      total: memories.length,
      byCategory: countBy(memories, (m) => m.category || "OTHER").slice(0, 8),
      recent: memories.slice(0, 10).map((m) => ({
        title: m.title,
        value: m.value,
        category: m.category,
        memoryType: m.memoryType,
        createdAt: m.createdAt,
      })),
    };

    // ---- email volume, last 7 days ----
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart.getTime() - i * DAY_MS);
      const dayEnd = new Date(dayStart.getTime() + DAY_MS);
      const dayEmails = emails.filter((e) => {
        if (!e.internalDate) return false;
        const t = new Date(e.internalDate).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      });
      days.push({
        date: dayStart.toISOString().slice(0, 10),
        label: dayStart.toLocaleDateString(undefined, { weekday: "short" }),
        total: dayEmails.length,
        ads: dayEmails.filter((e) => AD_REASONS.includes(e.ignoreReason)).length,
        important: dayEmails.filter((e) => !e.isIgnored).length,
      });
    }

    return res.json({
      ok: true,
      totals,
      today,
      breakdown: { byCategory, byImportance, byIgnoreReason },
      actionItems,
      spend,
      subscriptions: subscriptionsSummary,
      tasks: tasksSummary,
      jobs: jobsSummary,
      memories: memoriesSummary,
      emailVolume: days,
    });
  } catch (error) {
    console.error("Insights summary error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
