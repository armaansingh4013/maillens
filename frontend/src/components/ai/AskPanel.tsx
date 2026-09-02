import { useState, useRef, useEffect } from "react";
import { request } from "../../lib/api";

interface Message { role: "user" | "ai"; text: string; }
interface Props { userId: string; }

const SUGGESTIONS = [
  "Which websites am I registered on?",
  "Show all payment receipts this month",
  "Any security alerts in my inbox?",
  "Summarize today's important emails",
];

export function AskPanel({ userId }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi! I have full context of your emails. Ask me anything — payments, accounts, people, or anything you're looking for." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const q = text.trim();
    setInput("");
    setMessages((p) => [...p, { role: "user", text: q }]);
    setLoading(true);
    try {
      const data: any = await request("/ask", {
        method: "POST",
        body: JSON.stringify({ userId, question: q }),
      });
      setMessages((p) => [...p, { role: "ai", text: data?.answer || "No answer found." }]);
    } catch (e: any) {
      setMessages((p) => [...p, { role: "ai", text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full w-full border-l border-border bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border flex-shrink-0">
        <span className="text-teal text-sm">✦</span>
        <span className="text-[13px] font-semibold flex-1">Ask your inbox</span>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald" />Live
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}>
            <span className="text-[10px] font-medium text-text-3">
              {m.role === "ai" ? "MailLens AI" : "You"}
            </span>
            <div className={`px-3 py-2 rounded-[10px] text-[12.5px] leading-relaxed max-w-[90%] ${
              m.role === "ai"
                ? "bg-surface-2 text-text-2 rounded-tl-[4px]"
                : "bg-teal text-white rounded-tr-[4px]"
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col gap-1 items-start">
            <span className="text-[10px] font-medium text-text-3">MailLens AI</span>
            <div className="bg-surface-2 px-3 py-2 rounded-[10px] rounded-tl-[4px] flex gap-1 items-center">
              {[0, 200, 400].map((d) => (
                <div key={d} className="w-1.5 h-1.5 rounded-full bg-text-3 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="px-3 py-2 border-t border-border flex flex-col gap-1 flex-shrink-0">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)}
            className="text-left px-2.5 py-1.5 rounded-[8px] text-[11.5px] text-text-2 bg-surface-2 border border-border hover:border-teal hover:text-text hover:bg-teal/10 transition-all truncate">
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-border flex-shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Ask anything about your emails…"
          rows={1}
          className="flex-1 bg-surface-2 border border-border-2 rounded-[8px] px-3 py-2 text-[12.5px] text-text placeholder:text-text-3 outline-none resize-none max-h-[90px] focus:border-teal transition-colors"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="w-8 h-8 rounded-[8px] bg-teal text-white grid place-items-center text-base hover:bg-teal-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >↑</button>
      </div>
    </div>
  );
}
