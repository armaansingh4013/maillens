import { useEffect, useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const USER_STORAGE_KEY = "maillens.userSession";

const initialSession = {
  userId: "",
  email: "",
  name: "",
};

const actionConfig = [
  {
    key: "sync",
    label: "Sync Gmail",
    description: "Pull the latest Gmail messages into MailLens.",
    path: "/gmail/sync-now",
  },
  {
    key: "summarize",
    label: "Summarize Inbox",
    description: "Create summaries and filter low-value emails.",
    path: "/gmail/summarize-now",
  },
  {
    key: "embed",
    label: "Embed Emails",
    description: "Generate searchable vector chunks for email Q&A.",
    path: "/gmail/embed-now",
  },
  {
    key: "digest",
    label: "Build Today's Digest",
    description: "Generate the daily digest from today's summaries.",
    path: "/digest/today",
  },
];

function readSession() {
  if (typeof window === "undefined") return initialSession;

  try {
    const stored = window.localStorage.getItem(USER_STORAGE_KEY);
    return stored ? { ...initialSession, ...JSON.parse(stored) } : initialSession;
  } catch {
    return initialSession;
  }
}

function formatDate(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function parseAuthPayload(text) {
  const data = JSON.parse(text);
  const user = data?.user;

  if (!data?.ok || !user?.id) {
    throw new Error("Backend auth response must contain `ok: true` and `user.id`.");
  }

  return {
    userId: user.id,
    email: user.email || "",
    name: user.name || "",
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}

function App() {
  const [session, setSession] = useState(readSession);
  const [health, setHealth] = useState({ status: "idle", data: null, error: "" });
  const [actionState, setActionState] = useState({});
  const [emails, setEmails] = useState({ status: "idle", data: null, error: "" });
  const [digest, setDigest] = useState({ status: "idle", data: null, error: "" });
  const [question, setQuestion] = useState("");
  const [askResult, setAskResult] = useState({ status: "idle", data: null, error: "" });
  const [authPayload, setAuthPayload] = useState("");
  const [authState, setAuthState] = useState({ status: "idle", error: "" });

  useEffect(() => {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      setHealth({ status: "loading", data: null, error: "" });
      try {
        const data = await request("/");
        if (!cancelled) {
          setHealth({ status: "success", data, error: "" });
        }
      } catch (error) {
        if (!cancelled) {
          setHealth({ status: "error", data: null, error: error.message });
        }
      }
    }

    loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasUserId = Boolean(session.userId.trim());
  const authUrl = `${API_BASE}/auth/google`;

  const statItems = useMemo(
    () => [
      { label: "Backend", value: health.status === "success" ? "Connected" : health.status === "loading" ? "Checking" : "Offline" },
      { label: "Account", value: hasUserId ? session.email || session.name || "Signed in" : "Not connected" },
      { label: "Digest", value: digest.data?.digest?.content ? "Ready" : "Not loaded" },
    ],
    [digest.data?.digest?.content, hasUserId, health.status, session.email, session.name]
  );

  const quickHighlights = useMemo(
    () => [
      {
        label: "Actions",
        value: `${actionConfig.length}`,
        detail: "backend workflows",
      },
      {
        label: "Loaded emails",
        value: `${emails.data?.messages?.length || 0}`,
        detail: "in this dashboard",
      },
      {
        label: "AI matches",
        value: `${askResult.data?.matches?.length || 0}`,
        detail: "from latest answer",
      },
    ],
    [askResult.data?.matches?.length, emails.data?.messages?.length]
  );

  async function runAction(action) {
    if (!hasUserId) return;

    setActionState((current) => ({
      ...current,
      [action.key]: { status: "loading", data: null, error: "" },
    }));

    try {
      const data = await request(`${action.path}?userId=${encodeURIComponent(session.userId.trim())}`);
      setActionState((current) => ({
        ...current,
        [action.key]: { status: "success", data, error: "" },
      }));

      if (action.key === "digest") {
        setDigest({ status: "success", data, error: "" });
      }
    } catch (error) {
      setActionState((current) => ({
        ...current,
        [action.key]: { status: "error", data: null, error: error.message },
      }));
    }
  }

  async function loadEmails() {
    if (!hasUserId) return;

    setEmails({ status: "loading", data: null, error: "" });
    try {
      const data = await request(`/gmail/emails?userId=${encodeURIComponent(session.userId.trim())}`);
      setEmails({ status: "success", data, error: "" });
    } catch (error) {
      setEmails({ status: "error", data: null, error: error.message });
    }
  }

  async function loadDigest() {
    if (!hasUserId) return;

    setDigest({ status: "loading", data: null, error: "" });
    try {
      const data = await request(`/digest/today?userId=${encodeURIComponent(session.userId.trim())}`);
      setDigest({ status: "success", data, error: "" });
    } catch (error) {
      setDigest({ status: "error", data: null, error: error.message });
    }
  }

  async function askInbox(event) {
    event.preventDefault();
    if (!hasUserId || !question.trim()) return;

    setAskResult({ status: "loading", data: null, error: "" });
    try {
      const data = await request("/ask", {
        method: "POST",
        body: JSON.stringify({
          userId: session.userId.trim(),
          question: question.trim(),
        }),
      });
      setAskResult({ status: "success", data, error: "" });
    } catch (error) {
      setAskResult({ status: "error", data: null, error: error.message });
    }
  }

  function completeLogin() {
    setAuthState({ status: "loading", error: "" });

    try {
      const nextSession = parseAuthPayload(authPayload.trim());
      setSession(nextSession);
      setAuthPayload("");
      setAuthState({ status: "success", error: "" });
    } catch (error) {
      setAuthState({ status: "error", error: error.message });
    }
  }

  function logout() {
    setSession(initialSession);
    setAuthPayload("");
    setAuthState({ status: "idle", error: "" });
    setEmails({ status: "idle", data: null, error: "" });
    setDigest({ status: "idle", data: null, error: "" });
    setAskResult({ status: "idle", data: null, error: "" });
  }

  if (!hasUserId) {
    return (
      <div className="app-shell auth-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />

        <main className="auth-layout">
          <section className="auth-hero">
            <div className="hero-badge-row">
              <p className="eyebrow">MailLens</p>
              <span className="hero-pill">Google-first sign in</span>
            </div>

            <h1>Sign in with Google to enter your MailLens workspace.</h1>
            <p className="hero-text">
              This frontend now starts with login instead of asking for a manual user id. Your session is created
              from the backend OAuth response and then all dashboard requests use that backend user id.
            </p>

            <div className="highlight-strip auth-highlights">
              <div className="highlight-card">
                <span>Step 1</span>
                <strong>Google</strong>
                <small>Authenticate through the existing backend route.</small>
              </div>
              <div className="highlight-card">
                <span>Step 2</span>
                <strong>Backend</strong>
                <small>Copy the JSON returned by `/auth/google/callback`.</small>
              </div>
              <div className="highlight-card">
                <span>Step 3</span>
                <strong>Workspace</strong>
                <small>We extract `user.id` and unlock the app.</small>
              </div>
            </div>
          </section>

          <section className="glass auth-card">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Login</p>
                <h2>Connect your account</h2>
              </div>
            </div>

            <a className="primary-button auth-button" href={authUrl} target="_blank" rel="noreferrer">
              Continue with Google
            </a>

            <p className="muted-text">
              The current backend returns JSON after OAuth instead of redirecting back to the frontend. Paste that
              backend response below and the app will extract the user id automatically.
            </p>

            <label>
              Backend auth response JSON
              <textarea
                value={authPayload}
                onChange={(event) => setAuthPayload(event.target.value)}
                rows={10}
                placeholder={`{\n  "ok": true,\n  "message": "Google OAuth successful and saved",\n  "user": {\n    "id": "ck...",\n    "email": "you@example.com"\n  }\n}`}
              />
            </label>

            <button className="secondary-button" type="button" disabled={!authPayload.trim()} onClick={completeLogin}>
              Use backend user session
            </button>

            {authState.error ? <p className="error-text">{authState.error}</p> : null}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero">
        <div className="hero-copy">
          <div className="hero-badge-row">
            <p className="eyebrow">MailLens Control Center</p>
            <span className="hero-pill">Signed in as {session.email || session.name || "MailLens user"}</span>
          </div>

          <h1>Modern inbox intelligence on top of your existing API.</h1>
          <p className="hero-text">
            Connect Gmail, trigger indexing flows, browse synced messages, generate your daily digest, and
            ask natural-language questions over your email data from one polished dashboard.
          </p>

          <div className="highlight-strip">
            {quickHighlights.map((item) => (
              <div className="highlight-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-panel glass">
          <div className="panel-topline">
            <span>System status</span>
            <span className={`status-dot status-${health.status}`} />
          </div>

          <div className="stats-grid">
            {statItems.map((item) => (
              <div className="stat-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="inline-note">
            <span>API base</span>
            <code>{API_BASE}</code>
          </div>

          <div className="stack-actions">
            <button className="ghost-button" type="button" onClick={logout}>
              Sign out
            </button>
          </div>

          {health.error ? <p className="error-text">{health.error}</p> : null}
        </div>
      </header>

      <main className="layout-grid">
        <section className="glass section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Account</p>
              <h2>Backend user</h2>
            </div>
          </div>

          <div className="account-summary">
            <div className="account-chip">
              <span>Name</span>
              <strong>{session.name || "Not available"}</strong>
            </div>
            <div className="account-chip">
              <span>Email</span>
              <strong>{session.email || "Not available"}</strong>
            </div>
            <div className="account-chip">
              <span>User ID</span>
              <strong>{session.userId}</strong>
            </div>
          </div>

          <p className="muted-text">All dashboard requests now use this backend-issued user id automatically.</p>
        </section>

        <section className="glass section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Jobs</p>
              <h2>Backend actions</h2>
            </div>
          </div>

          <div className="action-grid">
            {actionConfig.map((action) => {
              const state = actionState[action.key];

              return (
                <article className="action-card" key={action.key}>
                  <div className="card-heading">
                    <span className={`action-icon action-${action.key}`}>{action.label.charAt(0)}</span>
                    <div>
                      <h3>{action.label}</h3>
                      <p>{action.description}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={state?.status === "loading"}
                    onClick={() => runAction(action)}
                  >
                    {state?.status === "loading" ? "Running..." : action.label}
                  </button>

                  {state?.error ? <p className="error-text">{state.error}</p> : null}
                  {state?.data ? (
                    <pre className="result-block">{prettyJson(state.data)}</pre>
                  ) : (
                    <p className="subtle-text">Uses the existing `{action.path}` endpoint.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="glass section-card wide-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Inbox</p>
              <h2>Fetched emails</h2>
            </div>
            <button className="secondary-button" type="button" disabled={emails.status === "loading"} onClick={loadEmails}>
              {emails.status === "loading" ? "Loading..." : "Load emails"}
            </button>
          </div>

          {emails.error ? <p className="error-text">{emails.error}</p> : null}

          <div className="email-list">
            {emails.data?.messages?.length ? (
              emails.data.messages.map((message) => (
                <article className="email-card" key={message.id}>
                  <div className="email-meta">
                    <span>{message.from || "Unknown sender"}</span>
                    <span>{message.date || "No header date"}</span>
                  </div>
                  <h3>{message.subject || "Untitled email"}</h3>
                  <p>{message.snippet || "No snippet available."}</p>
                  <details>
                    <summary>View body</summary>
                    <div className="email-body">{message.body || "No plain-text body available."}</div>
                  </details>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <p>{emails.status === "success" ? "No emails returned." : "Load synced emails to inspect message content here."}</p>
              </div>
            )}
          </div>
        </section>

        <section className="glass section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Digest</p>
              <h2>Today&apos;s summary</h2>
            </div>
            <button className="secondary-button" type="button" disabled={digest.status === "loading"} onClick={loadDigest}>
              {digest.status === "loading" ? "Building..." : "Load digest"}
            </button>
          </div>

          {digest.error ? <p className="error-text">{digest.error}</p> : null}
          {digest.data?.digest ? (
            <div className="digest-card">
              <p className="digest-date">{formatDate(digest.data.digest.digestDate || digest.data.digest.createdAt)}</p>
              <pre className="digest-content">{digest.data.digest.content}</pre>
            </div>
          ) : (
            <p className="subtle-text">The digest endpoint writes and returns the current day&apos;s digest.</p>
          )}
        </section>

        <section className="glass section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Ask</p>
              <h2>Question your inbox</h2>
            </div>
          </div>

          <form className="ask-form" onSubmit={askInbox}>
            <label>
              Question
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={5}
                placeholder="What invoices need action this week?"
              />
            </label>
            <button className="primary-button" type="submit" disabled={!question.trim() || askResult.status === "loading"}>
              {askResult.status === "loading" ? "Thinking..." : "Ask MailLens"}
            </button>
          </form>

          {askResult.error ? <p className="error-text">{askResult.error}</p> : null}

          {askResult.data ? (
            <div className="answer-block">
              <h3>Answer</h3>
              <p>{askResult.data.answer}</p>
              <h3>Matched chunks</h3>
              <div className="match-list">
                {askResult.data.matches?.map((match, index) => (
                  <article className="match-card" key={`${match.emailId || "match"}-${index}`}>
                    <div className="email-meta">
                      <span>{match.fromEmail || "Unknown sender"}</span>
                      <span>{formatDate(match.internalDate)}</span>
                    </div>
                    <strong>{match.subject || "Untitled email"}</strong>
                    <p>{match.content || "No chunk preview."}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <p className="subtle-text">This posts to `/ask` and displays both the answer and the matched email chunks.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
