import prisma from "../db/prisma.js";
import { getGmailClient } from "./gmailService.js";

export const getMessageIdsForSync = async (userId) => {
  const gmail = await getGmailClient(userId);

  const syncState = await prisma.gmailSyncState.findUnique({
    where: { userId },
  });

  // First-time sync: fallback to full fetch
  if (!syncState?.lastHistoryId) {
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
    });

    return {
      mode: "full",
      gmail,
      messageIds: (response.data.messages || []).map((m) => m.id),
    };
  }

  try {
    const historyResponse = await gmail.users.history.list({
      userId: "me",
      startHistoryId: syncState.lastHistoryId,
      historyTypes: ["messageAdded"],
    });

    const history = historyResponse.data.history || [];

    const ids = new Set();

    for (const item of history) {
      for (const msg of item.messages || []) {
        if (msg.id) ids.add(msg.id);
      }
      for (const added of item.messagesAdded || []) {
        if (added.message?.id) ids.add(added.message.id);
      }
    }

    return {
      mode: "incremental",
      gmail,
      messageIds: [...ids],
    };
  } catch (error) {
    // If history ID is too old/invalid, do full sync fallback
    if (error?.response?.status === 404) {
      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10,
      });

      return {
        mode: "full_fallback",
        gmail,
        messageIds: (response.data.messages || []).map((m) => m.id),
      };
    }

    throw error;
  }
};