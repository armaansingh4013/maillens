import type { ActionConfig } from "../types";

export const ACTION_CONFIG: ActionConfig[] = [
  {
    key: "sync",
    label: "Sync Gmail",
    description: "Pull latest Gmail messages into MailLens.",
    path: "/gmail/sync-now",
    icon: "⟳",
  },
  {
    key: "summarize",
    label: "Summarize Inbox",
    description: "Create AI summaries and filter low-value emails.",
    path: "/gmail/summarize-now",
    icon: "✦",
  },
  {
    key: "embed",
    label: "Embed Emails",
    description: "Generate searchable vector chunks for Q&A.",
    path: "/gmail/embed-now",
    icon: "⬡",
  },
  {
    key: "digest",
    label: "Build Digest",
    description: "Generate the daily digest from today's summaries.",
    path: "/digest/today",
    icon: "◈",
  },
  {
    key: "send-digest",
    label: "Send Evening Digest",
    description: "Email today's digest (received/ads/important) right now.",
    path: "/digest/send-now",
    icon: "✉",
  },
];
