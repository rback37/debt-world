import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import type { Locale } from "@/lib/debt-world-types";
import { HttpError, cleanText } from "@/lib/vault-server";

export const BETA_CONSENT_VERSION = "beta-2026-07-30";

function runtimeValue(key: string, max = 200) {
  const workerEnv = env as unknown as Record<string, unknown>;
  return cleanText(workerEnv[key], max);
}

function runtimeBoolean(key: string, fallback: boolean) {
  const value = runtimeValue(key, 12).toLowerCase();
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return fallback;
}

function configuredMaxUses() {
  const parsed = Number(runtimeValue("BETA_INVITE_MAX_USES", 8));
  return Number.isFinite(parsed) ? Math.min(500, Math.max(1, Math.round(parsed))) : 30;
}

function configuredDailySignupLimit() {
  const parsed = Number(runtimeValue("BETA_DAILY_SIGNUP_LIMIT", 8));
  return Number.isFinite(parsed) ? Math.min(2_000, Math.max(5, Math.round(parsed))) : 100;
}

async function digestText(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function normalizeInviteCode(value: unknown) {
  return cleanText(value, 80).toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export async function betaPublicState() {
  const inviteCode = normalizeInviteCode(runtimeValue("BETA_INVITE_CODE", 80));
  const inviteRequired = runtimeBoolean("BETA_INVITES_REQUIRED", false);
  const environmentSignups = runtimeBoolean("BETA_SIGNUPS_ENABLED", true);
  const [override, today] = await Promise.all([
    getD1().prepare("SELECT signups_enabled FROM beta_runtime_settings WHERE id = 'default' LIMIT 1").first<{ signups_enabled: number }>(),
    getD1().prepare("SELECT COUNT(*) AS count FROM accounts WHERE datetime(created_at) >= datetime('now', 'start of day')").first<{ count: number }>(),
  ]);
  return {
    signupsEnabled: override ? Boolean(override.signups_enabled) : environmentSignups,
    inviteRequired,
    inviteConfigured: Boolean(inviteCode),
    maxUses: configuredMaxUses(),
    dailySignupLimit: configuredDailySignupLimit(),
    signupsToday: Number(today?.count ?? 0),
  };
}

export async function assertAccountSignupOpen() {
  const state = await betaPublicState();
  if (!state.signupsEnabled) throw new HttpError(503, "Public-beta registration is temporarily paused.");
  if (state.signupsToday >= state.dailySignupLimit) {
    throw new HttpError(429, "Today’s public-beta registration limit has been reached. Please try again tomorrow.");
  }
  return state;
}

export async function consumeBetaInvite(input: {
  inviteCode?: unknown;
  betaConsent?: unknown;
  locale: Locale;
}) {
  const state = await betaPublicState();
  const zh = input.locale === "zh";
  if (!state.signupsEnabled) {
    throw new HttpError(503, zh ? "本轮私测名额已暂停新增，请等待下一轮邀请。" : "New beta places are paused. Please wait for the next invitation round.");
  }
  if (!state.inviteRequired) return null;
  if (!state.inviteConfigured) {
    throw new HttpError(503, zh ? "邀请码系统还在准备中，请稍后再试。" : "The invitation system is still being prepared.");
  }
  if (input.betaConsent !== true) {
    throw new HttpError(400, zh ? "请先确认私测说明与数据边界。" : "Please confirm the beta notice and data boundaries first.");
  }
  const supplied = normalizeInviteCode(input.inviteCode);
  const expected = normalizeInviteCode(runtimeValue("BETA_INVITE_CODE", 80));
  const [suppliedDigest, expectedDigest] = await Promise.all([digestText(supplied), digestText(expected)]);
  if (!supplied || !constantEqual(suppliedDigest, expectedDigest)) {
    throw new HttpError(403, zh ? "邀请码不正确，请向邀请人核对。" : "That invitation code is not valid. Check it with the person who invited you.");
  }
  const db = getD1();
  await db.prepare(
    `INSERT OR IGNORE INTO beta_invite_counters (invite_digest, uses, max_uses)
     VALUES (?1, 0, ?2)`,
  ).bind(expectedDigest, state.maxUses).run();
  const consumed = await db.prepare(
    `UPDATE beta_invite_counters
     SET uses = uses + 1, max_uses = ?2, updated_at = CURRENT_TIMESTAMP
     WHERE invite_digest = ?1 AND uses < ?2`,
  ).bind(expectedDigest, state.maxUses).run();
  if (Number(consumed.meta?.changes ?? 0) < 1) {
    throw new HttpError(409, zh ? "这一轮邀请码名额已经用完。" : "This invitation round is full.");
  }
  return { inviteDigest: expectedDigest, consentVersion: BETA_CONSENT_VERSION };
}

export function cleanBetaFeedback(value: unknown) {
  return cleanText(value, 1_200)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[contact hidden]")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "[link hidden]")
    .replace(/\+?\d[\d\s()-]{6,}\d/g, "[contact hidden]")
    .trim();
}
