import crypto from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminConfig } from "@/lib/db/schema";

const AUTH_COOKIE = "snaac_admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;
const ADMIN_PASSWORD_KEY = "admin_password";
const PASSWORD_KEY_LENGTH = 64;

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: string,
  keyLength: number
) => Promise<Buffer>;

type SessionPayload = {
  username: string;
  exp: number;
};

function getSecret() {
  return process.env.ADMIN_SECRET || "change-this-admin-secret-in-env";
}

function getCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
  };
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }
  const expectedSignature = sign(payload);
  if (signature !== expectedSignature) {
    return null;
  }
  const parsed = fromBase64Url<SessionPayload>(payload);
  if (!parsed.exp || parsed.exp < Date.now()) {
    return null;
  }
  return parsed;
}

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const key = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `${salt}.${key.toString("base64url")}`;
}

async function matchesHash(password: string, stored: string) {
  const [salt, hash] = stored.split(".");
  if (!salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

async function getStoredPasswordHash() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  const [row] = await db
    .select({ value: adminConfig.value })
    .from(adminConfig)
    .where(eq(adminConfig.id, ADMIN_PASSWORD_KEY));
  return row?.value ?? null;
}

// Le mot de passe en base remplace ADMIN_PASSWORD. Une erreur de lecture remonte a
// l'appelant : retomber sur ADMIN_PASSWORD reactiverait un ancien mot de passe.
export async function verifyAdminPassword(password: string) {
  const storedHash = await getStoredPasswordHash();
  if (storedHash) {
    return matchesHash(password, storedHash);
  }
  return password === getCredentials().password;
}

export async function saveAdminPassword(password: string) {
  const value = await hashPassword(password);
  const updatedAt = new Date();
  await db
    .insert(adminConfig)
    .values({ id: ADMIN_PASSWORD_KEY, value, updatedAt })
    .onConflictDoUpdate({ target: adminConfig.id, set: { value, updatedAt } });
}

// Seule cette empreinte est stockee : une fuite de la base ne donne aucun lien utilisable.
export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function loginAdmin(username: string, password: string) {
  const credentials = getCredentials();
  if (username !== credentials.username) {
    return false;
  }

  try {
    if (!(await verifyAdminPassword(password))) {
      return false;
    }
  } catch (error) {
    console.error("Admin password check error:", error);
    return false;
  }

  const payload: SessionPayload = {
    username,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const store = await cookies();
  store.set(AUTH_COOKIE, encodeSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(payload.exp),
  });

  return true;
}

export async function logoutAdmin() {
  const store = await cookies();
  store.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) {
    return false;
  }
  return Boolean(decodeSession(token));
}
