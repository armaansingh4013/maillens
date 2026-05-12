import prisma from "../db/prisma.js";
import { getGmailClient } from "../services/gmailService.js";
import { saveGmailMessage } from "../services/emailPersistenceService.js";

export const runInitialBackfillForUser = async (userId) => {
  const gmail = await getGmailClient(userId);

  const syncState = await prisma.gmailSyncState.upsert({
    where: { userId },
    update: {
      backfillStartedAt: new Date(),
    },
    create: {
      userId,
      backfillStartedAt: new Date(),
    },
  });

  let pageToken = syncState.backfillNextPageToken || undefined;
  let totalProcessed = syncState.backfillProcessedCount || 0;
  let latestHistoryId = syncState.lastHistoryId || null;
  let pagesProcessed = 0;

  do {
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 100,
      pageToken,
      labelIds: ["INBOX"],
    });

    const messages = response.data.messages || [];

    for (const msg of messages) {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
      });

      if (detail.data.historyId) {
        latestHistoryId = detail.data.historyId;
      }

      await saveGmailMessage({
        userId,
        detail,
        syncSource: "backfill",
      });

      totalProcessed += 1;
    }

    pageToken = response.data.nextPageToken || null;
    pagesProcessed += 1;

    await prisma.gmailSyncState.update({
      where: { userId },
      data: {
        backfillNextPageToken: pageToken,
        backfillProcessedCount: totalProcessed,
        lastHistoryId: latestHistoryId,
        lastSyncAt: new Date(),
      },
    });

    // Safety: one run processes limited pages, so server is not blocked forever
    if (pagesProcessed >= 5) {
      break;
    }
  } while (pageToken);

  const completed = !pageToken;

  if (completed) {
    await prisma.gmailSyncState.update({
      where: { userId },
      data: {
        initialBackfillCompleted: true,
        backfillCompletedAt: new Date(),
        backfillNextPageToken: null,
        lastHistoryId: latestHistoryId,
        lastSyncAt: new Date(),
      },
    });
  }

  return {
    completed,
    totalProcessed,
    nextPageToken: pageToken,
    latestHistoryId,
  };
};