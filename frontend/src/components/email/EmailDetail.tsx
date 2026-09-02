import { useState } from "react";
import type { EmailMessage } from "../../types";
import { AiSummaryCard } from "../ai/AiSummaryCard";

interface Props {
  email: EmailMessage | null;
  onBack?: () => void;
  onReply?: (email: EmailMessage) => void;
  onForward?: (email: EmailMessage) => void;
  onArchive?: (email: EmailMessage) => Promise<void>;
  onDelete?: (email: EmailMessage) => Promise<void>;
}

function formatDate(v?: string) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
function senderName(from?: string) {
  if (!from) return "Unknown";
  const m = from.match(/^([^<]+)</);
  return m ? m[1].trim() : from;
}
function senderEmail(from?: string) {
  if (!from) return "";
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from;
}

export function EmailDetail({ email, onBack, onReply, onForward, onArchive, onDelete }: Props) {
  const [busy, setBusy] = useState<"archive" | "delete" | null>(null);
  const [actionError, setActionError] = useState("");

  if (!email) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-3 gap-3">
        <span className="text-5xl opacity-20">✉</span>
        <p className="text-sm">Select an email to read</p>
      </div>
    );
  }

  const initial = senderName(email.from)[0]?.toUpperCase() || "?";
  const canGmailAction = Boolean(email.gmailMessageId);

  async function run(action: "archive" | "delete") {
    if (!email) return;
    setActionError("");
    setBusy(action);
    try {
      if (action === "archive") await onArchive?.(email);
      else await onDelete?.(email);
    } catch (e: any) {
      setActionError(e.message || `Failed to ${action}.`);
    } finally {
      setBusy(null);
    }
  }

  const buttons = [
    { key: "reply", label: "↩ Reply", primary: true, onClick: () => onReply?.(email), disabled: false },
    { key: "forward", label: "↪ Forward", primary: false, onClick: () => onForward?.(email), disabled: false },
    { key: "archive", label: busy === "archive" ? "Archiving…" : "⊘ Archive", primary: false, onClick: () => run("archive"), disabled: !canGmailAction || busy !== null },
    { key: "delete", label: busy === "delete" ? "Deleting…" : "⊗ Delete", primary: false, onClick: () => run("delete"), disabled: !canGmailAction || busy !== null },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] px-8 py-7">
        {/* Mobile back */}
        {onBack && (
          <button onClick={onBack} className="text-teal text-sm mb-4 md:hidden">← Back</button>
        )}

        {/* Subject */}
        <h1 className="text-xl font-semibold tracking-tight leading-snug mb-4">{email.subject || "No subject"}</h1>

        {/* Meta */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal to-cyan grid place-items-center text-[13px] font-semibold flex-shrink-0">
              {initial}
            </div>
            <div>
              <div className="text-[13px] font-medium">{senderName(email.from)}</div>
              <div className="text-[11px] text-text-3">{senderEmail(email.from)}</div>
            </div>
          </div>
          <span className="text-[11px] text-text-3 font-mono">{formatDate(email.date)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap mb-2">
          {buttons.map((btn) => (
            <button
              key={btn.key}
              onClick={btn.onClick}
              disabled={btn.disabled}
              title={!canGmailAction && btn.key !== "reply" && btn.key !== "forward" ? "This email hasn't been synced with a Gmail message id yet" : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium border transition-all hover:-translate-y-px disabled:opacity-40 disabled:hover:-translate-y-0 disabled:cursor-not-allowed ${
                btn.primary
                  ? "bg-teal border-teal text-white hover:bg-teal-dark"
                  : "bg-surface-2 border-border-2 text-text-2 hover:bg-surface-3 hover:text-text"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        {actionError && <p className="text-[11.5px] text-rose mb-4">{actionError}</p>}
        {!actionError && <div className="mb-6" />}

        {/* AI Card */}
        <AiSummaryCard email={email} />

        {/* Body */}
        {email.body ? (
          <iframe
            srcDoc={email.body}
            title="Email content"
            sandbox=""
            style={{ width: "100%", height: "600px", border: "none", backgroundColor: "white", borderRadius: "10px" }}
          />
        ) : (
          <p className="text-[13.5px] text-text-3 leading-[1.8] pt-5 border-t border-border">
            {email.snippet || "No content available."}
          </p>
        )}
      </div>
    </div>
  );
}
