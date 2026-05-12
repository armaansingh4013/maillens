import prisma from "../db/prisma.js";
import {
  getHeader,
  extractBody,
  extractDomain,
} from "./gmailParseService.js";

export const saveGmailMessage = async ({
  userId,
  detail,
  syncSource = "incremental",
}) => {
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
    syncSource,
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
    body: bodyText,
    historyId: detail.data.historyId || null,
  };
};