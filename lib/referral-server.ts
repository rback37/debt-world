import { getD1 } from "@/db";
import { cleanText } from "@/lib/vault-server";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITER_SHORE_VALUE = 25;
const INVITER_STARLIGHT = 5;
const INVITED_SHORE_VALUE = 10;
const INVITED_STARLIGHT = 2;

function normalizeReferralCode(value: unknown) {
  return cleanText(value, 40).toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function randomReferralCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `SHORE-${Array.from(bytes, (byte) => REFERRAL_ALPHABET[byte % REFERRAL_ALPHABET.length]).join("")}`;
}

async function ensureReferralCode(vaultId: string) {
  const db = getD1();
  const existing = await db.prepare(
    "SELECT id, code FROM referral_codes WHERE vault_id = ?1 AND status = 'active' LIMIT 1",
  ).bind(vaultId).first<{ id: string; code: string }>();
  if (existing) return existing;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const id = crypto.randomUUID();
    const code = randomReferralCode();
    await db.prepare(
      `INSERT OR IGNORE INTO referral_codes (id, vault_id, code, status)
       VALUES (?1, ?2, ?3, 'active')`,
    ).bind(id, vaultId, code).run();
    const created = await db.prepare(
      "SELECT id, code FROM referral_codes WHERE vault_id = ?1 AND status = 'active' LIMIT 1",
    ).bind(vaultId).first<{ id: string; code: string }>();
    if (created) return created;
  }
  throw new Error("The referral link could not be created.");
}

export async function getReferralState(vaultId: string) {
  const db = getD1();
  const code = await ensureReferralCode(vaultId);
  const counts = await db.prepare(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'rewarded' THEN 1 ELSE 0 END) AS activated
     FROM referral_relationships WHERE inviter_vault_id = ?1`,
  ).bind(vaultId).first<{ total: number; activated: number }>();
  return {
    code: code.code,
    invited: Number(counts?.total ?? 0),
    activated: Number(counts?.activated ?? 0),
    pending: Math.max(0, Number(counts?.total ?? 0) - Number(counts?.activated ?? 0)),
    rewards: {
      inviterShoreValue: INVITER_SHORE_VALUE,
      inviterStarlight: INVITER_STARLIGHT,
      invitedShoreValue: INVITED_SHORE_VALUE,
      invitedStarlight: INVITED_STARLIGHT,
    },
  };
}

export async function attachReferral(invitedVaultId: string, value: unknown) {
  const code = normalizeReferralCode(value);
  if (!code) return false;
  const db = getD1();
  const inviter = await db.prepare(
    `SELECT id, vault_id FROM referral_codes
     WHERE code = ?1 AND status = 'active' LIMIT 1`,
  ).bind(code).first<{ id: string; vault_id: string }>();
  if (!inviter || inviter.vault_id === invitedVaultId) return false;
  const inserted = await db.prepare(
    `INSERT OR IGNORE INTO referral_relationships
      (id, inviter_vault_id, invited_vault_id, code_id, status)
     VALUES (?1, ?2, ?3, ?4, 'pending')`,
  ).bind(crypto.randomUUID(), inviter.vault_id, invitedVaultId, inviter.id).run();
  return Number(inserted.meta?.changes ?? 0) > 0;
}

export async function qualifyReferral(invitedVaultId: string) {
  const db = getD1();
  const relationship = await db.prepare(
    `SELECT id, inviter_vault_id, invited_vault_id, status
     FROM referral_relationships WHERE invited_vault_id = ?1 LIMIT 1`,
  ).bind(invitedVaultId).first<{
    id: string;
    inviter_vault_id: string;
    invited_vault_id: string;
    status: string;
  }>();
  if (!relationship) return false;
  const debt = await db.prepare(
    "SELECT id FROM debts WHERE vault_id = ?1 LIMIT 1",
  ).bind(invitedVaultId).first<{ id: string }>();
  if (!debt) return false;
  const inviterEvent = `referral-inviter:${relationship.id}`;
  const invitedEvent = `referral-invited:${relationship.id}`;
  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO starlight_wallets
        (vault_id, available, lifetime_earned, lifetime_sent, lifetime_received)
       VALUES (?1, 0, 0, 0, 0)`,
    ).bind(relationship.inviter_vault_id),
    db.prepare(
      `UPDATE starlight_wallets
       SET available = available + ?1, lifetime_earned = lifetime_earned + ?1, updated_at = CURRENT_TIMESTAMP
       WHERE vault_id = ?2 AND NOT EXISTS
         (SELECT 1 FROM shore_value_ledger WHERE event_key = ?3)`,
    ).bind(INVITER_STARLIGHT, relationship.inviter_vault_id, inviterEvent),
    db.prepare(
      `INSERT OR IGNORE INTO shore_value_ledger
        (id, vault_id, event_key, event_type, points, reference_id)
       VALUES (?1, ?2, ?3, 'referral_activated', ?4, ?5)`,
    ).bind(crypto.randomUUID(), relationship.inviter_vault_id, inviterEvent, INVITER_SHORE_VALUE, relationship.id),
    db.prepare(
      `INSERT OR IGNORE INTO starlight_wallets
        (vault_id, available, lifetime_earned, lifetime_sent, lifetime_received)
       VALUES (?1, 0, 0, 0, 0)`,
    ).bind(relationship.invited_vault_id),
    db.prepare(
      `UPDATE starlight_wallets
       SET available = available + ?1, lifetime_earned = lifetime_earned + ?1, updated_at = CURRENT_TIMESTAMP
       WHERE vault_id = ?2 AND NOT EXISTS
         (SELECT 1 FROM shore_value_ledger WHERE event_key = ?3)`,
    ).bind(INVITED_STARLIGHT, relationship.invited_vault_id, invitedEvent),
    db.prepare(
      `INSERT OR IGNORE INTO shore_value_ledger
        (id, vault_id, event_key, event_type, points, reference_id)
       VALUES (?1, ?2, ?3, 'referral_welcome', ?4, ?5)`,
    ).bind(crypto.randomUUID(), relationship.invited_vault_id, invitedEvent, INVITED_SHORE_VALUE, relationship.id),
    db.prepare(
      `UPDATE referral_relationships
       SET status = 'rewarded', qualified_at = COALESCE(qualified_at, CURRENT_TIMESTAMP),
           rewarded_at = COALESCE(rewarded_at, CURRENT_TIMESTAMP)
       WHERE id = ?1`,
    ).bind(relationship.id),
  ]);
  return relationship.status !== "rewarded";
}
