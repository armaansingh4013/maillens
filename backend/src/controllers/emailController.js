import { processUnprocessedEmails } from "../services/processEmailService.js";
import prisma from "../db/prisma.js";

function toEmailResponse(email) {
  return {
    id: email.id,
    gmailMessageId: email.gmailMessageId,
    threadId: email.threadId,
    snippet: email.snippet,
    subject: email.subject,
    from: email.fromEmail,
    date: email.internalDate?.toISOString() || null,
    body: email.bodyText,
    internalDate: email.internalDate,
    createdAt: email.createdAt,
    isSummarized: email.isSummarized,
    isEmbedded: email.isEmbedded,
    isIgnored: email.isIgnored,
    sourceDomain: email.sourceDomain,
    syncSource: email.syncSource,
    summary: email.summary
      ? {
          id: email.summary.id,
          shortSummary: email.summary.shortSummary,
          actionRequired: email.summary.actionRequired,
          actionItem: email.summary.actionItem,
          category: email.summary.category,
          importance: email.summary.importance,
          topic: email.summary.topic,
          platform: email.summary.platform,
          serviceType: email.summary.serviceType,
          accountType: email.summary.accountType,
          amount: email.summary.amount,
          dueDate: email.summary.dueDate,
          tags: email.summary.tags,
          includeInDigest: email.summary.includeInDigest,
          createdAt: email.summary.createdAt,
        }
      : null,
  };
}

export async function getDbEmails(req, res) {
  try {
    const userId = req.query.userId;
    const limit = Math.min(
      Number(req.query.limit) || 50,
      100
    );
    const cursor = req.query.cursor;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "userId is required",
      });
    }

    const emails = await prisma.email.findMany({
      where: {
        userId,
        isIgnored: false,
      },
      include: {
        summary: true,
      },
      orderBy: [
        {
          internalDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: limit + 1,
      ...(cursor
        ? {
            cursor: {
              id: cursor,
            },
            skip: 1,
          }
        : {}),
    });

    const hasMore = emails.length > limit;
    const pageItems = hasMore
      ? emails.slice(0, limit)
      : emails;

    return res.json({
      ok: true,
      source: "database",
      count: pageItems.length,
      hasMore,
      nextCursor: hasMore
        ? pageItems[pageItems.length - 1]?.id
        : null,
      messages: pageItems.map(toEmailResponse),
    });
  } catch (error) {
    console.error("Fetch DB emails error:", error);

    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}


export async function processEmails(req, res) {

    try {
  
      const userId =
        req.body?.userId ||
        req.query?.userId ||
        req.params?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }
  
      await processUnprocessedEmails(userId);
  
      res.json({
  
        success: true,
  
        message: "Emails processed successfully",
  
      });
  
    } catch (error) {
  
      res.status(500).json({
  
        success: false,
  
        message: "Failed to process emails",
  
        error,
  
      });
  
    }
  
  }
