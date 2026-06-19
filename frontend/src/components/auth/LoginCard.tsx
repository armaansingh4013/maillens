import { useState } from "react";
import { parseAuthPayload } from "../../utils/auth";
import { apiBase } from "../../api/client";
import { Session } from "../../types";

interface Props {
  onLogin: (session: Session) => void;
}

export default function LoginCard({
  onLogin,
}: Props) {
  const [payload, setPayload] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    try {
      const session = parseAuthPayload(payload);
      onLogin(session);
      setPayload("");
      setError("");
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <h2 className="mb-6 text-3xl font-bold">
        Connect Gmail      </h2>

      <a
        href={`${apiBase}/auth/google`}
        className="mb-6 block rounded-xl bg-cyan-500 px-4 py-3 text-center font-semibold"
      >
        Continue with Google
      </a>

      <p className="mb-3 text-sm text-slate-400">
        After Google approves access, MailLens redirects
        back here and signs you in automatically.
      </p>

      <textarea
        rows={10}
        value={payload}
        onChange={(e) =>
          setPayload(e.target.value)
        }
        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4"
        placeholder="Optional fallback: paste backend OAuth JSON response..."
      />

      <button
        onClick={handleLogin}
        className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold"
      >
        Login
      </button>

      {error && (
        <p className="mt-3 text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
