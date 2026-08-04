import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { requireAccount, sha256Hex } from "@/lib/account-server";
import { HttpError, cleanText } from "@/lib/vault-server";

const communityLimits = {
  publish: 3,
  encourage: 30,
  report: 10,
} as const;

export type CommunityLimitedAction = keyof typeof communityLimits;

export function cleanModerationNote(value: unknown) {
  return cleanText(value, 240)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[private detail hidden]")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "[private detail hidden]")
    .replace(/\+?\d[\d\s()-]{6,}\d/g, "[private detail hidden]")
    .replace(/\b\d{4,}\b/g, "[private detail hidden]")
    .trim();
}

export async function consumeCommunityRateLimit(vaultId: string, action: CommunityLimitedAction) {
  const db = getD1();
  const windowKey = new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT OR IGNORE INTO community_rate_limits
      (id, vault_id, action, window_key, count)
     VALUES (?1, ?2, ?3, ?4, 0)`,
  ).bind(id, vaultId, action, windowKey).run();
  const updated = await db.prepare(
    `UPDATE community_rate_limits
     SET count = count + 1, updated_at = CURRENT_TIMESTAMP
     WHERE vault_id = ?1 AND action = ?2 AND window_key = ?3 AND count < ?4`,
  ).bind(vaultId, action, windowKey, communityLimits[action]).run();
  if (Number(updated.meta?.changes ?? 0) < 1) {
    const labels = {
      publish: "anonymous story submissions",
      encourage: "light gifts",
      report: "story reports",
    };
    throw new HttpError(429, `Today's safety limit for ${labels[action]} has been reached. Please try again after 00:00 UTC.`);
  }
}

function ownerEmail() {
  const workerEnv = env as unknown as Record<string, unknown>;
  const configuredOwner = String(workerEnv.OWNER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (configuredOwner) return configuredOwner;
  return String(workerEnv.COMMUNITY_ADMIN_EMAILS ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
}

async function eligibleOwner(request: Request) {
  const email = cleanText(request.headers.get("oai-authenticated-user-email"), 320).toLowerCase();
  if (!email || !ownerEmail() || email !== ownerEmail()) throw new HttpError(404, "Not found.");
  return { emailDigest: await sha256Hex(email) };
}

export async function ownerAdminSession(request: Request) {
  const [owner, account] = await Promise.all([eligibleOwner(request), requireAccount(request)]);
  const registered = await getD1().prepare(
    "SELECT email_digest, account_id, activated_at, last_seen_at FROM owner_admins WHERE id = 'owner' LIMIT 1",
  ).first<{ email_digest: string; account_id: string | null; activated_at: string; last_seen_at: string }>();
  if (registered && registered.email_digest !== owner.emailDigest) throw new HttpError(409, "The owner slot is already locked.");
  if (registered?.account_id && registered.account_id !== account.id) throw new HttpError(404, "Not found.");
  return {
    eligible: true,
    registered: Boolean(registered?.account_id === account.id),
    accountUsername: account.username,
    accountCode: account.user_code,
    activatedAt: registered?.activated_at ?? null,
  };
}

export async function registerOwnerAdmin(request: Request) {
  const [owner, account] = await Promise.all([eligibleOwner(request), requireAccount(request)]);
  const db = getD1();
  const existing = await db.prepare(
    "SELECT email_digest, account_id, activated_at FROM owner_admins WHERE id = 'owner' LIMIT 1",
  ).first<{ email_digest: string; account_id: string | null; activated_at: string }>();
  if (existing && existing.email_digest !== owner.emailDigest) throw new HttpError(409, "The owner slot is already locked.");
  if (existing?.account_id && existing.account_id !== account.id) throw new HttpError(409, "The owner account is already bound.");
  if (!existing) {
    await db.prepare(
      `INSERT INTO owner_admins (id, email_digest, account_id, role)
       VALUES ('owner', ?1, ?2, 'owner')`,
    ).bind(owner.emailDigest, account.id).run();
  } else if (!existing.account_id) {
    await db.prepare(
      "UPDATE owner_admins SET account_id = ?1, last_seen_at = CURRENT_TIMESTAMP WHERE id = 'owner' AND account_id IS NULL",
    ).bind(account.id).run();
  }
  const registered = await db.prepare(
    "SELECT email_digest, account_id, activated_at FROM owner_admins WHERE id = 'owner' LIMIT 1",
  ).first<{ email_digest: string; account_id: string | null; activated_at: string }>();
  if (!registered || registered.email_digest !== owner.emailDigest || registered.account_id !== account.id) throw new HttpError(409, "The owner account could not be bound.");
  return { eligible: true, registered: true, accountUsername: account.username, accountCode: account.user_code, activatedAt: registered.activated_at };
}

export async function requireCommunityAdmin(request: Request) {
  const [owner, account] = await Promise.all([eligibleOwner(request), requireAccount(request)]);
  const registered = await getD1().prepare(
    "SELECT email_digest, account_id FROM owner_admins WHERE id = 'owner' AND role = 'owner' LIMIT 1",
  ).first<{ email_digest: string; account_id: string | null }>();
  if (!registered || registered.email_digest !== owner.emailDigest || registered.account_id !== account.id) throw new HttpError(404, "Not found.");
  await getD1().prepare(
    "UPDATE owner_admins SET last_seen_at = CURRENT_TIMESTAMP WHERE id = 'owner'",
  ).run();
  return {
    actorDigest: (await sha256Hex(`${owner.emailDigest}:${account.id}`)).slice(0, 24),
  };
}
