import { request } from "../api/client";

export const MailService = {
  health() {
    return request("/");
  },

  getEmails(userId: string) {
    return request(
      `/gmail/emails?userId=${encodeURIComponent(userId)}`
    );
  },

  getDigest(userId: string) {
    return request(
      `/digest/today?userId=${encodeURIComponent(userId)}`
    );
  },

  sync(userId: string) {
    return request(
      `/gmail/sync-now?userId=${encodeURIComponent(userId)}`
    );
  },

  summarize(userId: string) {
    return request(
      `/gmail/summarize-now?userId=${encodeURIComponent(userId)}`
    );
  },

  embed(userId: string) {
    return request(
      `/gmail/embed-now?userId=${encodeURIComponent(userId)}`
    );
  },

  buildDigest(userId: string) {
    return request(
      `/digest/today?userId=${encodeURIComponent(userId)}`
    );
  },

  ask(userId: string, question: string) {
    return request("/ask", {
      method: "POST",
      body: JSON.stringify({
        userId,
        question,
      }),
    });
  },
};