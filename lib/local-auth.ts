import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "jobapp_session";
export const LOCAL_ADMIN_ID = "00000000-0000-4000-a000-000000000001";

export type LocalUser = {
  id: string;
  email: string;
};

export type AuthResult =
  | { ok: true; user: LocalUser }
  | { ok: false; error: string };

type UserRecord = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
};

const PASSWORD_PEPPER = "jobapp-local-auth-v1";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

function hashPassword(password: string) {
  return createHmac("sha256", PASSWORD_PEPPER).update(password).digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const seededAdmin: UserRecord = {
  id: LOCAL_ADMIN_ID,
  email: "admin@gmail.com",
  username: "admin",
  passwordHash: hashPassword("admin"),
};

let extraUsers: UserRecord[] = [];

export function resetLocalUsersForTests() {
  extraUsers = [];
}

function allUsers() {
  return [seededAdmin, ...extraUsers];
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

function findUser(identifier: string) {
  const value = normalizeIdentifier(identifier);
  return allUsers().find(
    (user) => user.email === value || user.username === value
  );
}

function toLocalUser(record: UserRecord): LocalUser {
  return { id: record.id, email: record.email };
}

export function authenticateLocalUser(
  identifier: string,
  password: string
): AuthResult {
  if (!identifier.trim() || !password) {
    return { ok: false, error: "Invalid credentials" };
  }

  const user = findUser(identifier);
  if (!user || !safeEqual(user.passwordHash, hashPassword(password))) {
    return { ok: false, error: "Invalid credentials" };
  }

  return { ok: true, user: toLocalUser(user) };
}

export function registerLocalUser(
  identifier: string,
  password: string
): AuthResult {
  if (!identifier.trim() || !password) {
    return { ok: false, error: "Email and password are required" };
  }

  const existing = findUser(identifier);
  if (existing) {
    const login = authenticateLocalUser(identifier, password);
    if (login.ok) return login;
    return { ok: false, error: "An account with this email already exists" };
  }

  const normalized = normalizeIdentifier(identifier);
  const email = normalized.includes("@")
    ? normalized
    : `${normalized}@jobapp.local`;
  const username = normalized.includes("@")
    ? normalized.split("@")[0] ?? normalized
    : normalized;

  const record: UserRecord = {
    id: randomUUID(),
    email,
    username,
    passwordHash: hashPassword(password),
  };
  extraUsers.push(record);
  return { ok: true, user: toLocalUser(record) };
}

type SessionPayload = {
  id: string;
  email: string;
  exp: number;
};

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createSessionToken(
  user: LocalUser,
  secret: string,
  now = Math.floor(Date.now() / 1000),
  ttlSeconds = DEFAULT_TTL_SECONDS
) {
  const encoded = encodePayload({
    id: user.id,
    email: user.email,
    exp: now + ttlSeconds,
  });
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000)
): LocalUser | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded, secret);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!payload.id || !payload.email || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp <= now) return null;
    return { id: payload.id, email: payload.email };
  } catch {
    return null;
  }
}

export function getAuthSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.JOB_SYNC_SECRET ||
    process.env.CRON_SECRET ||
    "jobapp-local-dev-secret"
  );
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: DEFAULT_TTL_SECONDS,
  };
}
