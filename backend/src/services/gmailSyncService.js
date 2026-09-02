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
      const addedMessages = item.messagesAdded || [];

      for (const added of addedMessages) {
        if (added.message?.id) ids.add(added.message.id);
      }

      if (!addedMessages.length) {
        for (const msg of item.messages || []) {
          if (msg.id) ids.add(msg.id);
        }
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










/**
 * Convert MIME message to Gmail Base64URL format
 */
const encodeMessage = (message) => {
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Send New Email
 */
export const sendEmail = async ({
  userId,
  to,
  cc = "",
  bcc = "",
  subject,
  body,
}) => {
  const gmail = await getGmailClient(userId);

  const message = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : "",
    bcc ? `Bcc: ${bcc}` : "",
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    body,
  ]
    .filter(Boolean)
    .join("\r\n");

  const raw = encodeMessage(message);

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
    },
  });

  return response.data;
};

/**
 * Reply
 */
export const replyEmail = async ({
  userId,
  threadId,
  messageId,
  to,
  subject,
  body,
}) => {
  const gmail = await getGmailClient(userId);

  const message = [
    `To: ${to}`,
    `Subject: Re: ${subject}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  const raw = encodeMessage(message);

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      threadId,
      raw,
    },
  });

  return response.data;
};

/**
 * Reply All
 */
export const replyAllEmail = async ({
  userId,
  threadId,
  messageId,
  to,
  cc = "",
  subject,
  body,
}) => {
  const gmail = await getGmailClient(userId);

  const message = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : "",
    `Subject: Re: ${subject}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    body,
  ]
    .filter(Boolean)
    .join("\r\n");

  const raw = encodeMessage(message);

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      threadId,
      raw,
    },
  });

  return response.data;
};

/**
 * Forward Email
 */
export const forwardEmail = async ({
  userId,
  to,
  subject,
  originalBody,
  comment = "",
}) => {
  const gmail = await getGmailClient(userId);

  const message = [
    `To: ${to}`,
    `Subject: Fwd: ${subject}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    `
      ${comment}

      <br><br>
      ---------- Forwarded message ----------<br>
      ${originalBody}
    `,
  ].join("\r\n");

  const raw = encodeMessage(message);

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
    },
  });

  return response.data;
};

/**
 * Save Draft
 */
export const createDraft = async ({
  userId,
  to,
  cc = "",
  bcc = "",
  subject,
  body,
}) => {
  const gmail = await getGmailClient(userId);

  const message = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : "",
    bcc ? `Bcc: ${bcc}` : "",
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    body,
  ]
    .filter(Boolean)
    .join("\r\n");

  const raw = encodeMessage(message);

  const response = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw,
      },
    },
  });

  return response.data;
};

/**
 * Send Existing Draft
 */
export const sendDraft = async ({
  userId,
  draftId,
}) => {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.drafts.send({
    userId: "me",
    requestBody: {
      id: draftId,
    },
  });

  return response.data;
};

/**
 * Delete Draft
 */
export const deleteDraft = async ({
  userId,
  draftId,
}) => {
  const gmail = await getGmailClient(userId);

  await gmail.users.drafts.delete({
    userId: "me",
    id: draftId,
  });

  return {
    success: true,
  };
};

/**
 * Archive — remove from INBOX without deleting
 */
export const archiveEmail = async ({ userId, gmailMessageId }) => {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.messages.modify({
    userId: "me",
    id: gmailMessageId,
    requestBody: {
      removeLabelIds: ["INBOX"],
    },
  });

  return response.data;
};

/**
 * Move to Trash
 */
export const trashEmail = async ({ userId, gmailMessageId }) => {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.messages.trash({
    userId: "me",
    id: gmailMessageId,
  });

  return response.data;
};