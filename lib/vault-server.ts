import { getD1 } from "@/db";

export const SESSION_COOKIE = "dw_vault";
const ACCOUNT_SESSION_COOKIE = "dw_account";
const RECOVERY_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
let vaultStorageSchemaPromise: Promise<void> | null = null;

export const debtKinds = new Set([
  "mortgage",
  "card",
  "education",
  "medical",
  "car",
  "personal",
  "business",
  "bnpl",
  "informal",
  "other",
]);

export type VaultRow = {
  id: string;
  recovery_hash: string;
  alias: string;
  region: string;
  pressure: string;
  age_band: string;
  gender: string;
  mbti: string;
  zodiac: string;
  self_description: string;
  repayment_plan: string;
  repayment_outlook: string;
  income_plan: string;
  position_x: number;
  position_y: number;
  locale: string;
  country_code: string;
  country_name: string;
  display_currency: string;
  monthly_income: number;
  monthly_expenses: number;
  discovery_consent: number;
  created_at: string;
  updated_at: string;
};

export type DebtInput = {
  id?: string;
  kind?: string;
  customLabel?: string;
  currency?: string;
  original?: number;
  balance?: number;
  monthly?: number;
  apr?: number | null;
  minimumPayment?: number | null;
  paymentStatus?: string;
  remainingMonths?: number | null;
  dueDay?: number;
  method?: string;
  sharingMode?: string;
  lastPaidAt?: string;
  payments?: number;
  history?: { confirmedAt?: string; cashPayment?: number; newBalance?: number; source?: string; incomeType?: string; eventDate?: string }[];
};

export function noStoreJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, private");
  return Response.json(body, { ...init, headers });
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  const expected = new URL(request.url).origin;
  if (!origin || origin !== expected) {
    throw new HttpError(403, "Request origin could not be verified.");
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function routeError(error: unknown) {
  if (error instanceof HttpError) {
    return noStoreJson({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) {
    return noStoreJson(
      { error: "Cloud storage is being prepared. Please try again after the latest deployment completes." },
      { status: 503 },
    );
  }
  return noStoreJson({ error: "The vault could not be updated. Please try again." }, { status: 500 });
}

async function addMissingVaultColumn(table: string, column: string, definition: string) {
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

export async function ensureVaultStorageSchema() {
  if (!vaultStorageSchemaPromise) {
    vaultStorageSchemaPromise = (async () => {
      const db = getD1();
      await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS vaults (
          id TEXT PRIMARY KEY NOT NULL,
          recovery_hash TEXT NOT NULL UNIQUE,
          alias TEXT NOT NULL,
          region TEXT NOT NULL,
          pressure TEXT NOT NULL DEFAULT '',
          age_band TEXT NOT NULL DEFAULT '',
          gender TEXT NOT NULL DEFAULT '',
          mbti TEXT NOT NULL DEFAULT '',
          zodiac TEXT NOT NULL DEFAULT '',
          self_description TEXT NOT NULL DEFAULT '',
          repayment_plan TEXT NOT NULL DEFAULT '',
          repayment_outlook TEXT NOT NULL DEFAULT '',
          income_plan TEXT NOT NULL DEFAULT '',
          position_x REAL NOT NULL DEFAULT 47,
          position_y REAL NOT NULL DEFAULT 63,
          locale TEXT NOT NULL DEFAULT 'zh',
          country_code TEXT NOT NULL DEFAULT '',
          country_name TEXT NOT NULL DEFAULT '',
          display_currency TEXT NOT NULL DEFAULT 'CNY',
          monthly_income REAL NOT NULL DEFAULT 0,
          monthly_expenses REAL NOT NULL DEFAULT 0,
          discovery_consent INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS debts (
          id TEXT PRIMARY KEY NOT NULL,
          vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
          kind TEXT NOT NULL,
          custom_label TEXT,
          currency TEXT NOT NULL,
          original REAL NOT NULL,
          balance REAL NOT NULL,
          monthly REAL NOT NULL,
          apr REAL,
          minimum_payment REAL,
          payment_status TEXT NOT NULL DEFAULT 'unknown',
          remaining_months INTEGER,
          due_day INTEGER NOT NULL,
          method TEXT NOT NULL,
          sharing_mode TEXT NOT NULL DEFAULT 'private',
          last_paid_at TEXT,
          payments INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS payment_records (
          id TEXT PRIMARY KEY NOT NULL,
          vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
          debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
          scheduled_date TEXT,
          confirmed_at TEXT NOT NULL,
          event_date TEXT,
          cash_payment REAL NOT NULL,
          new_balance REAL NOT NULL,
          source TEXT NOT NULL DEFAULT 'self_report',
          income_type TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS policy_acceptances (
          id TEXT PRIMARY KEY NOT NULL,
          vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
          policy_key TEXT NOT NULL,
          policy_version TEXT NOT NULL,
          accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS beta_enrollments (
          id TEXT PRIMARY KEY NOT NULL,
          vault_id TEXT NOT NULL UNIQUE REFERENCES vaults(id) ON DELETE CASCADE,
          invite_digest TEXT NOT NULL,
          consent_version TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS beta_feedback (
          id TEXT PRIMARY KEY NOT NULL,
          vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
          category TEXT NOT NULL,
          rating INTEGER NOT NULL,
          message TEXT NOT NULL,
          page_path TEXT NOT NULL DEFAULT '/',
          status TEXT NOT NULL DEFAULT 'open',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          resolved_at TEXT
        )`),
      ]);

      const vaultColumns: Array<[string, string]> = [
        ["pressure", "TEXT NOT NULL DEFAULT ''"], ["age_band", "TEXT NOT NULL DEFAULT ''"],
        ["gender", "TEXT NOT NULL DEFAULT ''"], ["mbti", "TEXT NOT NULL DEFAULT ''"],
        ["zodiac", "TEXT NOT NULL DEFAULT ''"], ["self_description", "TEXT NOT NULL DEFAULT ''"],
        ["repayment_plan", "TEXT NOT NULL DEFAULT ''"], ["repayment_outlook", "TEXT NOT NULL DEFAULT ''"],
        ["income_plan", "TEXT NOT NULL DEFAULT ''"], ["position_x", "REAL NOT NULL DEFAULT 47"],
        ["position_y", "REAL NOT NULL DEFAULT 63"], ["locale", "TEXT NOT NULL DEFAULT 'zh'"],
        ["country_code", "TEXT NOT NULL DEFAULT ''"], ["country_name", "TEXT NOT NULL DEFAULT ''"],
        ["display_currency", "TEXT NOT NULL DEFAULT 'CNY'"], ["monthly_income", "REAL NOT NULL DEFAULT 0"],
        ["monthly_expenses", "REAL NOT NULL DEFAULT 0"], ["discovery_consent", "INTEGER NOT NULL DEFAULT 0"],
        ["created_at", "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'"],
        ["updated_at", "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'"],
      ];
      for (const [column, definition] of vaultColumns) await addMissingVaultColumn("vaults", column, definition);

      const debtColumns: Array<[string, string]> = [
        ["custom_label", "TEXT"], ["apr", "REAL"], ["minimum_payment", "REAL"],
        ["payment_status", "TEXT NOT NULL DEFAULT 'unknown'"], ["remaining_months", "INTEGER"],
        ["sharing_mode", "TEXT NOT NULL DEFAULT 'private'"], ["last_paid_at", "TEXT"],
        ["payments", "INTEGER NOT NULL DEFAULT 0"],
        ["created_at", "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'"],
        ["updated_at", "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'"],
      ];
      for (const [column, definition] of debtColumns) await addMissingVaultColumn("debts", column, definition);

      const paymentColumns: Array<[string, string]> = [
        ["scheduled_date", "TEXT"], ["event_date", "TEXT"], ["source", "TEXT NOT NULL DEFAULT 'self_report'"],
        ["income_type", "TEXT"], ["created_at", "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'"],
      ];
      for (const [column, definition] of paymentColumns) await addMissingVaultColumn("payment_records", column, definition);

      await db.batch([
        db.prepare("CREATE INDEX IF NOT EXISTS debts_vault_id_idx ON debts(vault_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS payments_vault_id_idx ON payment_records(vault_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS payments_debt_id_idx ON payment_records(debt_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS policy_acceptance_vault_idx ON policy_acceptances(vault_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS beta_enrollments_created_idx ON beta_enrollments(created_at)"),
        db.prepare("CREATE INDEX IF NOT EXISTS beta_feedback_vault_idx ON beta_feedback(vault_id)"),
        db.prepare("CREATE INDEX IF NOT EXISTS beta_feedback_status_idx ON beta_feedback(status)"),
      ]);
    })().catch((error) => {
      vaultStorageSchemaPromise = null;
      throw error;
    });
  }
  return vaultStorageSchemaPromise;
}

export async function ensureAccountWorld(accountId: string, locale: "zh" | "en" = "zh") {
  await ensureVaultStorageSchema();
  const db = getD1();
  const linked = await db.prepare(
    `SELECT v.* FROM account_vaults av
     JOIN vaults v ON v.id = av.vault_id
     WHERE av.account_id = ?1 LIMIT 1`,
  ).bind(accountId).first<VaultRow>();
  if (linked) return linked;

  const vaultId = `world-${accountId}`;
  const recoveryHash = await hashRecoveryCode(`account-world:${accountId}`);
  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO vaults
        (id, recovery_hash, alias, region, locale, display_currency, discovery_consent)
       VALUES (?1, ?2, 'Shore Walker', 'Not shared', ?3, ?4, 1)`,
    ).bind(vaultId, recoveryHash, locale, locale === "en" ? "USD" : "CNY"),
    db.prepare(
      `INSERT OR IGNORE INTO account_vaults (account_id, vault_id)
       VALUES (?1, ?2)`,
    ).bind(accountId, vaultId),
  ]);
  const created = await db.prepare("SELECT * FROM vaults WHERE id = ?1 LIMIT 1").bind(vaultId).first<VaultRow>();
  if (!created) throw new Error("The shared world record could not be created.");
  return created;
}

export function cleanText(value: unknown, max: number, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

export function cleanNumber(value: unknown, min: number, max: number, fallback?: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    if (fallback !== undefined) return fallback;
    throw new HttpError(400, "A number is missing or invalid.");
  }
  return Math.min(max, Math.max(min, parsed));
}

function cleanOptionalNumber(value: unknown, min: number, max: number, round = false) {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = cleanNumber(value, min, max);
  return round ? Math.round(cleaned) : cleaned;
}

export function validateDebt(input: DebtInput) {
  const kind = debtKinds.has(input.kind ?? "") ? input.kind! : "other";
  const currency = cleanText(input.currency, 8, "CNY").toUpperCase();
  const balance = cleanNumber(input.balance, 0, 1_000_000_000_000);
  const original = Math.max(balance, cleanNumber(input.original, 0, 1_000_000_000_000));
  const history = Array.isArray(input.history)
    ? input.history.slice(0, 500).map((entry) => ({
        confirmedAt: typeof entry.confirmedAt === "string"
          ? entry.confirmedAt.slice(0, 40)
          : new Date().toISOString(),
        cashPayment: cleanNumber(entry.cashPayment, 0, 1_000_000_000_000, 0),
        newBalance: cleanNumber(entry.newBalance, 0, 1_000_000_000_000, balance),
        source: entry.source === "prepayment" || entry.source === "lucky_income" ? entry.source : "self_report",
        incomeType: cleanText(entry.incomeType, 40) || null,
        eventDate: /^\d{4}-\d{2}-\d{2}$/.test(entry.eventDate ?? "")
          ? entry.eventDate!
          : (typeof entry.confirmedAt === "string" ? entry.confirmedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      }))
    : [];
  return {
    id: typeof input.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(input.id)
      ? input.id
      : crypto.randomUUID(),
    kind,
    customLabel: kind === "other" ? cleanText(input.customLabel, 80) || null : null,
    currency: currency || "CNY",
    original,
    balance,
    monthly: cleanNumber(input.monthly, 0, 1_000_000_000_000),
    apr: cleanOptionalNumber(input.apr, 0, 1_000),
    minimumPayment: cleanOptionalNumber(input.minimumPayment, 0, 1_000_000_000_000),
    paymentStatus: input.paymentStatus === "current" || input.paymentStatus === "late" || input.paymentStatus === "collection"
      ? input.paymentStatus
      : "unknown",
    remainingMonths: cleanOptionalNumber(input.remainingMonths, 1, 1_200, true),
    dueDay: Math.round(cleanNumber(input.dueDay, 1, 31)),
    method: cleanText(input.method, 80, "Self reported") || "Self reported",
    sharingMode: input.sharingMode === "range" ? "range" : "private",
    lastPaidAt: typeof input.lastPaidAt === "string" ? input.lastPaidAt.slice(0, 40) : null,
    payments: Math.round(cleanNumber(input.payments, 0, 1_000_000, 0)),
    history,
  };
}

export function normalizeRecoveryCode(value: unknown) {
  if (typeof value !== "string") return "";
  return value.toUpperCase().replace(/[^A-Z2-9]/g, "");
}

export function generateRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const raw = `DW${Array.from(bytes, (byte) => RECOVERY_ALPHABET[byte & 31]).join("")}`;
  return {
    raw,
    display: `${raw.slice(0, 2)}-${raw.slice(2).match(/.{1,4}/g)?.join("-") ?? raw.slice(2)}`,
  };
}

export async function hashRecoveryCode(code: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readCookie(request: Request, name: string) {
  const source = request.headers.get("Cookie") ?? "";
  for (const part of source.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export async function requireVault(request: Request) {
  const accountToken = readCookie(request, ACCOUNT_SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/i.test(accountToken)) throw new HttpError(401, "Sign in to continue.");
  const tokenHash = await hashRecoveryCode(accountToken.toLowerCase());
  const db = getD1();
  let row = await db
    .prepare(
      `SELECT v.* FROM account_sessions s
       JOIN accounts a ON a.id = s.account_id
       JOIN account_vaults av ON av.account_id = a.id
       JOIN vaults v ON v.id = av.vault_id
       WHERE s.token_hash = ?1 AND datetime(s.expires_at) > datetime('now') AND a.status = 'active'
       LIMIT 1`,
    )
    .bind(tokenHash)
    .first<VaultRow>();
  if (!row) {
    const account = await db.prepare(
      `SELECT a.id FROM account_sessions s JOIN accounts a ON a.id = s.account_id
       WHERE s.token_hash = ?1 AND datetime(s.expires_at) > datetime('now') AND a.status = 'active'
       LIMIT 1`,
    ).bind(tokenHash).first<{ id: string }>();
    if (!account) throw new HttpError(401, "Sign in to continue.");
    await ensureAccountWorld(account.id);
    row = await db.prepare(
      `SELECT v.* FROM account_vaults av JOIN vaults v ON v.id = av.vault_id
       WHERE av.account_id = ?1 LIMIT 1`,
    ).bind(account.id).first<VaultRow>();
  }
  if (!row) throw new HttpError(503, "The shared world is still opening. Please try again.");
  return row;
}

export function withSessionCookie(response: Response, request: Request, rawCode: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(rawCode)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`,
  );
  return response;
}

export function clearSessionCookie(response: Response, request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
  return response;
}

export async function loadVaultState(vault: VaultRow) {
  await ensureVaultStorageSchema();
  const db = getD1();
  const [debtsResult, paymentsResult, policyResult, betaEnrollment, betaFeedbackResult] = await Promise.all([
    db
      .prepare("SELECT * FROM debts WHERE vault_id = ?1 ORDER BY created_at ASC")
      .bind(vault.id)
      .all<{
        id: string;
        kind: string;
        custom_label: string | null;
        currency: string;
        original: number;
        balance: number;
        monthly: number;
        apr: number | null;
        minimum_payment: number | null;
        payment_status: string;
        remaining_months: number | null;
        due_day: number;
        method: string;
        sharing_mode: string;
        last_paid_at: string | null;
        payments: number;
      }>(),
    db
      .prepare("SELECT * FROM payment_records WHERE vault_id = ?1 ORDER BY confirmed_at ASC")
      .bind(vault.id)
      .all<{
        id: string;
        debt_id: string;
        scheduled_date: string | null;
        confirmed_at: string;
        event_date: string | null;
        cash_payment: number;
        new_balance: number;
        source: string;
        income_type: string | null;
      }>(),
    db
      .prepare("SELECT policy_key, policy_version, accepted_at FROM policy_acceptances WHERE vault_id = ?1 ORDER BY accepted_at ASC")
      .bind(vault.id)
      .all<{ policy_key: string; policy_version: string; accepted_at: string }>(),
    db
      .prepare("SELECT consent_version, created_at FROM beta_enrollments WHERE vault_id = ?1 LIMIT 1")
      .bind(vault.id)
      .first<{ consent_version: string; created_at: string }>(),
    db
      .prepare("SELECT category, rating, message, page_path, status, created_at FROM beta_feedback WHERE vault_id = ?1 ORDER BY created_at ASC")
      .bind(vault.id)
      .all<{ category: string; rating: number; message: string; page_path: string; status: string; created_at: string }>(),
  ]);

  const paymentMap = new Map<string, { confirmedAt: string; cashPayment: number; newBalance: number; source: "self_report" | "prepayment" | "lucky_income"; incomeType?: string; eventDate?: string }[]>();
  for (const payment of paymentsResult.results) {
    const history = paymentMap.get(payment.debt_id) ?? [];
    history.push({
      confirmedAt: payment.confirmed_at,
      cashPayment: payment.cash_payment,
      newBalance: payment.new_balance,
      source: payment.source === "prepayment" || payment.source === "lucky_income" ? payment.source : "self_report",
      incomeType: payment.income_type ?? undefined,
      eventDate: payment.event_date ?? undefined,
    });
    paymentMap.set(payment.debt_id, history);
  }

  return {
    profile: {
      alias: vault.alias,
      region: vault.region,
      pressure: vault.pressure,
      ageBand: vault.age_band,
      gender: vault.gender,
      mbti: vault.mbti,
      zodiac: vault.zodiac,
      selfDescription: vault.self_description,
      repaymentPlan: vault.repayment_plan,
      repaymentOutlook: vault.repayment_outlook,
      incomePlan: vault.income_plan,
      countryCode: vault.country_code,
      countryName: vault.country_name,
      displayCurrency: vault.display_currency,
      monthlyIncome: vault.monthly_income,
      monthlyExpenses: vault.monthly_expenses,
    },
    position: {
      x: vault.position_x,
      y: vault.position_y,
    },
    locale: vault.locale,
    discoveryConsent: Boolean(vault.discovery_consent),
    debts: debtsResult.results.map((debt: {
      id: string;
      kind: string;
      custom_label: string | null;
      currency: string;
      original: number;
      balance: number;
      monthly: number;
      apr: number | null;
      minimum_payment: number | null;
      payment_status: string;
      remaining_months: number | null;
      due_day: number;
      method: string;
      sharing_mode: string;
      last_paid_at: string | null;
      payments: number;
    }) => ({
      id: debt.id,
      kind: debt.kind,
      customLabel: debt.custom_label ?? undefined,
      currency: debt.currency,
      original: debt.original,
      balance: debt.balance,
      monthly: debt.monthly,
      apr: debt.apr,
      minimumPayment: debt.minimum_payment,
      paymentStatus: debt.payment_status === "current" || debt.payment_status === "late" || debt.payment_status === "collection"
        ? debt.payment_status
        : "unknown",
      remainingMonths: debt.remaining_months,
      dueDay: debt.due_day,
      method: debt.method,
      sharingMode: debt.sharing_mode === "range" ? "range" : "private",
      lastPaidAt: debt.last_paid_at ?? undefined,
      payments: debt.payments,
      history: paymentMap.get(debt.id) ?? [],
    })),
    policyAcceptances: policyResult.results.map((acceptance) => ({
      policyKey: acceptance.policy_key,
      policyVersion: acceptance.policy_version,
      acceptedAt: acceptance.accepted_at,
    })),
    betaEnrollment: betaEnrollment ? {
      consentVersion: betaEnrollment.consent_version,
      createdAt: betaEnrollment.created_at,
    } : null,
    betaFeedback: betaFeedbackResult.results.map((item) => ({
      category: item.category,
      rating: item.rating,
      message: item.message,
      pagePath: item.page_path,
      status: item.status,
      createdAt: item.created_at,
    })),
    createdAt: vault.created_at,
    updatedAt: vault.updated_at,
  };
}
