import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MailService } from "../services/mail.service";
import { Session } from "../types";
import { parseAuthRedirectPayload } from "../utils/auth";
import {
  readSession,
  USER_STORAGE_KEY,
} from "../utils/storage";

type Category =
  | "Urgent"
  | "Receipt"
  | "Social"
  | "Newsletter"
  | "OTP";

type Priority =
  | "High"
  | "Medium"
  | "Low";

type MailLensEmail = {
  id: string;
  sender: string;
  account: string;
  timestamp: string;
  subject: string;
  preview: string;
  body: string[];
  categories: Category[];
  summary: string;
  priority: Priority;
  actions: string[];
  entities: {
    label: string;
    value: string;
  }[];
};

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

const emails: MailLensEmail[] = [
  {
    id: "security-alert",
    sender: "GitHub",
    account: "github.com",
    timestamp: "09:42",
    subject: "New sign-in from Chrome on macOS",
    preview:
      "We noticed a successful sign-in to your account from a new device in Bengaluru.",
    body: [
      "Hi Armaan, we detected a successful sign-in to your GitHub account from Chrome on macOS near Bengaluru, India.",
      "If this was you, no action is needed. If you do not recognize this activity, reset your password and review active sessions immediately.",
      "Device: Chrome on macOS. Location: Bengaluru, India. Time: Today at 09:42.",
    ],
    categories: ["Urgent"],
    summary:
      "GitHub detected a new successful sign-in from Chrome on macOS. Review it quickly if you did not initiate this login.",
    priority: "High",
    actions: [
      "Confirm whether this login was yours",
      "Review active GitHub sessions",
      "Rotate password if the device looks unfamiliar",
    ],
    entities: [
      {
        label: "Service",
        value: "GitHub",
      },
      {
        label: "Location",
        value: "Bengaluru",
      },
      {
        label: "Device",
        value: "Chrome macOS",
      },
    ],
  },
  {
    id: "receipt-figma",
    sender: "Figma",
    account: "figma.com",
    timestamp: "Yesterday",
    subject: "Your Figma receipt for Team Professional",
    preview:
      "Thanks for your payment. Your card was charged $15.00 for the monthly workspace plan.",
    body: [
      "Thanks for your payment for Figma Team Professional. Your monthly subscription renewed successfully.",
      "Amount charged: $15.00. Workspace: MailLens Design. Invoice ID: INV-FG-88421.",
      "You can download your receipt from billing settings at any time.",
    ],
    categories: ["Receipt"],
    summary:
      "Figma renewed the Team Professional plan and charged $15.00 for the MailLens Design workspace.",
    priority: "Medium",
    actions: [
      "Save receipt for bookkeeping",
      "Review workspace seats before next renewal",
    ],
    entities: [
      {
        label: "Amount",
        value: "$15.00",
      },
      {
        label: "Invoice",
        value: "INV-FG-88421",
      },
      {
        label: "Service",
        value: "Figma",
      },
    ],
  },
  {
    id: "otp-bank",
    sender: "HDFC Bank",
    account: "hdfcbank.com",
    timestamp: "Mon",
    subject: "OTP for card transaction",
    preview:
      "Use 284911 as your one-time password for the transaction ending in 4057.",
    body: [
      "Your OTP for the transaction on card ending 4057 is 284911. Do not share this code with anyone.",
      "The OTP is valid for 10 minutes. If you did not initiate this transaction, contact support immediately.",
    ],
    categories: ["OTP", "Urgent"],
    summary:
      "HDFC sent an OTP for a card transaction. Treat as sensitive and verify the purchase if unexpected.",
    priority: "High",
    actions: [
      "Do not share the OTP",
      "Check recent card activity",
    ],
    entities: [
      {
        label: "OTP",
        value: "284911",
      },
      {
        label: "Card",
        value: "••4057",
      },
      {
        label: "Validity",
        value: "10 min",
      },
    ],
  },
  {
    id: "newsletter-vercel",
    sender: "Vercel",
    account: "vercel.com",
    timestamp: "Jun 16",
    subject: "Fluid compute, AI SDK updates, and deploy insights",
    preview:
      "This month: faster serverless execution, AI SDK examples, and dashboard improvements.",
    body: [
      "This month we released fluid compute updates, new AI SDK examples, and deeper deploy insights.",
      "Teams can now inspect latency patterns faster and connect deployment metrics to product performance.",
    ],
    categories: ["Newsletter"],
    summary:
      "Vercel shared product updates around compute, AI SDK examples, and deployment analytics.",
    priority: "Low",
    actions: [
      "Skim AI SDK examples when planning inbox assistant flows",
    ],
    entities: [
      {
        label: "Service",
        value: "Vercel",
      },
      {
        label: "Topic",
        value: "AI SDK",
      },
    ],
  },
  {
    id: "social-linkedin",
    sender: "LinkedIn",
    account: "linkedin.com",
    timestamp: "Jun 14",
    subject: "5 people viewed your profile this week",
    preview:
      "Your profile appeared in 19 searches. See who is checking out your work.",
    body: [
      "Your profile received 5 views this week and appeared in 19 searches.",
      "People from product, engineering, and venture teams are engaging with your recent activity.",
    ],
    categories: ["Social"],
    summary:
      "LinkedIn reports weekly profile engagement and suggests checking recent viewers.",
    priority: "Low",
    actions: [
      "Review profile viewers if recruiting or networking",
    ],
    entities: [
      {
        label: "Views",
        value: "5",
      },
      {
        label: "Searches",
        value: "19",
      },
      {
        label: "Service",
        value: "LinkedIn",
      },
    ],
  },
];

const navItems = [
  "All Mail",
  "Urgent",
  "Snoozed",
  "Sent",
];

const aiItems = [
  "Ask Inbox",
  "Insights",
];

const labelItems: Category[] = [
  "Receipt",
  "Social",
  "Newsletter",
];

const categoryTotals = [
  {
    label: "Urgent",
    value: 18,
    className: "rose",
  },
  {
    label: "Receipts",
    value: 34,
    className: "emerald",
  },
  {
    label: "Social",
    value: 21,
    className: "indigo",
  },
  {
    label: "Newsletters",
    value: 27,
    className: "amber",
  },
];

const topAccounts = [
  {
    name: "github.com",
    detail: "Security + developer alerts",
    count: 42,
  },
  {
    name: "amazon.in",
    detail: "Orders, returns, invoices",
    count: 38,
  },
  {
    name: "figma.com",
    detail: "Receipts + collaboration",
    count: 16,
  },
  {
    name: "linkedin.com",
    detail: "Network activity",
    count: 14,
  },
];

function readSessionFromRedirect(): Session {
  const params = new URLSearchParams(
    window.location.search
  );
  const authPayload = params.get("auth");

  if (!authPayload) {
    return readSession();
  }

  try {
    const session =
      parseAuthRedirectPayload(authPayload);

    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify(session)
    );

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );

    return session;
  } catch {
    return readSession();
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [session] = useState(readSessionFromRedirect);
  const [backendStatus, setBackendStatus] =
    useState("Checking");
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);
  const [selectedId, setSelectedId] =
    useState(emails[0].id);
  const [activeSection, setActiveSection] =
    useState("All Mail");
  const [query, setQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    ChatMessage[]
  >([
    {
      role: "ai",
      text:
        "I found 27 linked accounts, 8 recent receipts, and 2 security alerts. Ask me anything about your inbox.",
    },
  ]);

  useEffect(() => {
    if (!session.userId) {
      navigate("/");
      return;
    }

    MailService.health()
      .then(() => setBackendStatus("Connected"))
      .catch(() => setBackendStatus("Offline"));
  }, [navigate, session.userId]);

  const filteredEmails = useMemo(() => {
    const normalizedQuery =
      query.trim().toLowerCase();

    return emails.filter((email) => {
      const matchesSection =
        activeSection === "All Mail" ||
        activeSection === "Ask Inbox" ||
        activeSection === "Insights" ||
        email.categories.includes(
          activeSection as Category
        );

      const matchesQuery =
        !normalizedQuery ||
        [
          email.sender,
          email.subject,
          email.preview,
          email.summary,
          email.account,
          ...email.categories,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesSection && matchesQuery;
    });
  }, [activeSection, query]);

  const selectedEmail =
    emails.find((email) => email.id === selectedId) ||
    filteredEmails[0] ||
    emails[0];

  const totalSpend = emails
    .flatMap((email) => email.entities)
    .filter((entity) => entity.label === "Amount")
    .reduce((sum, entity) => {
      const amount = Number(
        entity.value.replace(/[^0-9.]/g, "")
      );

      return sum + amount;
    }, 0);

  function logout() {
    localStorage.removeItem(USER_STORAGE_KEY);
    navigate("/");
  }

  async function sendChatMessage() {
    const question = chatInput.trim();

    if (!question) {
      return;
    }

    setChatMessages((current) => [
      ...current,
      {
        role: "user",
        text: question,
      },
    ]);
    setChatInput("");

    try {
      const answer = await MailService.ask(
        session.userId,
        question
      );
      const responseText =
        answer?.answer ||
        answer?.response ||
        "I searched your indexed mail and found relevant matches.";

      setChatMessages((current) => [
        ...current,
        {
          role: "ai",
          text: responseText,
        },
      ]);
    } catch {
      setChatMessages((current) => [
        ...current,
        {
          role: "ai",
          text:
            "From the local inbox snapshot: you are registered on GitHub, Figma, Vercel, LinkedIn, HDFC, and Amazon-like commerce services. The highest-risk item is the recent GitHub sign-in alert.",
        },
      ]);
    }
  }

  function activateSection(section: string) {
    setActiveSection(section);

    if (section === "Insights") {
      return;
    }

    const firstMatch = emails.find((email) =>
      section === "All Mail" ||
      section === "Ask Inbox"
        ? true
        : email.categories.includes(section as Category)
    );

    if (firstMatch) {
      setSelectedId(firstMatch.id);
    }
  }

  return (
    <div className="maillens-app">
      <aside
        className={`mail-sidebar ${
          sidebarCollapsed ? "is-collapsed" : ""
        }`}
      >
        <div className="brand-row">
          <div className="brand-mark">ML</div>
          <div className="brand-copy">
            <strong>MailLens</strong>
            <span>AI inbox OS</span>
          </div>
          <button
            aria-label="Toggle sidebar"
            className="icon-button sidebar-toggle"
            onClick={() =>
              setSidebarCollapsed((value) => !value)
            }
          >
            ◐
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-kicker">Mailbox</p>
          {navItems.map((item) => (
            <button
              className={
                activeSection === item ? "active" : ""
              }
              key={item}
              onClick={() => activateSection(item)}
            >
              <span>{item}</span>
              <small>
                {item === "All Mail"
                  ? emails.length
                  : item === "Urgent"
                    ? 2
                    : item === "Snoozed"
                      ? 4
                      : 12}
              </small>
            </button>
          ))}

          <p className="nav-kicker">AI</p>
          {aiItems.map((item) => (
            <button
              className={
                activeSection === item ? "active" : ""
              }
              key={item}
              onClick={() => activateSection(item)}
            >
              <span>{item}</span>
              <small>{item === "Insights" ? "Live" : "Ask"}</small>
            </button>
          ))}

          <p className="nav-kicker">Labels</p>
          {labelItems.map((item) => (
            <button
              className={
                activeSection === item ? "active" : ""
              }
              key={item}
              onClick={() => activateSection(item)}
            >
              <span>{item}s</span>
              <small>
                {
                  emails.filter((email) =>
                    email.categories.includes(item)
                  ).length
                }
              </small>
            </button>
          ))}
        </nav>

        <div className="account-chip">
          <span>{backendStatus}</span>
          <strong>
            {session.email || "Connected inbox"}
          </strong>
          <button onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="mail-workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Semantic search</p>
            <h1>Ask, search, and understand your inbox.</h1>
          </div>
          <label className="search-box">
            <span>⌘K</span>
            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search receipts, “what subscriptions renewed?”, security alerts..."
            />
          </label>
        </header>

        {activeSection === "Insights" ? (
          <InsightsView totalSpend={totalSpend} />
        ) : (
          <section className="mail-panels">
            <EmailList
              emails={filteredEmails}
              selectedId={selectedEmail.id}
              onSelect={setSelectedId}
            />
            <EmailDetail email={selectedEmail} />
          </section>
        )}
      </main>

      <AskInboxPanel
        messages={chatMessages}
        value={chatInput}
        onChange={setChatInput}
        onSend={sendChatMessage}
      />

      <nav className="mobile-nav">
        {["All Mail", "Urgent", "Ask Inbox", "Insights"].map(
          (item) => (
            <button
              className={
                activeSection === item ? "active" : ""
              }
              key={item}
              onClick={() => activateSection(item)}
            >
              {item}
            </button>
          )
        )}
      </nav>
    </div>
  );
}

function EmailList({
  emails: visibleEmails,
  selectedId,
  onSelect,
}: {
  emails: MailLensEmail[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="email-list-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Priority inbox</p>
          <h2>{visibleEmails.length} messages</h2>
        </div>
        <span className="live-pill">AI triaged</span>
      </div>

      <div className="email-list">
        {visibleEmails.map((email) => (
          <button
            className={`email-row ${
              selectedId === email.id ? "active" : ""
            }`}
            key={email.id}
            onClick={() => onSelect(email.id)}
          >
            <div className="email-row-top">
              <strong>{email.sender}</strong>
              <time>{email.timestamp}</time>
            </div>
            <h3>{email.subject}</h3>
            <p>{email.preview}</p>
            <TagGroup categories={email.categories} />
          </button>
        ))}
      </div>
    </section>
  );
}

function EmailDetail({
  email,
}: {
  email: MailLensEmail;
}) {
  return (
    <section className="email-detail-panel">
      <article className="email-body-card">
        <div className="email-detail-header">
          <div>
            <p className="eyebrow">{email.account}</p>
            <h2>{email.subject}</h2>
          </div>
          <TagGroup categories={email.categories} />
        </div>

        <div className="sender-line">
          <span>{email.sender}</span>
          <time>{email.timestamp}</time>
        </div>

        <div className="email-copy">
          {email.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>

      <article className="ai-summary-card">
        <div className="summary-header">
          <div>
            <p className="eyebrow">AI summary</p>
            <h3>Plain-language brief</h3>
          </div>
          <span
            className={`priority-badge ${email.priority.toLowerCase()}`}
          >
            {email.priority}
          </span>
        </div>

        <p className="summary-text">{email.summary}</p>

        <div className="summary-section">
          <h4>Action items</h4>
          <ul>
            {email.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>

        <div className="summary-section">
          <h4>Linked entities</h4>
          <div className="entity-grid">
            {email.entities.map((entity) => (
              <div className="entity-pill" key={entity.label}>
                <span>{entity.label}</span>
                <strong>{entity.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}

function AskInboxPanel({
  messages,
  value,
  onChange,
  onSend,
}: {
  messages: ChatMessage[];
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <aside className="ask-panel">
      <div className="ask-header">
        <div>
          <p className="eyebrow">Ask your inbox</p>
          <h2>Context-aware AI</h2>
        </div>
        <span className="pulse-dot" />
      </div>

      <div className="suggestion-stack">
        {[
          "Which websites am I registered on?",
          "Show payment receipts from this month",
          "Surface security alerts",
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => onChange(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-feed">
        {messages.map((message, index) => (
          <div
            className={`chat-bubble ${message.role}`}
            key={`${message.role}-${index}`}
          >
            {message.text}
          </div>
        ))}
      </div>

      <div className="chat-composer">
        <textarea
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask about receipts, accounts, alerts..."
        />
        <button onClick={onSend}>Send</button>
      </div>
    </aside>
  );
}

function InsightsView({
  totalSpend,
}: {
  totalSpend: number;
}) {
  return (
    <section className="insights-view">
      <div className="insight-stats">
        {[
          {
            label: "Total emails",
            value: "12,408",
            detail: "Indexed across Gmail",
          },
          {
            label: "AI coverage",
            value: "94%",
            detail: "Summaries generated",
          },
          {
            label: "Tracked spending",
            value: `$${totalSpend.toFixed(2)}`,
            detail: "Detected this snapshot",
          },
          {
            label: "Linked accounts",
            value: "27",
            detail: "Services recognized",
          },
        ].map((stat) => (
          <article className="insight-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.detail}</small>
          </article>
        ))}
      </div>

      <div className="insight-grid">
        <article className="chart-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Categories</p>
              <h2>Breakdown</h2>
            </div>
          </div>

          <div className="bar-chart">
            {categoryTotals.map((item) => (
              <div className="bar-row" key={item.label}>
                <span>{item.label}</span>
                <div>
                  <i
                    className={item.className}
                    style={{
                      width: `${item.value}%`,
                    }}
                  />
                </div>
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="accounts-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Accounts</p>
              <h2>Top services</h2>
            </div>
          </div>

          <div className="account-list">
            {topAccounts.map((account) => (
              <div className="account-row" key={account.name}>
                <div>
                  <strong>{account.name}</strong>
                  <span>{account.detail}</span>
                </div>
                <small>{account.count}</small>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function TagGroup({
  categories,
}: {
  categories: Category[];
}) {
  return (
    <div className="tag-group">
      {categories.map((category) => (
        <span
          className={`category-tag ${category.toLowerCase()}`}
          key={category}
        >
          {category}
        </span>
      ))}
    </div>
  );
}
