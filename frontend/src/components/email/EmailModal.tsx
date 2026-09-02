import { useEffect, useState } from "react";
import { request } from "../../lib/api";

export type ComposeMode = "new" | "reply" | "forward";

export interface ComposeContext {
  threadId?: string;
  messageId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSent?: () => void;
  mode?: ComposeMode;
  context?: ComposeContext;
  initial?: Partial<EmailState>;
}

interface EmailState {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

const EMPTY: EmailState = { to: "", cc: "", bcc: "", subject: "", body: "" };

const MODE_LABELS: Record<ComposeMode, string> = {
  new: "New message",
  reply: "Reply",
  forward: "Forward",
};

const MODE_ENDPOINTS: Record<ComposeMode, string> = {
  new: "/gmail/send",
  reply: "/gmail/reply",
  forward: "/gmail/forward",
};

function isValidEmailList(value: string): boolean {
  if (!value.trim()) return true;
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return parts.every((p) => re.test(p));
}

export function EmailModal({ isOpen, onClose, userId, onSent, mode = "new", context, initial }: Props) {
  const [form, setForm] = useState<EmailState>(EMPTY);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY, ...initial });
      setShowCcBcc(false);
      setError("");
      setSent(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function update<K extends keyof EmailState>(key: K, value: EmailState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  }

  async function handleSend() {
    if (!form.to.trim()) return setError("Add at least one recipient in To.");
    if (!isValidEmailList(form.to)) return setError("To contains an invalid email address.");
    if (!isValidEmailList(form.cc)) return setError("Cc contains an invalid email address.");
    if (!isValidEmailList(form.bcc)) return setError("Bcc contains an invalid email address.");
    if (mode !== "forward" && !form.subject.trim()) return setError("Add a subject line.");
    if (mode === "reply" && !context?.threadId) return setError("Missing thread to reply to.");

    setSending(true);
    setError("");
    try {
      const to = form.to.split(",").map((s) => s.trim()).filter(Boolean);

      const payload =
        mode === "new"
          ? {
              userId,
              to,
              cc: form.cc.split(",").map((s) => s.trim()).filter(Boolean),
              bcc: form.bcc.split(",").map((s) => s.trim()).filter(Boolean),
              subject: form.subject,
              body: form.body,
            }
          : mode === "reply"
          ? {
              userId,
              threadId: context?.threadId,
              messageId: context?.messageId,
              to,
              subject: form.subject,
              body: form.body,
            }
          : {
              userId,
              to,
              subject: form.subject,
              originalBody: initial?.body || "",
              comment: form.body,
            };

      await request(MODE_ENDPOINTS[mode], {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSent(true);
      onSent?.();
      setTimeout(onClose, 900);
    } catch (e: any) {
      setError(e.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease]" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[88vh] bg-surface border border-border-2 rounded-[20px] shadow-lg flex flex-col overflow-hidden animate-[modalIn_0.18s_ease]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-teal text-sm">✎</span>
            <span className="text-[13px] font-semibold">{MODE_LABELS[mode]}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[8px] grid place-items-center text-text-2 hover:bg-surface-2 hover:text-text transition-colors text-base"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-0">
          <div className="flex items-center border-b border-border py-2.5">
            <label className="text-[12px] text-text-3 w-12 flex-shrink-0">To</label>
            <input
              type="text"
              value={form.to}
              onChange={(e) => update("to", e.target.value)}
              placeholder="recipient@example.com, another@example.com"
              className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-3 outline-none"
            />
            {mode === "new" && !showCcBcc && (
              <button
                onClick={() => setShowCcBcc(true)}
                className="text-[11px] text-text-3 hover:text-teal transition-colors flex-shrink-0 ml-2"
              >
                Cc/Bcc
              </button>
            )}
          </div>

          {mode === "new" && showCcBcc && (
            <>
              <div className="flex items-center border-b border-border py-2.5">
                <label className="text-[12px] text-text-3 w-12 flex-shrink-0">Cc</label>
                <input
                  type="text"
                  value={form.cc}
                  onChange={(e) => update("cc", e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-3 outline-none"
                />
              </div>
              <div className="flex items-center border-b border-border py-2.5">
                <label className="text-[12px] text-text-3 w-12 flex-shrink-0">Bcc</label>
                <input
                  type="text"
                  value={form.bcc}
                  onChange={(e) => update("bcc", e.target.value)}
                  placeholder="bcc@example.com"
                  className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-3 outline-none"
                />
              </div>
            </>
          )}

          <div className="flex items-center border-b border-border py-2.5">
            <label className="text-[12px] text-text-3 w-12 flex-shrink-0">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              placeholder="Email subject"
              className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-3 outline-none"
            />
          </div>

          <textarea
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            placeholder={mode === "forward" ? "Add a comment (optional)…" : "Write your message…"}
            rows={10}
            className="flex-1 bg-transparent text-[13px] text-text-2 placeholder:text-text-3 outline-none resize-none py-4 leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border flex-shrink-0">
          <div className="text-[12px]">
            {error && <span className="text-rose">{error}</span>}
            {sent && <span className="text-emerald">✓ Sent successfully</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-[12.5px] font-medium text-text-2 hover:bg-surface-2 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSend}
              disabled={sending || sent}
              className="px-5 py-2 rounded-[8px] bg-teal text-white text-[12.5px] font-medium hover:bg-teal-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {sending ? "Sending…" : sent ? "Sent ✓" : "Send →"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
