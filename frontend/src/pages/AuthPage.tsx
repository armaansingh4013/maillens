import { API_BASE } from "../lib/api";
import { useTheme } from "../hooks/useTheme";

const STEPS = [
  { n: "01", title: "Continue with Google", desc: "Sign in and grant Gmail read access." },
  { n: "02", title: "We take it from there", desc: "Your inbox syncs, gets summarized, and facts get extracted automatically." },
  { n: "03", title: "You land in your workspace", desc: "Redirected straight back here, already signed in." },
];

export function AuthPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-6 overflow-hidden relative">
      {/* Glows — intensity comes from theme-aware CSS vars so this reads as a
          subtle accent in dark mode and doesn't wash the page blue in light mode */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[80px] -top-24 -left-24 pointer-events-none"
        style={{ background: "var(--bg-glow-1)" }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px] -bottom-20 -right-20 pointer-events-none"
        style={{ background: "var(--bg-glow-2)" }}
      />

      <button
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="absolute top-5 right-5 z-20 w-9 h-9 rounded-[9px] bg-surface border border-border grid place-items-center text-text-2 hover:text-text hover:border-teal/40 transition-all text-base"
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left: Hero */}
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-teal via-cyan to-teal-dark rounded-[11px] grid place-items-center text-lg shadow-glow">⬡</div>
            <span className="text-lg font-semibold tracking-tight">MailLens</span>
          </div>

          <h1 className="text-5xl font-semibold tracking-tight leading-[1.1] mb-5">
            Your inbox,<br />intelligently<br />understood.
          </h1>
          <p className="text-text-2 text-sm leading-relaxed max-w-sm mb-9">
            AI-powered email intelligence. Summaries, extracted facts, spend tracking, and natural-language Q&A — all on top of your Gmail.
          </p>

          {/* Steps */}
          <div className="flex flex-col gap-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex items-start gap-4 bg-surface border border-border rounded-[14px] px-4 py-3">
                <span className="text-teal text-xs font-mono pt-0.5 flex-shrink-0">{s.n}</span>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-text-3 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Card */}
        <div className="bg-surface border border-border-2 rounded-[20px] p-8 shadow-lg">
          <p className="text-[10px] font-medium tracking-widest uppercase text-teal mb-1">Get started</p>
          <h2 className="text-xl font-semibold tracking-tight mb-2">Connect your Gmail</h2>
          <p className="text-[12.5px] text-text-3 mb-6">One click — you'll be redirected back here automatically once you approve access.</p>

          {/* Google button — same-tab navigation is required for the
              automatic /dashboard?auth=... callback below to catch it. */}
          <a
            href={`${API_BASE}/auth/google`}
            className="flex items-center justify-center gap-3 w-full bg-white text-gray-800 text-sm font-medium py-3.5 rounded-[10px] hover:opacity-90 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>

          <p className="text-[11px] text-text-3 mt-5 text-center">
            We only request read access to Gmail — MailLens never sends, deletes, or archives anything without you clicking a button first.
          </p>
        </div>
      </div>
    </div>
  );
}
