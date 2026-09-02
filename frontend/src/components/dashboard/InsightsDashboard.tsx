import { useEffect, useState } from "react";
import { request } from "../../lib/api";
import { ACTION_CONFIG } from "../../lib/constants";
import { useAsync } from "../../hooks/useAsync";
import type { InsightsSummary } from "../../types";

interface Props {
  userId: string;
}

const DONUT_COLORS = ["#14B8A6", "#10B981", "#F59E0B", "#F43F5E", "#22D3EE", "#0EA5E9", "#EC4899", "#84CC16"];

function timeAgo(value?: string) {
  if (!value) return "";
  const d = new Date(value).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtMoney(n: number, currency: string) {
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(1)}k`;
  return `${symbol}${n.toFixed(0)}`;
}

/* ---------------- tiny inline chart primitives ---------------- */

function Donut({ data }: { data: { key: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const size = 132;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--color-surface-3))" strokeWidth={16} />
        {data.map((d, i) => {
          const frac = d.count / total;
          const dash = frac * circumference;
          const gap = circumference - dash;
          const circle = (
            <circle
              key={d.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={16}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offsetAcc}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          );
          offsetAcc += dash;
          return circle;
        })}
      </svg>
      <div className="flex flex-col gap-1.5 min-w-0">
        {data.slice(0, 6).map((d, i) => (
          <div key={d.key} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="text-[11.5px] text-text-2 truncate capitalize">{d.key}</span>
            <span className="text-[10.5px] text-text-3 font-mono ml-auto pl-2">{d.count}</span>
          </div>
        ))}
        {!data.length && <span className="text-[12px] text-text-3">No data yet</span>}
      </div>
    </div>
  );
}

function BarChart({
  data,
  valueKey,
  secondaryKey,
  labelKey,
}: {
  data: any[];
  valueKey: string;
  secondaryKey?: string;
  labelKey: string;
}) {
  const max = Math.max(1, ...data.map((d) => d[valueKey] || 0));
  return (
    <div className="flex items-end gap-2.5 h-28">
      {data.map((d) => {
        const h = Math.max(4, (d[valueKey] / max) * 100);
        const sh = secondaryKey ? Math.max(0, (d[secondaryKey] / max) * 100) : 0;
        return (
          <div key={d[labelKey]} className="flex flex-col items-center gap-1.5 flex-1 min-w-0 group">
            <div className="relative w-full flex-1 flex items-end justify-center">
              <div
                className="w-full max-w-[22px] rounded-t-[4px] bg-teal/25 group-hover:bg-teal/40 transition-all duration-500 relative overflow-hidden"
                style={{ height: `${h}%` }}
              >
                {secondaryKey && (
                  <div
                    className="absolute bottom-0 left-0 w-full bg-rose/70 rounded-t-[4px]"
                    style={{ height: `${h ? (sh / h) * 100 : 0}%` }}
                  />
                )}
              </div>
              <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono bg-surface-3 border border-border rounded px-1.5 py-0.5 whitespace-nowrap">
                {d[valueKey]}
              </div>
            </div>
            <span className="text-[9.5px] text-text-3">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

function Sparkline({ data }: { data: { month: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const w = 240;
  const h = 56;
  const step = w / Math.max(1, data.length - 1);
  const points = data.map((d, i) => `${i * step},${h - (d.total / max) * (h - 6) - 2}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkFill)" />
      <polyline
        points={points}
        fill="none"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => (
        <circle key={d.month} cx={i * step} cy={h - (d.total / max) * (h - 6) - 2} r="2.5" fill="#5EEAD4" />
      ))}
    </svg>
  );
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const size = 56;
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--color-surface-3))" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

function Card({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface border border-border rounded-[16px] p-5 hover:border-border-2 transition-colors duration-300 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-semibold text-text-2">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ---------------------------- page ---------------------------- */

export function InsightsDashboard({ userId }: Props) {
  const digest = useAsync<any>();
  const insights = useAsync<InsightsSummary>();
  const [actionStates, setActionStates] = useState<Record<string, any>>({});

  function loadInsights() {
    insights.run(() => request(`/insights/summary?userId=${encodeURIComponent(userId)}`));
  }

  useEffect(() => {
    digest.run(() => request(`/digest/today?userId=${encodeURIComponent(userId)}`));
    loadInsights();
  }, [userId]);

  async function runAction(key: string, path: string) {
    setActionStates((s) => ({ ...s, [key]: { loading: true, error: "", done: false } }));
    try {
      await request(`${path}?userId=${encodeURIComponent(userId)}`);
      setActionStates((s) => ({ ...s, [key]: { loading: false, error: "", done: true } }));
      loadInsights();
    } catch (e: any) {
      setActionStates((s) => ({ ...s, [key]: { loading: false, error: e.message, done: false } }));
    }
  }

  const data = insights.data;
  const loading = insights.status === "loading" && !data;

  const kpis = data
    ? [
        {
          label: "Total emails",
          value: String(data.totals.totalEmails),
          delta: `${data.today.received} today`,
          color: "border-teal",
        },
        {
          label: "AI summarized",
          value: `${data.totals.summarizedPct}%`,
          delta: `${data.totals.summarizedEmails} of ${data.totals.totalEmails}`,
          color: "border-emerald",
        },
        {
          label: "Spend this month",
          value: fmtMoney(data.spend.thisMonthTotal, data.spend.currency),
          delta: `${fmtMoney(data.spend.totalAllTime, data.spend.currency)} all time`,
          color: "border-amber",
        },
        {
          label: "Linked accounts",
          value: String(data.subscriptions.total),
          delta: `${data.subscriptions.marketingCount} marketing`,
          color: "border-cyan",
        },
      ]
    : [];

  return (
    <div className="flex-1 overflow-y-auto p-7">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">Insights</h1>
          <p className="text-sm text-text-3">
            AI-powered analysis
            {data && (
              <>
                {" "}
                · <span className="text-emerald">{data.today.received}</span> received today ·{" "}
                <span className="text-rose">{data.today.ads}</span> ads
              </>
            )}
          </p>
        </div>
        <button
          onClick={loadInsights}
          className="text-[12px] text-text-3 hover:text-teal border border-border hover:border-teal/40 rounded-[8px] px-3 py-1.5 transition-colors flex items-center gap-1.5"
        >
          <span className={insights.status === "loading" ? "animate-spin inline-block" : ""}>↻</span>
          Refresh
        </button>
      </div>

      {insights.status === "error" && (
        <div className="mb-5 text-[12.5px] text-rose bg-rose/10 border border-rose/30 rounded-[10px] px-4 py-3">
          Couldn't load insights: {insights.error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-[14px] p-4 h-[86px] animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {kpis.map((s) => (
              <div
                key={s.label}
                className={`bg-surface border border-border rounded-[14px] p-4 border-b-2 ${s.color} hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300`}
              >
                <div className="text-2xl font-semibold tracking-tight font-mono">{s.value}</div>
                <div className="text-[11px] text-text-3 mt-1">{s.label}</div>
                <div className="text-[10px] text-emerald mt-1.5">{s.delta}</div>
              </div>
            ))}
          </div>

          {/* Today snapshot */}
          <Card title="Today's snapshot" className="mb-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <Ring
                  pct={data.today.received ? (data.today.important / data.today.received) * 100 : 0}
                  color="#10B981"
                />
                <div>
                  <p className="text-lg font-semibold font-mono">{data.today.received}</p>
                  <p className="text-[11px] text-text-3">received today</p>
                </div>
              </div>
              <div className="flex gap-5 flex-wrap">
                <div>
                  <p className="text-base font-semibold font-mono text-emerald">{data.today.important}</p>
                  <p className="text-[11px] text-text-3">important</p>
                </div>
                <div>
                  <p className="text-base font-semibold font-mono text-rose">{data.today.ads}</p>
                  <p className="text-[11px] text-text-3">ads / promos</p>
                </div>
                <div>
                  <p className="text-base font-semibold font-mono text-text-2">{data.today.ignored}</p>
                  <p className="text-[11px] text-text-3">filtered out</p>
                </div>
              </div>
              <p className="text-[12px] text-text-3 ml-auto max-w-xs">
                {data.today.received
                  ? `Received ${data.today.received} emails today, ${data.today.ads} were ads or promotions. This is what the evening digest will report.`
                  : "No emails received yet today."}
              </p>
            </div>
          </Card>

          {/* Cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Email volume */}
            <Card title="Email volume · last 7 days">
              <BarChart data={data.emailVolume} valueKey="total" secondaryKey="ads" labelKey="label" />
              <div className="flex items-center gap-4 mt-3 text-[10.5px] text-text-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-teal/40" /> total
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-rose/70" /> ads
                </span>
              </div>
            </Card>

            {/* Category breakdown */}
            <Card title="Email breakdown by category">
              <Donut data={data.breakdown.byCategory} />
            </Card>

            {/* Spend */}
            <Card
              title="Spend trend"
              action={<span className="text-[11px] text-text-3 font-mono">{data.spend.currency}</span>}
            >
              <Sparkline data={data.spend.trend} />
              <div className="flex flex-col gap-1.5 mt-3">
                {data.spend.byVendor.length ? (
                  data.spend.byVendor.map((v) => (
                    <div key={v.vendor} className="flex items-center justify-between">
                      <span className="text-[12px] text-text-2 truncate">{v.vendor}</span>
                      <span className="text-[11.5px] text-amber font-mono">
                        {fmtMoney(v.total, data.spend.currency)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-text-3">No payments detected yet.</p>
                )}
              </div>
            </Card>

            {/* Top linked accounts */}
            <Card title="Top linked accounts">
              <div className="flex flex-col gap-2">
                {data.subscriptions.top.length ? (
                  data.subscriptions.top.map((a, i) => (
                    <div
                      key={a.senderEmail}
                      className="flex items-center gap-2.5 bg-surface-2 rounded-[8px] px-3 py-2 hover:bg-surface-3 transition-colors"
                    >
                      <div
                        className="w-7 h-7 rounded-[6px] grid place-items-center text-[11px] font-semibold flex-shrink-0"
                        style={{
                          color: DONUT_COLORS[i % DONUT_COLORS.length],
                          background: `${DONUT_COLORS[i % DONUT_COLORS.length]}1A`,
                        }}
                      >
                        {a.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="text-[12.5px] font-medium flex-1 truncate">{a.name}</span>
                      {a.isMarketing && (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-rose/10 text-rose flex-shrink-0">
                          marketing
                        </span>
                      )}
                      <span className="text-[10px] text-text-3 font-mono flex-shrink-0">{a.count} emails</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-text-3">No linked accounts detected yet.</p>
                )}
              </div>
            </Card>

            {/* Tasks & jobs */}
            <Card title="Tasks & applications">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-surface-2 rounded-[10px] p-3">
                  <p className="text-lg font-semibold font-mono text-teal">{data.tasks.open}</p>
                  <p className="text-[10.5px] text-text-3">open tasks</p>
                </div>
                <div className="flex-1 bg-surface-2 rounded-[10px] p-3">
                  <p className="text-lg font-semibold font-mono text-emerald">{data.tasks.completed}</p>
                  <p className="text-[10.5px] text-text-3">completed</p>
                </div>
                <div className="flex-1 bg-surface-2 rounded-[10px] p-3">
                  <p className="text-lg font-semibold font-mono text-cyan">{data.jobs.total}</p>
                  <p className="text-[10.5px] text-text-3">job applications</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {data.tasks.upcoming.length ? (
                  data.tasks.upcoming.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px]">
                      <span className="text-text-2 truncate">{t.title}</span>
                      <span className="text-text-3 font-mono flex-shrink-0 ml-2">
                        {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-text-3">No upcoming due dates.</p>
                )}
              </div>
            </Card>

            {/* Memory facts */}
            <Card
              title="Memory facts"
              action={<span className="text-[11px] text-text-3 font-mono">{data.memories.total} stored</span>}
            >
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                {data.memories.recent.length ? (
                  data.memories.recent.map((m, i) => (
                    <div key={i} className="bg-surface-2 rounded-[8px] px-3 py-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[12px] font-medium truncate">{m.title}</span>
                        <span className="text-[9.5px] text-text-3 flex-shrink-0 ml-2">{timeAgo(m.createdAt)}</span>
                      </div>
                      {m.value && <p className="text-[11px] text-text-3 truncate">{m.value}</p>}
                      {m.category && (
                        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full bg-teal/10 text-teal capitalize">
                          {m.category}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-text-3">
                    No memory facts extracted yet — run "Summarize Inbox" below.
                  </p>
                )}
              </div>
            </Card>

            {/* Action items */}
            <Card title="Needs your attention">
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                {data.actionItems.length ? (
                  data.actionItems.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-surface-2 rounded-[8px] px-3 py-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber mt-1.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[12px] text-text-2 leading-snug">{a.item}</p>
                        {a.topic && <p className="text-[10.5px] text-text-3 mt-0.5">{a.topic}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-text-3">Nothing pending — inbox is clear.</p>
                )}
              </div>
            </Card>

            {/* Daily digest */}
            <Card
              title="Today's digest"
              action={
                <button
                  onClick={() => digest.run(() => request(`/digest/today?userId=${encodeURIComponent(userId)}`))}
                  className="text-text-3 hover:text-teal text-base transition-colors"
                >
                  ↻
                </button>
              }
            >
              {digest.status === "loading" && <p className="text-sm text-text-3">Building digest…</p>}
              {digest.status === "error" && <p className="text-xs text-rose">{digest.error}</p>}
              {digest.data?.digest?.content ? (
                <pre className="text-[12px] text-text-2 font-mono whitespace-pre-wrap leading-relaxed bg-surface-2 border border-border rounded-[8px] p-3 max-h-48 overflow-y-auto">
                  {digest.data.digest.content}
                </pre>
              ) : (
                digest.status !== "loading" && (
                  <p className="text-sm text-text-3">No digest yet. Run "Build Digest" below.</p>
                )
              )}
            </Card>

            {/* Backend actions */}
            <Card title="Backend actions">
              <div className="flex flex-col gap-2">
                {ACTION_CONFIG.map((a) => {
                  const st = actionStates[a.key] || {};
                  return (
                    <div
                      key={a.key}
                      className="flex items-center gap-3 bg-surface-2 border border-border rounded-[8px] px-3 py-2.5"
                    >
                      <span className="text-lg flex-shrink-0">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium">{a.label}</p>
                        <p className="text-[11px] text-text-3">{a.description}</p>
                        {st.error && <p className="text-[11px] text-rose mt-0.5">{st.error}</p>}
                        {st.done && <p className="text-[11px] text-emerald mt-0.5">✓ Done</p>}
                      </div>
                      <button
                        disabled={st.loading}
                        onClick={() => runAction(a.key, a.path)}
                        className="px-3 py-1 rounded-[6px] bg-teal text-white text-[12px] hover:bg-teal-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      >
                        {st.loading ? "…" : "Run"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
