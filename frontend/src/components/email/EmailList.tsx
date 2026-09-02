import { useState } from "react";
import type { EmailMessage } from "../../types";

interface Props {
  emails: EmailMessage[];
  selectedId: string | null;
  onSelect: (email: EmailMessage) => void;
  loading: boolean;
  onLoad: () => void;
}

const SOCIAL_DOMAINS = ["instagram.com", "linkedin.com", "twitter.com", "x.com", "facebook.com", "tiktok.com", "threads.net"];

type FilterKey = "all" | "important" | "receipts" | "social" | "unsummarized";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "important", label: "Important" },
  { key: "receipts", label: "Receipts" },
  { key: "social", label: "Social" },
  { key: "unsummarized", label: "Not summarized" },
];

function isReceiptLike(email: EmailMessage) {
  const t = `${email.summary?.category || ""} ${email.summary?.topic || ""}`.toLowerCase();
  return ["invoice", "receipt", "payment", "order", "bill", "transaction"].some((k) => t.includes(k));
}

function isSocialLike(email: EmailMessage) {
  const domain = (email.sourceDomain || "").toLowerCase();
  return SOCIAL_DOMAINS.some((d) => domain.includes(d));
}

function isImportant(email: EmailMessage) {
  const importance = (email.summary?.importance || "").toLowerCase();
  return importance === "high" || importance === "critical" || Boolean(email.summary?.actionRequired);
}

function matchesFilter(email: EmailMessage, filter: FilterKey) {
  switch (filter) {
    case "important": return isImportant(email);
    case "receipts": return isReceiptLike(email);
    case "social": return isSocialLike(email);
    case "unsummarized": return !email.isSummarized;
    default: return true;
  }
}

/** Single most relevant real tag for the row — no guessing, only fields the backend actually set. */
function realTag(email: EmailMessage): { label: string; style: string } | null {
  const importance = (email.summary?.importance || "").toLowerCase();
  if (importance === "critical" || importance === "high") {
    return { label: importance, style: "bg-rose/10 text-rose" };
  }
  if (isReceiptLike(email)) return { label: "receipt", style: "bg-emerald/10 text-emerald" };
  if (isSocialLike(email)) return { label: "social", style: "bg-teal/10 text-teal" };
  if (email.summary?.category) return { label: email.summary.category.toLowerCase(), style: "bg-amber/10 text-amber" };
  return null;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diff = Date.now() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function EmailList({ emails, selectedId, onSelect, loading, onLoad }: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const visible = emails.filter((e) => matchesFilter(e, filter));

  return (
    <div className="w-[300px] border-r border-border flex flex-col overflow-auto flex-shrink-0 md:w-[280px] h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 bg-navy sticky top-0">
        <span className="text-sm font-semibold">Inbox</span>
        <span className="text-[11px] text-text-3 font-mono">{visible.length} of {emails.length}</span>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 px-3 py-2.5 border-b border-border overflow-x-auto scrollbar-none flex-shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition-all ${
              filter === f.key
                ? "bg-teal/15 border-teal text-teal"
                : "border-border-2 text-text-2 hover:border-teal hover:text-text"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2.5 px-4 py-4 text-text-3 text-sm">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-border-2 border-t-teal animate-spin" />
          Loading emails…
        </div>
      )}

      {/* Empty */}
      {!loading && emails.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-3 text-sm p-6">
          <span className="text-4xl opacity-20">✉</span>
          <p>No emails loaded yet</p>
          <button onClick={onLoad} className="px-4 py-2 bg-teal text-white rounded-[10px] text-sm">Load emails</button>
        </div>
      )}

      {!loading && emails.length > 0 && visible.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-3 text-sm p-6">
          <span className="text-3xl opacity-20">⊘</span>
          <p>No emails match "{FILTERS.find((f) => f.key === filter)?.label}"</p>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {visible.map((email) => {
          const tag = realTag(email);
          const isSelected = selectedId === email.id;
          return (
            <div
              key={email.id}
              onClick={() => onSelect(email)}
              className={`px-4 py-3 border-b border-border cursor-pointer transition-colors relative ${
                isSelected ? "bg-teal/10" : "hover:bg-surface-2"
              }`}
            >
              {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal rounded-r" />}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12.5px] font-medium text-text flex-1 truncate">
                  {email.from?.split("<")[0].trim() || "Unknown"}
                </span>
                <span className="text-[10px] text-text-3 font-mono flex-shrink-0">{formatTime(email.date)}</span>
              </div>
              <div className="text-[12px] font-medium text-text-2 truncate mb-1">{email.subject || "No subject"}</div>
              <div className="text-[11.5px] text-text-3 truncate mb-2">
                {email.summary?.shortSummary || email.snippet || ""}
              </div>
              {tag && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${tag.style}`}>{tag.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
