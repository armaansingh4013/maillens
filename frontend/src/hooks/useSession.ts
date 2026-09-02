import { useEffect, useState } from "react";
import { readSession, saveSession, parseAuthPayload, EMPTY_SESSION } from "../lib/api";
import type { UserSession } from "../types";

export function useSession() {
  const [session, setSession] = useState<UserSession>(readSession);

  useEffect(() => {
    saveSession(session);
  }, [session]);


  function login(payload: string): string | null {
    try {
      const next = parseAuthPayload(payload.trim());
      console.log('====================================');
      console.log('Login successful:', next);
      console.log('====================================');
      setSession(next);
      return null;
    } catch (e: any) {
      return e.message;
    }
  }

  function logout() {
    setSession(EMPTY_SESSION);
  }

  return {
    session,
    isLoggedIn: Boolean(session.userId.trim()),
    login,
    logout,
  };
}
