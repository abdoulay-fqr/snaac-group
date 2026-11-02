import crypto from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminConfig } from "@/lib/db/schema";
import { AUTH_COOKIE, decodeSession, encodeSession, SESSION_MAX_AGE_SECONDS, type SessionPayload } from "@/lib/session";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
} as const;

const ADMIN_PASSWORD_KEY = "admin_password";
const PASSWORD_KEY_LENGTH = 64;

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: string,
  keyLength: number
) => Promise<Buffer>;

function getCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
  };
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
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const store = await cookies();
  store.set(AUTH_COOKIE, await encodeSession(payload), { ...COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_SECONDS });

  return true;
}

export async function logoutAdmin() {
  const store = await cookies();
  store.set(AUTH_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) {
    return false;
  }
  return Boolean(await decodeSession(token));
}
