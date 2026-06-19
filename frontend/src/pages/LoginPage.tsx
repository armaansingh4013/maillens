import { useNavigate } from "react-router-dom";
import LoginCard from "../components/auth/LoginCard";
import {
  USER_STORAGE_KEY,
} from "../utils/storage";

export default function LoginPage() {
  const navigate = useNavigate();

  function handleLogin(session: any) {
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify(session)
    );

    navigate("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="grid max-w-7xl gap-10 lg:grid-cols-2">
        <div>
          <span className="rounded-full border border-cyan-500/30 px-4 py-2 text-sm text-cyan-400">
            MailLens
          </span>

          <h1 className="mt-6 text-6xl font-bold leading-tight">
            Inbox Intelligence
          </h1>

          <p className="mt-6 text-xl text-slate-400">
            Sync Gmail, summarize emails,
            build daily digests and ask
            questions using AI.
          </p>
        </div>

        <LoginCard
          onLogin={handleLogin}
        />
      </div>
    </div>
  );
}