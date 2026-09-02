export type NavView = "inbox" | "urgent" | "sent" | "ask" | "insights" | "receipts" | "social" | "newsletters";

export interface NavCounts {
  inbox: number;
  urgent: number;
  sent: number;
  receipts: number;
  social: number;
  newsletters: number;
}

interface Props {
  active: NavView;
  onNav: (v: NavView) => void;
  userName: string;
  userEmail: string;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  counts?: NavCounts;
}

function buildNavGroups(counts?: NavCounts) {
  return [
    {
      label: "Inbox",
      items: [
        { id: "inbox", label: "All Mail", icon: "⊡", badge: counts ? String(counts.inbox) : undefined },
        { id: "urgent", label: "Urgent", icon: "⚠", badge: counts ? String(counts.urgent) : undefined, red: true },
        { id: "sent", label: "Sent", icon: "↗", badge: counts ? String(counts.sent) : undefined },
      ],
    },
    {
      label: "AI",
      items: [
        { id: "ask", label: "Ask Inbox", icon: "✦", badge: "AI", green: true },
        { id: "insights", label: "Insights", icon: "◈" },
      ],
    },
    {
      label: "Labels",
      items: [
        { id: "receipts", label: "Receipts", icon: "◉", badge: counts ? String(counts.receipts) : undefined },
        { id: "social", label: "Social", icon: "◎", badge: counts ? String(counts.social) : undefined },
        { id: "newsletters", label: "Newsletters", icon: "▣", badge: counts ? String(counts.newsletters) : undefined },
      ],
    },
  ];
}

export function Sidebar({ active, onNav, userName, userEmail, onLogout, isOpen, onClose, counts }: Props) {
  const navGroups = buildNavGroups(counts);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[99] md:hidden backdrop-blur-sm" onClick={onClose} />}

      <aside className={`
        w-[224px] backdrop-blur-xl border-r border-border flex flex-col flex-shrink-0 overflow-y-auto z-[100]
        fixed top-0 left-0 bottom-0 transition-transform duration-200
        ${isOpen ? "translate-x-0 shadow-lg" : "-translate-x-full"}
        md:relative md:translate-x-0 md:shadow-none
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-teal via-cyan to-teal-dark rounded-[9px] grid place-items-center text-base shadow-glow">⬡</div>
          <div>
            <div className="text-[15px] font-semibold tracking-tight">MailLens</div>
            <div className="text-[10px] text-text-3 font-mono">AI · v1.0</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="text-[9.5px] font-medium tracking-widest uppercase text-text-3 px-2 mb-1">{group.label}</p>
              {group.items.map((item: any) => {
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNav(item.id as NavView); onClose(); }}
                    className={`
                      w-full flex items-center gap-2.5 px-2 py-[7px] rounded-[8px] text-[13px] text-left transition-all duration-150
                      ${isActive
                        ? "bg-gradient-to-r from-teal/20 to-transparent text-text border-l-2 border-teal -ml-0.5 pl-[9px]"
                        : "text-text-2 hover:bg-surface-2 hover:text-text"
                      }
                    `}
                  >
                    <span className={`text-[15px] w-5 text-center flex-shrink-0 ${isActive ? "text-teal" : ""}`}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full font-mono ${
                        item.red   ? "bg-rose/15 text-rose" :
                        item.green ? "bg-emerald/15 text-emerald" :
                        "bg-surface-3 text-text-3"
                      }`}>{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2.5 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-[8px]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal to-cyan grid place-items-center text-[11px] font-semibold flex-shrink-0">
              {(userName || userEmail || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate">{userName || "User"}</div>
              <div className="text-[10px] text-text-3 truncate">{userEmail}</div>
            </div>
            <button onClick={onLogout} className="text-text-3 hover:text-rose text-sm transition-colors px-1" title="Sign out">⎋</button>
          </div>
        </div>
      </aside>
    </>
  );
}
