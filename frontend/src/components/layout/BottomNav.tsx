import type { NavView } from "./Sidebar";

interface Props { active: NavView; onNav: (v: NavView) => void; }

const ITEMS: { id: NavView; label: string; icon: string }[] = [
  { id: "inbox",    label: "Inbox",    icon: "⊡" },
  { id: "ask",      label: "Ask AI",   icon: "✦" },
  { id: "insights", label: "Insights", icon: "◈" },
  { id: "receipts", label: "Labels",   icon: "◉" },
];

export function BottomNav({ active, onNav }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-surface/90 backdrop-blur-xl border-t border-border flex md:hidden z-[90]">
      {ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors relative"
          >
            {isActive && <span className="absolute top-0 w-8 h-[2px] rounded-full bg-teal" />}
            <span className={`text-xl transition-transform ${isActive ? "text-teal scale-110" : "text-text-3"}`}>{item.icon}</span>
            <span className={isActive ? "text-teal" : "text-text-3"}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
