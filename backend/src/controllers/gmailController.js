import { getGmailClient } from "../services/gmailService.js";
import prisma from "../db/prisma.js";
import { summarizeEmail } from "../services/summarizerService.js";
import {
  getMessageIdsForSync,
  sendEmail,
  replyEmail,
  forwardEmail,
  archiveEmail,
  trashEmail,
} from "../services/gmailSyncService.js";
import { runEmailSyncForUser } from "../jobs/syncEmailsJob.js";
import { runSummarizeForUser } from "../jobs/summarizeEmailsJob.js";
import { runEmbeddingForUser } from "../jobs/embedEmailsJob.js";

function toRecipientString(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value || "";
}


export const summarizeNow = async (req, res) => {
    try {
      const userId = req.query.userId;
  
      if (!userId) {
        return res.status(400).json({
          ok: false,
          error: "userId is required",
        });
      }
  
      const result = await runSummarizeForUser(userId);
  
      return res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      console.error("Manual summarize error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  };


  


export const syncNow = async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "userId is required",
      });
    }

    const result = await runEmailSyncForUser(userId);

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("Manual sync error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
};





export const testSummarize = async (req, res) => {
    try {
      const email = await prisma.email.findFirst({
        orderBy: { createdAt: "desc" },
      });
  
      if (!email) {
        return res.json({ ok: false, message: "No email found" });
      }
  
      const summaryData = await summarizeEmail(email);
  
      const savedSummary = await prisma.emailSummary.upsert({
        where: {
          emailId: email.id,
        },
        update: summaryData,
        create: {
          emailId: email.id,
          ...summaryData,
        },
      });
  
      return res.json({
        ok: true,
        emailId: email.id,
        summary: savedSummary,
      });
    } catch (error) {
      console.error("Summarize error:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  };



  
function getHeader(headers, name) {
  return (
    headers?.find(
      (header) => header.name.toLowerCase() === name.toLowerCase()
    )?.value || null
  );
}

function decodeBase64Url(data) {
  if (!data) return null;

  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function extractBody(payload) {
  if (!payload) return null;

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return null;
}

function isNotFoundError(error) {
  return error?.code === 404 || error?.response?.status === 404;
}

export const getEmails = async (req, res) => {
    try {
      const userId = req.query.userId;
  
      if (!userId) {
        return res.status(400).json({
          ok: false,
          error: "userId is required",
        });
      }
  
      const { gmail, messageIds, mode } = await getMessageIdsForSync(userId);
  
      let latestHistoryId = null;
  
      const messageResults = await Promise.all(
        messageIds.map(async (messageId) => {
          try {
            const detail = await gmail.users.messages.get({
              userId: "me",
              id: messageId,
              format: "full",
            });
            if (detail.data.historyId) {
              latestHistoryId = detail.data.historyId;
            }
  
            const payload = detail.data.payload;
            const headers = payload?.headers || [];
            const bodyText = extractBody(payload);
  
            const emailData = {
              userId,
              gmailMessageId: detail.data.id,
              threadId: detail.data.threadId || null,
              snippet: detail.data.snippet || null,
              subject: getHeader(headers, "Subject"),
              fromEmail: getHeader(headers, "From"),
              bodyText,
              internalDate: detail.data.internalDate
                ? new Date(Number(detail.data.internalDate))
                : null,
            };
  
            await prisma.email.upsert({
              where: {
                gmailMessageId: detail.data.id,
              },
              update: emailData,
              create: emailData,
            });
  
            return {
              id: detail.data.id,
              threadId: detail.data.threadId,
              snippet: detail.data.snippet || null,
              subject: emailData.subject,
              from: emailData.fromEmail,
              date: getHeader(headers, "Date"),
              body: bodyText,
              historyId: detail.data.historyId || null,
            };
          } catch (error) {
            if (isNotFoundError(error)) {
              console.warn(
                `Skipping Gmail message ${messageId}: not found`
              );

              return null;
            }

            throw error;
          }
        })
      );

      const detailedMessages = messageResults.filter(Boolean);
  
      if (latestHistoryId) {
        await prisma.gmailSyncState.upsert({
          where: { userId },
          update: {
            lastHistoryId: latestHistoryId,
            lastSyncAt: new Date(),
          },
          create: {
            userId,
            lastHistoryId: latestHistoryId,
            lastSyncAt: new Date(),
          },
        });
      }
  
      return res.json({
        ok: true,
        mode,
        savedCount: detailedMessages.length,
        latestHistoryId,
        messages: detailedMessages,
      });
    } catch (error) {
      console.error("Fetch emails error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  };


  export const embedNow = async (req, res) => {
    try {
      const userId = req.query.userId;
  
      if (!userId) {
        return res.status(400).json({
          ok: false,
          error: "userId is required",
        });
      }
  
      const result = await runEmbeddingForUser(userId);
  
      return res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      console.error("Manual embed error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  };

export const sendEmailNow = async (req, res) => {
  try {
    const { userId, to, cc, bcc, subject, body } = req.body || {};

    if (!userId || !to || !subject) {
      return res.status(400).json({ ok: false, error: "userId, to and subject are required" });
    }

    const result = await sendEmail({
      userId,
      to: toRecipientString(to),
      cc: toRecipientString(cc),
      bcc: toRecipientString(bcc),
      subject,
      body: body || "",
    });

    return res.json({ ok: true, result });
  } catch (error) {
    console.error("Send email error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

export const replyEmailNow = async (req, res) => {
  try {
    const { userId, threadId, messageId, to, subject, body } = req.body || {};

    if (!userId || !to || !threadId) {
      return res.status(400).json({ ok: false, error: "userId, threadId and to are required" });
    }

    const result = await replyEmail({
      userId,
      threadId,
      messageId,
      to: toRecipientString(to),
      subject: subject || "",
      body: body || "",
    });

    return res.json({ ok: true, result });
  } catch (error) {
    console.error("Reply email error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

export const forwardEmailNow = async (req, res) => {
  try {
    const { userId, to, subject, originalBody, comment } = req.body || {};

    if (!userId || !to) {
      return res.status(400).json({ ok: false, error: "userId and to are required" });
    }

    const result = await forwardEmail({
      userId,
      to: toRecipientString(to),
      subject: subject || "",
      originalBody: originalBody || "",
      comment: comment || "",
    });

    return res.json({ ok: true, result });
  } catch (error) {
    console.error("Forward email error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

export const archiveEmailNow = async (req, res) => {
  try {
    const { userId, gmailMessageId } = req.body || {};

    if (!userId || !gmailMessageId) {
      return res.status(400).json({ ok: false, error: "userId and gmailMessageId are required" });
    }

    const result = await archiveEmail({ userId, gmailMessageId });

    // Reflect it locally too, so /emails/db (which filters isIgnored:false)
    // stops showing this email without waiting for the next Gmail sync.
    await prisma.email.updateMany({
      where: { gmailMessageId, userId },
      data: { isIgnored: true, ignoreReason: "archived" },
    });

    return res.json({ ok: true, result });
  } catch (error) {
    console.error("Archive email error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

export const trashEmailNow = async (req, res) => {
  try {
    const { userId, gmailMessageId } = req.body || {};

    if (!userId || !gmailMessageId) {
      return res.status(400).json({ ok: false, error: "userId and gmailMessageId are required" });
    }

    const result = await trashEmail({ userId, gmailMessageId });

    await prisma.email.updateMany({
      where: { gmailMessageId, userId },
      data: { isIgnored: true, ignoreReason: "deleted" },
    });

    return res.json({ ok: true, result });
  } catch (error) {
    console.error("Trash email error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
