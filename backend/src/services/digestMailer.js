import { sendEmail } from "./gmailSyncService.js";

/**
 * Sends the evening digest to an inbox. Defaults to the user mailing
 * themselves; set DIGEST_RECIPIENT_EMAIL in .env to route every digest
 * to a fixed address instead (useful for testing, or a shared inbox).
 */
export async function sendDigestEmail({ user, digestContent, stats }) {
  const to = process.env.DIGEST_RECIPIENT_EMAIL || user.email;

  if (!to) {
    return { sent: false, reason: "no recipient email available" };
  }

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const subject = `MailLens Daily Digest — ${stats.received} received, ${stats.ads} ads (${dateLabel})`;

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="margin-bottom: 4px;">MailLens Daily Digest</h2>
      <p style="color: #666; margin-top: 0;">${dateLabel}</p>
      <p>
        You received <b>${stats.received}</b> email${stats.received === 1 ? "" : "s"} today.
        Of those, <b>${stats.ads}</b> were ads or promotions and
        <b>${stats.important}</b> were important.
      </p>
      <pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 13px; background: #f5f5f7; border-radius: 8px; padding: 16px; line-height: 1.5;">${digestContent}</pre>
      <p style="color: #999; font-size: 12px;">Sent automatically by MailLens.</p>
    </div>
  `;

  try {
    await sendEmail({ userId: user.id, to, subject, body });
    return { sent: true, to };
  } catch (error) {
    console.error(`Failed to send digest email to ${to}:`, error.message);
    return { sent: false, reason: error.message };
  }
}
