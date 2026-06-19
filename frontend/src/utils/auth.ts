import { Session } from "../types";

function decodeBase64Url(value: string) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(
      Math.ceil(value.length / 4) * 4,
      "="
    );

  return atob(base64);
}

export function parseAuthPayload(text: string): Session {
  const data = JSON.parse(text);

  const user = data?.user;

  if (!data?.ok || !user?.id) {
    throw new Error(
      "Backend auth response must contain ok=true and user.id"
    );
  }

  return {
    userId: user.id,
    email: user.email || "",
    name: user.name || "",
  };
}

export function parseAuthRedirectPayload(
  payload: string
): Session {
  return parseAuthPayload(
    decodeBase64Url(payload)
  );
}
