import { getD1 } from "@/db";
import { ensureAccountSignupSourceSchema, sha256Hex } from "@/lib/account-server";
import { betaPublicState } from "@/lib/beta-server";
import { requireCommunityAdmin } from "@/lib/community-safety";
import { HttpError, assertSameOrigin, cleanText, noStoreJson, routeError } from "@/lib/vault-server";

export const dynamic = "force-dynamic";

async function betaAdminState() {
  const db = getD1();
  await ensureAccountSignupSourceSchema();
  const publicState = await betaPublicState();
  const [metrics, counters, accounts, sources, legacyVaults, feedback, trafficDaily] = await Promise.all([
    db.prepare(
      `SELECT
        (SELECT COUNT(*) FROM vaults) AS vaults,
        (SELECT COUNT(*) FROM accounts) AS accounts,
        (SELECT COUNT(*) FROM accounts WHERE status = 'active') AS active_accounts,
        (SELECT COUNT(*) FROM accounts WHERE status = 'suspended') AS suspended_accounts,
        (SELECT COUNT(*) FROM accounts WHERE status = 'active' AND datetime(COALESCE(last_seen_at, created_at)) >= datetime('now', '-1 day')) AS active_24h,
        (SELECT COUNT(*) FROM accounts WHERE status = 'active' AND datetime(COALESCE(last_seen_at, created_at)) >= datetime('now', '-7 days')) AS active_7d,
        (SELECT COUNT(*) FROM debts) AS debts,
        (SELECT COUNT(*) FROM payment_records) AS payments,
        (SELECT COALESCE(SUM(request_count), 0) FROM ai_daily_usage) AS ai_requests,
        (SELECT COUNT(*) FROM public_stories WHERE status IN ('pending', 'review')) AS pending_stories,
        (SELECT COUNT(*) FROM public_stories WHERE status = 'published') AS published_stories,
        (SELECT COUNT(*) FROM story_reports WHERE status = 'open') AS open_reports,
        (SELECT COUNT(*) FROM beta_enrollments) AS enrolled,
        (SELECT COUNT(*) FROM beta_feedback WHERE status = 'open') AS open_feedback,
        (SELECT COUNT(*) FROM site_daily_visitors WHERE visit_date = date('now')) AS visitors_today,
        (SELECT COALESCE(SUM(page_views), 0) FROM site_daily_visitors WHERE visit_date = date('now')) AS page_views_today,
        (SELECT COUNT(*) FROM referral_relationships) AS referral_invites,
        (SELECT COUNT(*) FROM referral_relationships WHERE status = 'rewarded') AS referral_activated,
        (SELECT COUNT(*) FROM referral_relationships WHERE status = 'pending') AS referral_pending`,
    ).first<{
      vaults: number; accounts: number; active_accounts: number; suspended_accounts: number; active_24h: number; active_7d: number;
      debts: number; payments: number; ai_requests: number; pending_stories: number; published_stories: number; open_reports: number;
      enrolled: number; open_feedback: number; visitors_today: number; page_views_today: number;
      referral_invites: number; referral_activated: number; referral_pending: number;
    }>(),
    db.prepare("SELECT uses, max_uses, updated_at FROM beta_invite_counters ORDER BY updated_at DESC LIMIT 1").first<{ uses: number; max_uses: number; updated_at: string }>(),
    db.prepare(
      `SELECT a.user_code, a.username, a.status AS login_status, a.signup_source, a.created_at, a.last_login_at, a.last_seen_at,
              v.id AS vault_id, v.country_code, v.created_at AS vault_created_at, v.updated_at AS vault_updated_at,
              COALESCE(dc.debt_count, 0) AS debt_count,
              COALESCE(pc.payment_count, 0) AS payment_count,
              COALESCE(aic.ai_count, 0) AS ai_count,
              COALESCE(fc.feedback_count, 0) AS feedback_count,
              COALESCE(sc.story_count, 0) AS story_count
       FROM accounts a
       LEFT JOIN account_vaults av ON av.account_id = a.id
       LEFT JOIN vaults v ON v.id = av.vault_id
       LEFT JOIN (SELECT vault_id, COUNT(*) AS debt_count FROM debts GROUP BY vault_id) dc ON dc.vault_id = v.id
       LEFT JOIN (SELECT vault_id, COUNT(*) AS payment_count FROM payment_records GROUP BY vault_id) pc ON pc.vault_id = v.id
       LEFT JOIN (SELECT vault_id, SUM(request_count) AS ai_count FROM ai_daily_usage GROUP BY vault_id) aic ON aic.vault_id = v.id
       LEFT JOIN (SELECT vault_id, COUNT(*) AS feedback_count FROM beta_feedback GROUP BY vault_id) fc ON fc.vault_id = v.id
       LEFT JOIN (SELECT vault_id, COUNT(*) AS story_count FROM public_stories GROUP BY vault_id) sc ON sc.vault_id = v.id
       ORDER BY COALESCE(a.last_seen_at, a.created_at) DESC LIMIT 300`,
    ).all<{
      user_code: string; username: string; login_status: string; signup_source: string; created_at: string; last_login_at: string | null; last_seen_at: string | null;
      vault_id: string | null; country_code: string | null; vault_created_at: string | null; vault_updated_at: string | null;
      debt_count: number; payment_count: number; ai_count: number; feedback_count: number; story_count: number;
    }>(),
    db.prepare(
      `SELECT COALESCE(NULLIF(a.signup_source, ''), 'direct') AS source,
              COUNT(*) AS account_count,
              SUM(CASE WHEN av.vault_id IS NOT NULL THEN 1 ELSE 0 END) AS linked_count,
              SUM(CASE WHEN dc.debt_count > 0 THEN 1 ELSE 0 END) AS debt_count,
              SUM(CASE WHEN fc.feedback_count > 0 THEN 1 ELSE 0 END) AS feedback_count
       FROM accounts a LEFT JOIN account_vaults av ON av.account_id = a.id
       LEFT JOIN (SELECT vault_id, COUNT(*) AS debt_count FROM debts GROUP BY vault_id) dc ON dc.vault_id = av.vault_id
       LEFT JOIN (SELECT vault_id, COUNT(*) AS feedback_count FROM beta_feedback GROUP BY vault_id) fc ON fc.vault_id = av.vault_id
       GROUP BY COALESCE(NULLIF(a.signup_source, ''), 'direct')
       ORDER BY account_count DESC, source ASC LIMIT 20`,
    ).all<{ source: string; account_count: number; linked_count: number; debt_count: number; feedback_count: number }>(),
    db.prepare(
      `SELECT v.id AS vault_id, v.country_code, v.created_at, v.updated_at,
              COALESCE(dc.debt_count, 0) AS debt_count,
              COALESCE(pc.payment_count, 0) AS payment_count,
              COALESCE(aic.ai_count, 0) AS ai_count,
              COALESCE(fc.feedback_count, 0) AS feedback_count,
              COALESCE(sc.story_count, 0) AS story_count
       FROM vaults v LEFT JOIN account_vaults av ON av.vault_id = v.id
       LEFT JOIN (SELECT vault_id, COUNT(*) AS debt_count FROM debts GROUP BY vault_id) dc ON dc.vault_id = v.id
       LEFT JOIN (SELECT vault_id, COUNT(*) AS payment_count FROM payment_records GROUP BY vault_id) pc ON pc.vault_id = v.id
       LEFT JOIN (SELECT vault_id, SUM(request_count) AS ai_count FROM ai_daily_usage GROUP BY vault_id) aic ON aic.vault_id = v.id
       LEFT JOIN (SELECT vault_id, COUNT(*) AS feedback_count FROM beta_feedback GROUP BY vault_id) fc ON fc.vault_id = v.id
       LEFT JOIN (SELECT vault_id, COUNT(*) AS story_count FROM public_stories GROUP BY vault_id) sc ON sc.vault_id = v.id
       WHERE av.vault_id IS NULL ORDER BY v.updated_at DESC LIMIT 300`,
    ).all<{
      vault_id: string; country_code: string; created_at: string; updated_at: string;
      debt_count: number; payment_count: number; ai_count: number; feedback_count: number; story_count: number;
    }>(),
    db.prepare(
      `SELECT bf.id, bf.vault_id, bf.category, bf.rating, bf.message, bf.page_path, bf.status, bf.created_at,
              a.user_code, a.username
       FROM beta_feedback bf
       LEFT JOIN account_vaults av ON av.vault_id = bf.vault_id
       LEFT JOIN accounts a ON a.id = av.account_id
       ORDER BY bf.created_at DESC LIMIT 100`,
    ).all<{ id: string; vault_id: string; category: string; rating: number; message: string; page_path: string; status: string; created_at: string; user_code: string | null; username: string | null }>(),
    db.prepare(
      `WITH RECURSIVE days(day) AS (
         SELECT date('now', '-13 days')
         UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < date('now')
       ), visitors AS (
         SELECT visit_date AS day, COUNT(*) AS unique_visitors, SUM(page_views) AS page_views
         FROM site_daily_visitors WHERE visit_date >= date('now', '-13 days') GROUP BY visit_date
       ), registrations AS (
         SELECT date(created_at) AS day, COUNT(*) AS registrations
         FROM accounts WHERE date(created_at) >= date('now', '-13 days') GROUP BY date(created_at)
       ), activations AS (
         SELECT date(created_at) AS day, COUNT(DISTINCT vault_id) AS debt_activations
         FROM debts WHERE date(created_at) >= date('now', '-13 days') GROUP BY date(created_at)
       ), referrals AS (
         SELECT date(COALESCE(qualified_at, rewarded_at)) AS day, COUNT(*) AS referral_activations
         FROM referral_relationships WHERE status = 'rewarded' AND date(COALESCE(qualified_at, rewarded_at)) >= date('now', '-13 days')
         GROUP BY date(COALESCE(qualified_at, rewarded_at))
       )
       SELECT days.day,
              COALESCE(visitors.unique_visitors, 0) AS unique_visitors,
              COALESCE(visitors.page_views, 0) AS page_views,
              COALESCE(registrations.registrations, 0) AS registrations,
              COALESCE(activations.debt_activations, 0) AS debt_activations,
              COALESCE(referrals.referral_activations, 0) AS referral_activations
       FROM days
       LEFT JOIN visitors ON visitors.day = days.day
       LEFT JOIN registrations ON registrations.day = days.day
       LEFT JOIN activations ON activations.day = days.day
       LEFT JOIN referrals ON referrals.day = days.day
       ORDER BY days.day ASC`,
    ).all<{ day: string; unique_visitors: number; page_views: number; registrations: number; debt_activations: number; referral_activations: number }>(),
  ]);
  const legacyCodes = new Map<string, string>();
  await Promise.all(legacyVaults.results.map(async (item) => {
    legacyCodes.set(item.vault_id, `LEGACY-${(await sha256Hex(item.vault_id)).slice(0, 8).toUpperCase()}`);
  }));
  const testers = [
    ...accounts.results.map((item) => ({
      testerCode: item.user_code,
      username: item.username,
      loginStatus: item.login_status === "suspended" ? "suspended" : "active",
      signupSource: item.signup_source || "direct",
      accountStatus: item.vault_id ? "linked" : "account_only",
      countryCode: item.country_code ?? "",
      joinedAt: item.created_at,
      lastLoginAt: item.last_login_at,
      lastActiveAt: [item.last_seen_at, item.vault_updated_at].filter(Boolean).sort().at(-1) ?? item.created_at,
      vaultCreatedAt: item.vault_created_at,
      debtCount: Number(item.debt_count ?? 0),
      paymentCount: Number(item.payment_count ?? 0),
      aiCount: Number(item.ai_count ?? 0),
      feedbackCount: Number(item.feedback_count ?? 0),
      storyCount: Number(item.story_count ?? 0),
    })),
    ...legacyVaults.results.map((item) => ({
      testerCode: legacyCodes.get(item.vault_id)!,
      username: null,
      loginStatus: "legacy" as const,
      signupSource: "legacy",
      accountStatus: "legacy" as const,
      countryCode: item.country_code,
      joinedAt: item.created_at,
      lastLoginAt: null,
      lastActiveAt: item.updated_at,
      vaultCreatedAt: item.created_at,
      debtCount: Number(item.debt_count ?? 0),
      paymentCount: Number(item.payment_count ?? 0),
      aiCount: Number(item.ai_count ?? 0),
      feedbackCount: Number(item.feedback_count ?? 0),
      storyCount: Number(item.story_count ?? 0),
    })),
  ].sort((left, right) => String(right.lastActiveAt).localeCompare(String(left.lastActiveAt)));
  return {
    config: {
      signupsEnabled: publicState.signupsEnabled,
      inviteRequired: publicState.inviteRequired,
      inviteConfigured: publicState.inviteConfigured,
      maxUses: publicState.maxUses,
      dailySignupLimit: publicState.dailySignupLimit,
      signupsToday: publicState.signupsToday,
    },
    counts: {
      accounts: Number(metrics?.accounts ?? 0),
      activeAccounts: Number(metrics?.active_accounts ?? 0),
      suspendedAccounts: Number(metrics?.suspended_accounts ?? 0),
      active24h: Number(metrics?.active_24h ?? 0),
      active7d: Number(metrics?.active_7d ?? 0),
      vaults: Number(metrics?.vaults ?? 0),
      debts: Number(metrics?.debts ?? 0),
      payments: Number(metrics?.payments ?? 0),
      aiRequests: Number(metrics?.ai_requests ?? 0),
      pendingStories: Number(metrics?.pending_stories ?? 0),
      publishedStories: Number(metrics?.published_stories ?? 0),
      openReports: Number(metrics?.open_reports ?? 0),
      legacyVaults: legacyVaults.results.length,
      enrolled: Number(metrics?.enrolled ?? 0),
      openFeedback: Number(metrics?.open_feedback ?? 0),
      inviteUses: Number(counters?.uses ?? 0),
      inviteLimit: Number(counters?.max_uses ?? publicState.maxUses),
      visitorsToday: Number(metrics?.visitors_today ?? 0),
      pageViewsToday: Number(metrics?.page_views_today ?? 0),
      referralInvites: Number(metrics?.referral_invites ?? 0),
      referralActivated: Number(metrics?.referral_activated ?? 0),
      referralPending: Number(metrics?.referral_pending ?? 0),
    },
    testers,
    sources: sources.results.map((item) => ({
      source: item.source,
      accounts: Number(item.account_count ?? 0),
      linked: Number(item.linked_count ?? 0),
      withDebt: Number(item.debt_count ?? 0),
      withFeedback: Number(item.feedback_count ?? 0),
    })),
    trafficDaily: trafficDaily.results.map((item) => ({
      day: item.day,
      uniqueVisitors: Number(item.unique_visitors ?? 0),
      pageViews: Number(item.page_views ?? 0),
      registrations: Number(item.registrations ?? 0),
      debtActivations: Number(item.debt_activations ?? 0),
      referralActivations: Number(item.referral_activations ?? 0),
    })),
    feedback: feedback.results.map((item) => ({
      id: item.id,
      testerCode: item.user_code ?? legacyCodes.get(item.vault_id) ?? "LEGACY",
      username: item.username,
      category: item.category,
      rating: item.rating,
      message: item.message,
      pagePath: item.page_path,
      status: item.status,
      createdAt: item.created_at,
    })),
  };
}

export async function GET(request: Request) {
  try {
    await requireCommunityAdmin(request);
    return noStoreJson(await betaAdminState());
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireCommunityAdmin(request);
    const payload = await request.json() as { action?: string; enabled?: boolean; feedbackId?: string; testerCode?: string; accountStatus?: string };
    const db = getD1();
    if (payload.action === "set_signups") {
      if (typeof payload.enabled !== "boolean") throw new HttpError(400, "A signup state is required.");
      await db.prepare(
        `INSERT INTO beta_runtime_settings (id, signups_enabled, updated_by_digest, updated_at)
         VALUES ('default', ?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET signups_enabled = excluded.signups_enabled,
           updated_by_digest = excluded.updated_by_digest, updated_at = CURRENT_TIMESTAMP`,
      ).bind(payload.enabled ? 1 : 0, admin.actorDigest).run();
    } else if (payload.action === "resolve_feedback") {
      const feedbackId = cleanText(payload.feedbackId, 80);
      if (!feedbackId) throw new HttpError(400, "Feedback id is required.");
      const updated = await db.prepare(
        `UPDATE beta_feedback SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
         WHERE id = ?1 AND status = 'open'`,
      ).bind(feedbackId).run();
      if (Number(updated.meta?.changes ?? 0) < 1) throw new HttpError(404, "Open feedback was not found.");
    } else if (payload.action === "reopen_feedback") {
      const feedbackId = cleanText(payload.feedbackId, 80);
      if (!feedbackId) throw new HttpError(400, "Feedback id is required.");
      const updated = await db.prepare(
        `UPDATE beta_feedback SET status = 'open', resolved_at = NULL
         WHERE id = ?1 AND status = 'resolved'`,
      ).bind(feedbackId).run();
      if (Number(updated.meta?.changes ?? 0) < 1) throw new HttpError(404, "Resolved feedback was not found.");
    } else if (payload.action === "set_account_status") {
      const testerCode = cleanText(payload.testerCode, 40).toUpperCase();
      const accountStatus = payload.accountStatus === "active" ? "active" : payload.accountStatus === "suspended" ? "suspended" : "";
      if (!testerCode || !accountStatus) throw new HttpError(400, "A user and valid account status are required.");
      const account = await db.prepare("SELECT id, status FROM accounts WHERE user_code = ?1 LIMIT 1").bind(testerCode).first<{ id: string; status: string }>();
      if (!account) throw new HttpError(404, "Account was not found.");
      if (account.status !== accountStatus) {
        const statements = [db.prepare("UPDATE accounts SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2").bind(accountStatus, account.id)];
        if (accountStatus === "suspended") statements.push(db.prepare("DELETE FROM account_sessions WHERE account_id = ?1").bind(account.id));
        await db.batch(statements);
      }
    } else {
      throw new HttpError(400, "A valid beta admin action is required.");
    }
    return noStoreJson(await betaAdminState());
  } catch (error) {
    return routeError(error);
  }
}
