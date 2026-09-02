import { useTheme } from "../../hooks/useTheme";

interface Props {
  onMenuToggle: () => void;
  onSearch: (q: string) => void;
  searchValue: string;
  userInitial: string;
  onSyncClick: () => void;
  syncing: boolean;
  newEmailClick: () => void;
}

export function Topbar({ onMenuToggle, onSearch, searchValue, userInitial, onSyncClick, syncing, newEmailClick }: Props) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="h-[56px] bg-surface/80 backdrop-blur-xl border-b border-border flex items-center gap-3 px-4 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex flex-col gap-1 p-1.5 text-text-2"
      >
        <span className="block w-4 h-[1.5px] bg-current rounded" />
        <span className="block w-4 h-[1.5px] bg-current rounded" />
        <span className="block w-4 h-[1.5px] bg-current rounded" />
      </button>

      {/* Search */}
      <div className="flex-1 relative max-w-[500px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-lg pointer-events-none">⌕</span>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search emails or ask a question…"
          className="w-full bg-surface-2 border border-border-2 rounded-full py-[7px] pl-9 pr-10 text-[13px] text-text placeholder:text-text-3 outline-none focus:border-teal focus:shadow-[0_0_0_3px_rgba(13,148,136,0.15)] transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-3 font-mono opacity-0 focus-within:opacity-100 pointer-events-none transition-opacity">⌘K</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={newEmailClick}
          className="px-4 h-8 rounded-[8px] bg-gradient-to-br from-teal to-cyan text-white text-[12.5px] font-medium hover:brightness-110 hover:shadow-glow transition-all"
        >
          + New Email
        </button>
        <button
          onClick={onSyncClick}
          title="Sync Gmail"
          className={`w-8 h-8 rounded-[8px] bg-surface-2 border border-border grid place-items-center text-text-2 hover:text-text hover:border-teal/40 transition-all text-base ${syncing ? "animate-spin" : ""}`}
        >
          ↻
        </button>
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="w-8 h-8 rounded-[8px] bg-surface-2 border border-border grid place-items-center text-text-2 hover:text-text hover:border-teal/40 transition-all text-base"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-cyan grid place-items-center text-[12px] font-semibold cursor-pointer shadow-glow">
          {userInitial}
        </div>
      </div>
    </header>
  );
}
