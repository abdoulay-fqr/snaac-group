// Web Crypto uniquement : ce module est aussi charge par middleware.ts, qui tourne sur Edge.
export const AUTH_COOKIE = "snaac_admin_session";
export const SESSION_MAX_AGE_SECONDS = 2 * 60 * 60;

export type SessionPayload = {
  username: string;
  exp: number;
};

function getSecret() {
  return process.env.ADMIN_SECRET || "change-this-admin-secret-in-env";
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function encodeSession(payload: SessionPayload) {
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(),
    new TextEncoder().encode(encodedPayload)
  );
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function decodeSession(token: string): Promise<SessionPayload | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      fromBase64Url(signature),
      new TextEncoder().encode(payload)
    );
    if (!valid) {
      return null;
    }
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as SessionPayload;
    return parsed.exp && parsed.exp >= Date.now() ? parsed : null;
  } catch {
    // Cookie illisible : traite comme une absence de session.
    return null;
  }
}
