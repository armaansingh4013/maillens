import cron from "node-cron";
import prisma from "../db/prisma.js";
import { getMessageIdsForSync } from "../services/gmailSyncService.js";




function extractEmailAddress(fromValue) {
    if (!fromValue) return null;
  
    const match = fromValue.match(/<([^>]+)>/);
    return match ? match[1] : fromValue.trim();
  }
  
  function extractDomain(fromValue) {
    const email = extractEmailAddress(fromValue);
    if (!email || !email.includes("@")) return null;
    return email.split("@")[1].toLowerCase();
  }





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

export const runEmailSyncForUser = async (userId) => {
  const { gmail, messageIds, mode } = await getMessageIdsForSync(userId);

  let latestHistoryId = null;

  for (const messageId of messageIds) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
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
      sourceDomain: extractDomain(getHeader(headers, "From")),
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
  }

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

  return {
    mode,
    savedCount: messageIds.length,
    latestHistoryId,
  };
};

export const startEmailSyncJob = () => {
  cron.schedule("*/10 * * * *", async () => {
    console.log("Running email sync job...");

    try {
      const users = await prisma.user.findMany({
        where: {
          syncState: {
            is: {
              initialBackfillCompleted: true,
            },
          },
        },
      });

      for (const user of users) {
        try {
          const result = await runEmailSyncForUser(user.id);
          console.log(`Synced user ${user.email}:`, result);
        } catch (error) {
          console.error(`Sync failed for user ${user.email}:`, error.message);
        }
      }

      console.log("Email sync job completed");
    } catch (error) {
      console.error("Email sync job failed:", error.message);
    }
  });
};