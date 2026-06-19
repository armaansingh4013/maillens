import { Session } from "../types";

export const USER_STORAGE_KEY = "maillens.userSession";

export const initialSession: Session = {
  userId: "",
  email: "",
  name: "",
};

export function readSession(): Session {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);

    return stored
      ? { ...initialSession, ...JSON.parse(stored) }
      : initialSession;
  } catch {
    return initialSession;
  }
}