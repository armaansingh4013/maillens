import type { EmailMessage } from "../../types";

interface Props { email: EmailMessage; }

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-rose/10 text-rose",
  high:     "bg-rose/10 text-rose",
  medium:   "bg-amber/10 text-amber",
  low:      "bg-emerald/10 text-emerald",
};
const PRIORITY_LABELS: Record<string, string> = {
  critical: "⚠ Critical",
  high:     "⚠ High priority",
  medium:   "● Medium priority",
  low:      "✓ Low priority",
};

function entitiesFor(email: EmailMessage) {
  const s = email.summary;
  const entities: { label: string; icon: string }[] = [];

  const name = (email.from || "").split("<")[0].trim();
  if (name) entities.push({ label: name, icon: "◉" });
  if (s?.platform) entities.push({ label: s.platform, icon: "⬡" });
  if (s?.serviceType) entities.push({ label: s.serviceType, icon: "▣" });
  if (s?.amount) entities.push({ label: s.amount, icon: "◈" });
  if (s?.dueDate) entities.push({ label: `Due ${new Date(s.dueDate).toLocaleDateString()}`, icon: "◷" });
  for (const tag of s?.tags || []) entities.push({ label: tag, icon: "#" });

  return entities;
}

export function AiSummaryCard({ email }: Props) {
  const s = email.summary;

  // Not summarized yet — say so honestly instead of faking a summary.
  if (!s) {
    return (
      <div className="bg-surface-2 border border-border-2 rounded-[14px] p-4 mb-5 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-text-3 animate-pulse flex-shrink-0" />
        <p className="text-[12.5px] text-text-3">
          Not summarized yet — run "Summarize Inbox" from Insights to generate an AI summary for this email.
        </p>
      </div>
    );
  }

  const priority = (s.importance || "low").toLowerCase();
  const entities = entitiesFor(email);

  return (
    <div className="bg-surface-2 border border-border-2 rounded-[14px] p-4 mb-5 relative overflow-hidden">
      {/* Top gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal via-cyan to-emerald" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-teal/15 border border-teal/25 rounded-full px-2.5 py-1 text-[11px] font-medium text-teal">
          ✦ AI Summary{s.topic ? ` · ${s.topic}` : ""}
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.low}`}>
          {PRIORITY_LABELS[priority] || PRIORITY_LABELS.low}
        </span>
      </div>

      {/* Summary */}
      <p className="text-[13px] text-text-2 leading-relaxed mb-3">
        {s.shortSummary || "No summary text was returned for this email."}
      </p>

      {/* Action items */}
      <p className="text-[10px] font-semibold text-text-3 uppercase tracking-widest mb-2">Action items</p>
      <ul className="flex flex-col gap-1.5 mb-3">
        {s.actionRequired && s.actionItem ? (
          <li className="flex items-start gap-2 text-[12.5px] text-text-2">
            <span className="text-amber flex-shrink-0 mt-0.5">!</span>{s.actionItem}
          </li>
        ) : (
          <li className="flex items-start gap-2 text-[12.5px] text-text-2">
            <span className="text-teal flex-shrink-0 mt-0.5">✓</span>No immediate action required
          </li>
        )}
      </ul>

      {/* Entities */}
      {entities.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-text-3 uppercase tracking-widest mb-2">Linked entities</p>
          <div className="flex flex-wrap gap-1.5">
            {entities.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-2 bg-surface-3 text-[11px] text-text-2 cursor-pointer hover:border-teal hover:text-text transition-colors">
                <span>{e.icon}</span>{e.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
