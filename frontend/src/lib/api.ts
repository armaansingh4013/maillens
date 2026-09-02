import type { UserSession } from "../types";

export const API_BASE = (
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5100"
).replace(/\/$/, "");

export const USER_STORAGE_KEY = "maillens.userSession";

export const EMPTY_SESSION: UserSession = { userId: "", email: "", name: "" };

export function readSession(): UserSession {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? { ...EMPTY_SESSION, ...JSON.parse(stored) } : EMPTY_SESSION;
  } catch {
    return EMPTY_SESSION;
  }
}

export function saveSession(session: UserSession) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session));
}

export function parseAuthPayload(text: string): UserSession {
  const data = JSON.parse(text);
  const user = data?.user;
  if (!data?.ok || !user?.id) {
    throw new Error("Backend auth response must contain `ok: true` and `user.id`.");
  }
  return { userId: user.id, email: user.email || "", name: user.name || "" };
}

export async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data as T;
}

export function formatDate(value?: string): string {
  if (!value) return "Unknown date";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
