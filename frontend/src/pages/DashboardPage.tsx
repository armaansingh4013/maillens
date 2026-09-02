import { useState, useEffect } from "react";
import { Sidebar, type NavView } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { BottomNav } from "../components/layout/BottomNav";
import { EmailList } from "../components/email/EmailList";
import { EmailDetail } from "../components/email/EmailDetail";
import { AskPanel } from "../components/ai/AskPanel";
import { InsightsDashboard } from "../components/dashboard/InsightsDashboard";
import { useAsync } from "../hooks/useAsync";
import { request } from "../lib/api";
import type { UserSession, EmailMessage } from "../types";
import { useSession } from "../hooks/useSession";
import { EmailModal, type ComposeMode, type ComposeContext } from "../components/email/EmailModal";
import AiChat from "../components/ai/AiChat";

interface Props {
  session: UserSession;
  onLogout: () => void;
}

const INBOX_VIEWS: NavView[] = ["inbox", "urgent", "sent", "receipts", "social", "newsletters"];
const SOCIAL_DOMAINS = ["instagram.com", "linkedin.com", "twitter.com", "x.com", "facebook.com", "tiktok.com", "threads.net"];

function extractEmailAddress(from?: string) {
  if (!from) return "";
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from;
}

function isImportant(email: EmailMessage) {
  const importance = (email.summary?.importance || "").toLowerCase();
  return importance === "high" || importance === "critical" || Boolean(email.summary?.actionRequired);
}

function isReceiptLike(email: EmailMessage) {
  const t = `${email.summary?.category || ""} ${email.summary?.topic || ""}`.toLowerCase();
  return ["invoice", "receipt", "payment", "order", "bill", "transaction"].some((k) => t.includes(k));
}

function isSocialLike(email: EmailMessage) {
  const domain = (email.sourceDomain || "").toLowerCase();
  return SOCIAL_DOMAINS.some((d) => domain.includes(d));
}

function isNewsletterLike(email: EmailMessage) {
  const t = `${email.summary?.category || ""} ${email.summary?.topic || ""}`.toLowerCase();
  return t.includes("newsletter") || t.includes("digest") || t.includes("update");
}

/** Filters by the sidebar's broad category tabs. The EmailList's own filter
 * pills apply a second, finer pass on top of whatever this returns. */
function filterByNav(emails: EmailMessage[], nav: NavView, selfEmail: string): EmailMessage[] {
  switch (nav) {
    case "urgent":
      return emails.filter(isImportant);
    case "sent":
      // Best-effort: sync captures whatever history returns, which can
      // include mail the user sent. There's no dedicated "sent" flag yet,
      // so this approximates it via the From address matching the user.
      return selfEmail ? emails.filter((e) => (e.from || "").toLowerCase().includes(selfEmail.toLowerCase())) : [];
    case "receipts":
      return emails.filter(isReceiptLike);
    case "social":
      return emails.filter(isSocialLike);
    case "newsletters":
      return emails.filter(isNewsletterLike);
    default:
      return emails;
  }
}

interface ComposeState {
  mode: ComposeMode;
  context?: ComposeContext;
  initial?: { to?: string; cc?: string; bcc?: string; subject?: string; body?: string };
}

export function DashboardPage() {
  const { session, logout } = useSession();

  const [nav, setNav] = useState<NavView>("inbox");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [compose, setCompose] = useState<ComposeState>({ mode: "new" });

  const emails = useAsync<{ messages: EmailMessage[] }>();
  const sync = useAsync<any>();

  function reloadEmails() {
    return emails.run(() => request(`/emails/db?userId=${encodeURIComponent(session.userId)}`));
  }

  useEffect(() => {
    reloadEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.userId]);

  function handleSync() {
    sync.run(() => request(`/gmail/sync-now?userId=${encodeURIComponent(session.userId)}`)).then(() => reloadEmails());
  }

  function handleSelectEmail(email: EmailMessage) {
    setSelectedEmail(email);
    setMobileShowDetail(true);
  }

  function openNewEmail() {
    setCompose({ mode: "new" });
    setModalOpen(true);
  }

  function openReply(email: EmailMessage) {
    const subject = /^re:/i.test(email.subject || "") ? email.subject : `Re: ${email.subject || ""}`;
    setCompose({
      mode: "reply",
      context: { threadId: email.threadId, messageId: email.gmailMessageId },
      initial: { to: extractEmailAddress(email.from), subject, body: "" },
    });
    setModalOpen(true);
  }

  function openForward(email: EmailMessage) {
    const subject = /^fwd:/i.test(email.subject || "") ? email.subject : `Fwd: ${email.subject || ""}`;
    setCompose({
      mode: "forward",
      initial: { to: "", subject, body: email.body || email.snippet || "" },
    });
    setModalOpen(true);
  }

  async function handleArchive(email: EmailMessage) {
    if (!email.gmailMessageId) throw new Error("This email has no Gmail message id yet — sync it first.");
    await request("/gmail/archive", {
      method: "POST",
      body: JSON.stringify({ userId: session.userId, gmailMessageId: email.gmailMessageId }),
    });
    if (selectedEmail?.id === email.id) setSelectedEmail(null);
    await reloadEmails();
  }

  async function handleDelete(email: EmailMessage) {
    if (!email.gmailMessageId) throw new Error("This email has no Gmail message id yet — sync it first.");
    await request("/gmail/trash", {
      method: "POST",
      body: JSON.stringify({ userId: session.userId, gmailMessageId: email.gmailMessageId }),
    });
    if (selectedEmail?.id === email.id) setSelectedEmail(null);
    await reloadEmails();
  }

  const allEmails = emails.data?.messages || [];
  const navFiltered = filterByNav(allEmails, nav, session.email);
  const filtered = search.trim()
    ? navFiltered.filter((e) =>
        [e.subject, e.from, e.snippet, e.summary?.shortSummary].some((f) =>
          f?.toLowerCase().includes(search.toLowerCase())
        )
      )
    : navFiltered;

  const counts = {
    inbox: allEmails.length,
    urgent: allEmails.filter(isImportant).length,
    sent: session.email ? allEmails.filter((e) => (e.from || "").toLowerCase().includes(session.email.toLowerCase())).length : 0,
    receipts: allEmails.filter(isReceiptLike).length,
    social: allEmails.filter(isSocialLike).length,
    newsletters: allEmails.filter(isNewsletterLike).length,
  };

  const userInitial = (session.name || session.email || "U")[0].toUpperCase();
  const showInbox = INBOX_VIEWS.includes(nav);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        active={nav}
        onNav={setNav}
        userName={session.name}
        userEmail={session.email}
        onLogout={logout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        counts={counts}
      />

      <EmailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={session.userId}
        mode={compose.mode}
        context={compose.context}
        initial={compose.initial}
        onSent={() => {
          setModalOpen(false);
        }}
      />

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          onSearch={setSearch}
          searchValue={search}
          userInitial={userInitial}
          onSyncClick={handleSync}
          syncing={sync.status === "loading"}
          newEmailClick={openNewEmail}
        />

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Inbox view */}
          {showInbox && (
            <>
              {/* Email list — hidden on mobile when detail is open */}
              <div className={`${mobileShowDetail ? "hidden md:flex" : "flex"} flex-col overflow-hidden`}>
                <EmailList
                  emails={filtered}
                  selectedId={selectedEmail?.id || null}
                  onSelect={handleSelectEmail}
                  loading={emails.status === "loading"}
                  onLoad={reloadEmails}
                />
              </div>

              {/* Email detail */}
              <div className={`
                ${mobileShowDetail ? "flex" : "hidden md:flex"}
                flex-1 overflow-hidden min-w-0
                ${mobileShowDetail ? "fixed inset-0 bottom-[60px] z-50 md:relative md:inset-auto md:bottom-auto md:z-auto" : ""}
              `}>
                <EmailDetail
                  email={selectedEmail}
                  onBack={() => setMobileShowDetail(false)}
                  onReply={openReply}
                  onForward={openForward}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              </div>

              {/* AI Chat panel — hidden below 1100px */}
              <div className="hidden xl:flex flex-col w-[300px] flex-shrink-0">
                <AskPanel userId={session.userId} />
              </div>
            </>
          )}

          {/* Ask AI full view */}
          {nav === "ask" && (
            <div className="flex flex-1 overflow-hidden justify-center">
              <div className="w-full border-x border-border">
                <AiChat userId={session.userId} />
              </div>
            </div>
          )}

          {/* Insights */}
          {nav === "insights" && <InsightsDashboard userId={session.userId} />}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav active={nav} onNav={setNav} />
    </div>
  );
}
