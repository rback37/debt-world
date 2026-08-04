import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { HttpError, cleanText } from "@/lib/vault-server";

export const ACCOUNT_SESSION_COOKIE = "dw_account";
const SESSION_DAYS = 30;
const MAX_PASSWORD_ITERATIONS = 100_000;
const DEFAULT_PASSWORD_ITERATIONS = MAX_PASSWORD_ITERATIONS;
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "official",
  "support",
  "debtworld",
  "debt-world",
  "上岸星球",
]);
const SIGNUP_SOURCES = new Set(["direct", "github", "xiaohongshu", "weibo", "reddit", "x", "producthunt", "showhn", "friend", "referral", "other"]);
let accountStorageSchemaPromise: Promise<void> | null = null;

export type AccountRow = {
  id: string;
  user_code: string;
  username: string;
  username_normalized: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
  last_seen_at: string | null;
};

type PasswordAccountRow = AccountRow & {
  password_hash: string;
  password_salt: string;
  password_iterations: number;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2) return new Uint8Array();
  return new Uint8Array(value.match(/.{2}/g)!.map((part) => Number.parseInt(part, 16)));
}

function randomHex(byteLength: number) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function readCookie(request: Request, name: string) {
  const source = request.headers.get("Cookie") ?? "";
  for (const part of source.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export function accountSessionToken(request: Request) {
  const token = readCookie(request, ACCOUNT_SESSION_COOKIE);
  return /^[a-f0-9]{64}$/i.test(token) ? token.toLowerCase() : "";
}

export function normalizeUsername(value: unknown) {
  const display = cleanText(value, 30).normalize("NFKC");
  const normalized = display.toLocaleLowerCase("und");
  if (display.length < 3 || !/^[\p{L}\p{N}][\p{L}\p{N}._-]{2,29}$/u.test(display)) {
    throw new HttpError(400, "Username must be 3–30 letters or numbers; dots, underscores, and hyphens are allowed after the first character.");
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    throw new HttpError(400, "That username is reserved. Choose another one.");
  }
  return { display, normalized };
}

function validatePassword(value: unknown) {
  if (typeof value !== "string" || value.length < 10 || value.length > 128) {
    throw new HttpError(400, "Password must contain 10–128 characters.");
  }
  if (!/[\p{L}]/u.test(value) || !/[\p{N}]/u.test(value)) {
    throw new HttpError(400, "Password must include at least one letter and one number.");
  }
  return value;
}

function passwordIterations() {
  const workerEnv = env as unknown as Record<string, unknown>;
  const configured = Number(workerEnv.ACCOUNT_PASSWORD_ITERATIONS ?? DEFAULT_PASSWORD_ITERATIONS);
  return Number.isInteger(configured) && configured >= 1_000
    ? Math.min(configured, MAX_PASSWORD_ITERATIONS)
    : DEFAULT_PASSWORD_ITERATIONS;
}

async function derivePassword(password: string, saltHex: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function consumeAuthLimit(request: Request, action: "register" | "login", normalizedUsername: string) {
  const now = new Date();
  const windowKey = action === "register"
    ? now.toISOString().slice(0, 10)
    : `${now.toISOString().slice(0, 13)}:${String(Math.floor(now.getUTCMinutes() / 15) * 15).padStart(2, "0")}`;
  const ip = cleanText(request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0], 80, "unknown");
  const limitSubject = action === "register" ? "new-account" : normalizedUsername;
  const limitKey = await sha256Hex(`${action}:${windowKey}:${ip}:${limitSubject}`);
  const maxAttempts = action === "register" ? 8 : 12;
  const db = getD1();
  await db.prepare(
    `INSERT OR IGNORE INTO account_auth_limits (limit_key, action, window_key, attempts)
     VALUES (?1, ?2, ?3, 0)`,
  ).bind(limitKey, action, windowKey).run();
  const updated = await db.prepare(
    `UPDATE account_auth_limits SET attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
     WHERE limit_key = ?1 AND attempts < ?2`,
  ).bind(limitKey, maxAttempts).run();
  if (Number(updated.meta?.changes ?? 0) < 1) {
    throw new HttpError(429, "Too many attempts. Please wait before trying again.");
  }
}

function newUserCode() {
  return `SHORE-${randomHex(5).toUpperCase()}`;
}

export function normalizeSignupSource(value: unknown) {
  const source = cleanText(value, 24).toLowerCase().replace(/[^a-z]/g, "");
  return SIGNUP_SOURCES.has(source) ? source : source ? "other" : "direct";
}

async function addMissingColumn(table: string, column: string, definition: string) {
  const db = getD1();
  const columns = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (columns.results.some((item) => item.name === column)) return;
  try {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column/i.test(message)) throw error;
  }
}

export async function ensureAccountStorageSchema() {
  if (!accountStorageSchemaPromise) {
    accountStorageSchemaPromise = (async () => {
      const db = getD1();
      await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY NOT NULL,
          user_code TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL,
          username_normalized TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          password_iterations INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          signup_source TEXT NOT NULL DEFAULT 'direct',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_login_at TEXT,
          last_seen_at TEXT
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS account_auth_limits (
          limit_key TEXT PRIMARY KEY NOT NULL,
          action TEXT NOT NULL,
          window_key TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS account_sessions (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS account_vaults (
          account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          vault_id TEXT NOT NULL UNIQUE REFERENCES vaults(id) ON DELETE CASCADE,
          linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
      ]);

      await addMissingColumn("accounts", "status", "TEXT NOT NULL DEFAULT 'active'");
      await addMissingColumn("accounts", "signup_source", "TEXT NOT NULL DEFAULT 'direct'");
      await addMissingColumn("accounts", "updated_at", "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'");
      await addMissingColumn("accounts", "last_login_at", "TEXT");
      await addMissingColumn("accounts", "last_seen_at", "TEXT");
      await addMissingColumn("account_auth_limits", "updated_at", "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'");
      await addMissingColumn("account_sessions", "created_at", "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'");
      await addMissingColumn("account_sessions", "last_seen_at", "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'");
      await addMissingColumn("account_vaults", "linked_at", "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'");

      await db.batch([
        db.prepare("CREATE INDEX IF NOT EXISTS accounts_created_idx ON accounts(created_at)"),
        db.prepare("CREATE INDEX IF NOT EXISTS account_auth_limits_window_idx ON account_auth_limits(window_key)"),
        db.prepare("CREATE INDEX IF NOT EXISTS account_sessions_account_idx ON account_sessions(account_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS account_sessions_expires_idx ON account_sessions(expires_at)"),
        db.prepare("CREATE INDEX IF NOT EXISTS account_vaults_vault_idx ON account_vaults(vault_id)"),
      ]);
    })().catch((error) => {
      accountStorageSchemaPromise = null;
      throw error;
    });
  }
  return accountStorageSchemaPromise;
}

export async function ensureAccountSignupSourceSchema() {
  return ensureAccountStorageSchema();
}

async function createSession(accountId: string) {
  const rawToken = randomHex(32);
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await getD1().prepare(
    `INSERT INTO account_sessions (id, account_id, token_hash, expires_at)
     VALUES (?1, ?2, ?3, ?4)`,
  ).bind(crypto.randomUUID(), accountId, tokenHash, expiresAt).run();
  return rawToken;
}

export function withAccountSession(response: Response, request: Request, rawToken: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${ACCOUNT_SESSION_COOKIE}=${rawToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}${secure}`,
  );
  return response;
}

export async function clearAccountSession(response: Response, request: Request) {
  const rawToken = accountSessionToken(request);
  if (rawToken) {
    await getD1().prepare("DELETE FROM account_sessions WHERE token_hash = ?1").bind(await sha256Hex(rawToken)).run();
  }
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${ACCOUNT_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
  return response;
}

export async function getAccount(request: Request) {
  const rawToken = accountSessionToken(request);
  if (!rawToken) return null;
  const tokenHash = await sha256Hex(rawToken);
  const account = await getD1().prepare(
    `SELECT a.id, a.user_code, a.username, a.username_normalized, a.status,
            a.created_at, a.last_login_at, a.last_seen_at
     FROM account_sessions s
     JOIN accounts a ON a.id = s.account_id
     WHERE s.token_hash = ?1 AND datetime(s.expires_at) > datetime('now') AND a.status = 'active'
     LIMIT 1`,
  ).bind(tokenHash).first<AccountRow>();
  if (!account) return null;
  await getD1().batch([
    getD1().prepare(
      `UPDATE account_sessions SET last_seen_at = CURRENT_TIMESTAMP
       WHERE token_hash = ?1 AND last_seen_at < datetime('now', '-10 minutes')`,
    ).bind(tokenHash),
    getD1().prepare(
      `UPDATE accounts SET last_seen_at = CURRENT_TIMESTAMP
       WHERE id = ?1 AND (last_seen_at IS NULL OR last_seen_at < datetime('now', '-10 minutes'))`,
    ).bind(account.id),
  ]);
  return account;
}

export async function requireAccount(request: Request) {
  const account = await getAccount(request);
  if (!account) throw new HttpError(401, "Sign in to continue.");
  return account;
}

export async function accountHasVault(accountId: string) {
  const link = await getD1().prepare(
    "SELECT vault_id FROM account_vaults WHERE account_id = ?1 LIMIT 1",
  ).bind(accountId).first<{ vault_id: string }>();
  return Boolean(link?.vault_id);
}

export async function registerAccount(request: Request, usernameValue: unknown, passwordValue: unknown, signupSourceValue?: unknown) {
  let stage = "validation";
  try {
    const username = normalizeUsername(usernameValue);
    const password = validatePassword(passwordValue);
    const signupSource = normalizeSignupSource(signupSourceValue);
    stage = "storage_schema";
    await ensureAccountStorageSchema();
    stage = "rate_limit";
    await consumeAuthLimit(request, "register", username.normalized);
    const db = getD1();
    stage = "username_check";
    const existing = await db.prepare(
      "SELECT id FROM accounts WHERE username_normalized = ?1 LIMIT 1",
    ).bind(username.normalized).first<{ id: string }>();
    if (existing) throw new HttpError(409, "That username is already in use.");
    const salt = randomHex(16);
    const iterations = passwordIterations();
    stage = "password_hash";
    const passwordHash = await derivePassword(password, salt, iterations);
    const id = crypto.randomUUID();
    stage = "account_insert";
    await db.prepare(
      `INSERT INTO accounts
        (id, user_code, username, username_normalized, password_hash, password_salt, password_iterations,
         signup_source, last_login_at, last_seen_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    ).bind(id, newUserCode(), username.display, username.normalized, passwordHash, salt, iterations, signupSource).run();
    stage = "account_readback";
    const account = await db.prepare(
      `SELECT id, user_code, username, username_normalized, status, created_at, last_login_at, last_seen_at
       FROM accounts WHERE id = ?1`,
    ).bind(id).first<AccountRow>();
    if (!account) throw new Error("Account registration did not return a record.");
    stage = "session_create";
    return { account, rawToken: await createSession(id) };
  } catch (error) {
    if (error instanceof Error && /unique/i.test(error.message)) {
      throw new HttpError(409, "That username is already in use.");
    }
    if (!(error instanceof HttpError)) {
      const message = error instanceof Error ? error.message.slice(0, 300) : "Unknown account storage failure";
      console.error("Debt World account registration failed", { stage, message });
    }
    throw error;
  }
}

export async function loginAccount(request: Request, usernameValue: unknown, passwordValue: unknown) {
  const username = normalizeUsername(usernameValue);
  const password = validatePassword(passwordValue);
  await ensureAccountStorageSchema();
  await consumeAuthLimit(request, "login", username.normalized);
  const db = getD1();
  const account = await db.prepare(
    `SELECT id, user_code, username, username_normalized, password_hash, password_salt, password_iterations,
            status, created_at, last_login_at, last_seen_at
     FROM accounts WHERE username_normalized = ?1 LIMIT 1`,
  ).bind(username.normalized).first<PasswordAccountRow>();
  if (!account || account.status !== "active") {
    throw new HttpError(401, "Username or password is incorrect.");
  }
  const candidate = await derivePassword(password, account.password_salt, account.password_iterations);
  if (!constantTimeEqual(candidate, account.password_hash)) {
    throw new HttpError(401, "Username or password is incorrect.");
  }
  await db.prepare(
    "UPDATE accounts SET last_login_at = CURRENT_TIMESTAMP, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?1",
  ).bind(account.id).run();
  return { account, rawToken: await createSession(account.id) };
}

export function publicAccount(account: AccountRow, vaultLinked: boolean) {
  return {
    userCode: account.user_code,
    username: account.username,
    createdAt: account.created_at,
    vaultLinked,
  };
}
