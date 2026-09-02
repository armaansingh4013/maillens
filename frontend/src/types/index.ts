export interface UserSession {
  userId: string;
  email: string;
  name: string;
}

export interface EmailSummaryData {
  id?: string;
  shortSummary?: string;
  actionRequired?: boolean;
  actionItem?: string | null;
  category?: string | null;
  importance?: "low" | "medium" | "high" | "critical" | string | null;
  topic?: string | null;
  platform?: string | null;
  serviceType?: string | null;
  accountType?: string | null;
  amount?: string | null;
  dueDate?: string | null;
  tags?: string[];
  includeInDigest?: boolean;
  createdAt?: string;
}

export interface EmailMessage {
  id: string;
  gmailMessageId?: string;
  threadId?: string;
  from?: string;
  subject?: string;
  snippet?: string;
  body?: string;
  date?: string;
  internalDate?: string;
  createdAt?: string;
  isSummarized?: boolean;
  isEmbedded?: boolean;
  isIgnored?: boolean;
  sourceDomain?: string | null;
  syncSource?: string | null;
  summary?: EmailSummaryData | null;
}

export interface DigestData {
  digest?: {
    content?: string;
    digestDate?: string;
    createdAt?: string;
  };
}

export interface AskMatch {
  emailId?: string;
  fromEmail?: string;
  subject?: string;
  content?: string;
  internalDate?: string;
}

export interface AskResult {
  answer?: string;
  matches?: AskMatch[];
}

export interface ActionConfig {
  key: string;
  label: string;
  description: string;
  path: string;
  icon: string;
}

export interface InsightsSummary {
  totals: {
    totalEmails: number;
    summarizedEmails: number;
    ignoredEmails: number;
    adEmails: number;
    importantEmails: number;
    summarizedPct: number;
  };
  today: {
    received: number;
    ads: number;
    ignored: number;
    important: number;
  };
  breakdown: {
    byCategory: { key: string; count: number }[];
    byImportance: { key: string; count: number }[];
    byIgnoreReason: { key: string; count: number }[];
  };
  actionItems: { item: string; topic?: string | null; createdAt: string }[];
  spend: {
    currency: string;
    thisMonthTotal: number;
    totalAllTime: number;
    byVendor: { vendor: string; total: number }[];
    trend: { month: string; total: number }[];
  };
  subscriptions: {
    total: number;
    marketingCount: number;
    nonMarketingCount: number;
    top: {
      name: string;
      senderEmail: string;
      count: number;
      isMarketing: boolean;
      unsubscribeUrl?: string | null;
    }[];
  };
  tasks: {
    open: number;
    completed: number;
    upcoming: { title: string; dueDate: string }[];
  };
  jobs: {
    total: number;
    byStatus: { key: string; count: number }[];
  };
  memories: {
    total: number;
    byCategory: { key: string; count: number }[];
    recent: {
      title: string;
      value?: string | null;
      category?: string | null;
      memoryType?: string | null;
      createdAt: string;
    }[];
  };
  emailVolume: {
    date: string;
    label: string;
    total: number;
    ads: number;
    important: number;
  }[];
}

export type AsyncState<T> = {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string;
};
