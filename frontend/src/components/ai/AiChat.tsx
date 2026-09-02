import { FormEvent, useEffect, useRef, useState } from "react";
import { request } from "../../lib/api";

type Role = "user" | "assistant";
interface ChatMessage { id: string; role: Role; content: string; createdAt?: string; }
interface Conversation { id: string; title: string | null; updatedAt: string; _count?: { messages: number }; }
interface Props { userId: string; }

const STARTERS = ["Summarize my important emails today", "What invoices are due this month?", "Find any security or login alerts"];
const welcome: ChatMessage = { id: "welcome", role: "assistant", content: "Hi! I can search and make sense of your inbox. Ask about emails, payments, people, or anything you need to find." };

function conversationTitle(question: string) { return question.trim().replace(/\s+/g, " ").slice(0, 52) || "New conversation"; }
function relativeDate(value: string) {
  const date = new Date(value), today = new Date(), yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export default function AiChat({ userId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => {
    let active = true;
    request<{ conversations: Conversation[] }>(`/ask?userId=${encodeURIComponent(userId)}`)
      .then((data) => { if (active) setConversations(data.conversations || []); })
      .catch((e: Error) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [userId]);

  async function selectConversation(id: string) {
    if (id === activeId || loading) return;
    setActiveId(id); setLoadingHistory(true); setError("");
    try {
      const data = await request<{ conversation: { messages: ChatMessage[] } }>(`/ask/${id}?userId=${encodeURIComponent(userId)}`);
      setMessages(data.conversation.messages.length ? data.conversation.messages : [welcome]);
    } catch (e: any) { setError(e.message || "Couldn’t load this conversation."); }
    finally { setLoadingHistory(false); }
  }
  function startNewConversation() { if (!loading) { setActiveId(null); setMessages([welcome]); setInput(""); setError(""); } }
  async function send(event?: FormEvent, preset?: string) {
    event?.preventDefault(); const question = (preset ?? input).trim();
    if (!question || loading) return;
    setInput(""); setError(""); setLoading(true); let conversationId = activeId;
    try {
      if (!conversationId) {
        const created = await request<{ conversation: Conversation }>("/ask/new", { method: "POST", body: JSON.stringify({ userId, title: conversationTitle(question) }) });
        conversationId = created.conversation.id; setActiveId(conversationId); setConversations((items) => [created.conversation, ...items]);
      }
      const userMessage: ChatMessage = { id: `local-${Date.now()}`, role: "user", content: question };
      setMessages((items) => [...items, userMessage]);
      const response = await request<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(`/ask/${conversationId}/ask`, { method: "POST", body: JSON.stringify({ userId, message: question }) });
      setMessages((items) => [...items.filter((item) => item.id !== userMessage.id), response.userMessage, response.assistantMessage]);
      setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, updatedAt: new Date().toISOString(), _count: { messages: (item._count?.messages || 0) + 2 } } : item));
    } catch (e: any) { setError(e.message || "Something went wrong while asking MailLens AI."); }
    finally { setLoading(false); }
  }
  const activeConversation = conversations.find((item) => item.id === activeId);

  return <section className="flex h-full min-h-0 bg-surface">
    <aside className="hidden sm:flex w-[268px] flex-col border-r border-border bg-surface/70">
      <div className="p-4 border-b border-border"><div className="flex items-center justify-between mb-4"><div><p className="text-[10px] tracking-[0.18em] uppercase text-teal font-semibold">MailLens AI</p><h1 className="text-base font-semibold mt-0.5">Your conversations</h1></div><span className="w-2 h-2 rounded-full bg-emerald shadow-[0_0_10px_#10B981]" /></div><button onClick={startNewConversation} className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-teal hover:bg-teal-dark px-3 py-2.5 text-[12px] font-semibold text-white shadow-glow transition-colors"><span className="text-lg leading-none">+</span> New conversation</button></div>
      <div className="flex-1 overflow-y-auto p-2.5"><p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-text-3">Recent</p>{loadingHistory && !conversations.length ? <p className="px-2 pt-3 text-xs text-text-3">Loading conversations…</p> : conversations.length === 0 ? <p className="px-2 pt-3 text-xs leading-relaxed text-text-3">Your conversations will appear here.</p> : conversations.map((conversation) => <button key={conversation.id} onClick={() => selectConversation(conversation.id)} className={`w-full rounded-[10px] px-3 py-2.5 text-left mb-1 transition-colors ${activeId === conversation.id ? "bg-teal/15 text-text" : "text-text-2 hover:bg-surface-2 hover:text-text"}`}><span className="block truncate text-[12.5px] font-medium">{conversation.title || "Untitled conversation"}</span><span className="mt-1 flex justify-between text-[10px] text-text-3"><span>{conversation._count?.messages || 0} messages</span><span>{relativeDate(conversation.updatedAt)}</span></span></button>)}</div>
      <div className="p-4 border-t border-border text-[10px] leading-relaxed text-text-3">Your questions use context from your connected inbox.</div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-[72px] items-center border-b border-border px-5 sm:px-8"><div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-widest text-text-3">AI inbox assistant</p><h2 className="truncate text-[14px] font-semibold">{activeConversation?.title || "New conversation"}</h2></div><button onClick={startNewConversation} className="sm:hidden rounded-lg border border-border px-3 py-2 text-xs text-text-2">New chat</button><div className="hidden sm:flex items-center gap-2 text-[11px] text-emerald"><span className="h-1.5 w-1.5 rounded-full bg-emerald" /> Ready to help</div></header>
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-10 sm:py-8"><div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {messages.length === 1 && !activeId && <div className="pt-4 pb-2"><div className="mb-7 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal to-cyan text-xl text-white shadow-glow">✦</div><h3 className="text-2xl font-semibold tracking-tight">What can I help find?</h3><p className="mt-2 max-w-lg text-sm leading-relaxed text-text-2">Ask naturally. I’ll search the important details across your email and bring them together.</p><div className="mt-7 grid gap-2 sm:grid-cols-3">{STARTERS.map((starter) => <button key={starter} onClick={() => send(undefined, starter)} className="rounded-xl border border-border bg-surface-2 p-3 text-left text-xs leading-relaxed text-text-2 hover:border-teal hover:bg-teal/10 hover:text-text">{starter}</button>)}</div></div>}
        {messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>{message.role === "assistant" && <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal/15 text-xs text-teal">✦</div>}<div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-6 ${message.role === "user" ? "rounded-br-md bg-teal text-white" : "rounded-tl-md border border-border bg-surface-2 text-text-2"}`}>{message.content}</div></div>)}
        {loading && <div className="flex gap-3"><div className="grid h-7 w-7 place-items-center rounded-lg bg-teal/15 text-xs text-teal">✦</div><div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-surface-2 px-4 py-3">{[0, 120, 240].map((delay) => <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-3" style={{ animationDelay: `${delay}ms` }} />)}</div></div>}{error && <p className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{error}</p>}<div ref={bottomRef} />
      </div></main>
      <form onSubmit={(event) => send(event)} className="border-t border-border bg-surface px-4 py-4 sm:px-10"><div className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-border-2 bg-surface-2 px-4 py-2 focus-within:border-teal"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows={1} placeholder="Ask anything about your inbox…" className="max-h-28 min-h-[28px] flex-1 resize-none bg-transparent py-1.5 text-sm text-text outline-none placeholder:text-text-3" /><button type="submit" disabled={!input.trim() || loading} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal text-base text-white transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">↑</button></div><p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-text-3">Enter to send · Shift + Enter for a new line</p></form>
    </div>
  </section>;
}
