import { getD1 } from "@/db";
import {
  HttpError,
  assertSameOrigin,
  cleanText,
  noStoreJson,
  requireVault,
  routeError,
} from "@/lib/vault-server";
import { consumeCommunityRateLimit } from "@/lib/community-safety";
import { COMMUNITY_AGE_KEY, COMMUNITY_POLICY_KEY, SAFETY_POLICY_VERSION } from "@/lib/safety-policy";
import { convertCurrency, fallbackUsdRates } from "@/lib/exchange-rates";

export const dynamic = "force-dynamic";

const reportReasons = new Set([
  "scam",
  "harassment",
  "bad_advice",
  "identity_exposure",
  "self_harm",
  "debt_collection",
]);

const repaymentApproaches = new Set([
  "autopay",
  "extra_income",
  "negotiate",
  "refinance",
  "snowball",
  "avalanche",
  "family_plan",
  "other",
]);
const MIN_AGGREGATE_SAMPLE = 30;
const MIN_PROFILE_GROUP = 5;

type StoryRow = {
  id: string;
  vault_id: string;
  debt_id: string;
  anonymous_name: string;
  country_code: string;
  debt_kind: string;
  amount_band: string;
  currency: string;
  repayment_approach: string;
  story_text: string;
  status: string;
  created_at: string;
  encouragement_count: number;
};

type SharedWalkerRow = {
  id: string;
  country_code: string;
  debt_count: number;
  original_total: number;
  balance_total: number;
};

function stableWalkerCode(id: string) {
  let hash = 2_166_136_261;
  for (const character of id) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
}

function repaymentStage(original: number, balance: number, debtCount: number) {
  if (debtCount < 1 || original <= 0) return "setting_up";
  const progress = Math.max(0, Math.min(1, 1 - (balance / original)));
  if (progress >= 0.8) return "near_shore";
  if (progress >= 0.4) return "moving";
  if (progress > 0) return "started";
  return "mapped";
}

function publicStory(row: StoryRow, encouraged = false) {
  return {
    id: row.id,
    anonymousName: row.anonymous_name,
    countryCode: row.country_code,
    debtKind: row.debt_kind,
    amountBand: row.amount_band,
    currency: row.currency,
    repaymentApproach: row.repayment_approach,
    storyText: row.story_text,
    status: row.status,
    createdAt: row.created_at,
    encouragementCount: Number(row.encouragement_count ?? 0),
    encouraged,
  };
}

function redactStory(source: string) {
  const replacements = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    /(?:https?:\/\/|www\.)\S+/gi,
    /(?:微信|vx|wechat|whatsapp|telegram|line|qq|邮箱|电话|手机号|手机)\s*[:：]?\s*\S+/gi,
    /\+?\d[\d\s()-]{6,}\d/g,
    /\b\d{4,}\b/g,
  ];
  let text = source;
  let redacted = false;
  for (const pattern of replacements) {
    text = text.replace(pattern, () => {
      redacted = true;
      return "[private detail hidden]";
    });
  }
  return { text: text.replace(/\s{3,}/g, "  ").trim(), redacted };
}

function amountBand(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const boundaries = [0, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000];
  for (let index = 1; index < boundaries.length; index += 1) {
    if (value <= boundaries[index]) {
      return `${boundaries[index - 1].toLocaleString("en-US")}–${boundaries[index].toLocaleString("en-US")}`;
    }
  }
  return `${boundaries.at(-1)!.toLocaleString("en-US")}+`;
}

async function optionalVault(request: Request) {
  try {
    return await requireVault(request);
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) return null;
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const db = getD1();
    const vault = await optionalVault(request);
    const [pulseRow, districtRows, sharedWalkerRows, walkerDebtKindRows] = await Promise.all([
      db.prepare(
        `SELECT
          (SELECT COUNT(*) FROM vaults) AS population,
          (SELECT COUNT(*) FROM debts) AS recorded_debts,
          (SELECT COUNT(*) FROM payment_records) AS confirmed_payments,
          (SELECT COUNT(DISTINCT country_code) FROM vaults WHERE country_code <> '') AS countries`,
      ).first<{ population: number; recorded_debts: number; confirmed_payments: number; countries: number }>(),
      db.prepare(
        `SELECT kind AS key, COUNT(*) AS count
         FROM debts GROUP BY kind ORDER BY count DESC, key ASC`,
      ).all<{ key: string; count: number }>(),
      db.prepare(
        `SELECT
          v.id,
          v.country_code,
          COUNT(d.id) AS debt_count,
          COALESCE(SUM(d.original), 0) AS original_total,
          COALESCE(SUM(d.balance), 0) AS balance_total
         FROM vaults v
         LEFT JOIN debts d ON d.vault_id = v.id
         GROUP BY v.id, v.country_code, v.created_at
         ORDER BY v.created_at DESC
         LIMIT 80`,
      ).all<SharedWalkerRow>(),
      db.prepare(
        `SELECT vault_id, kind, balance
         FROM debts
         ORDER BY balance DESC, created_at ASC`,
      ).all<{ vault_id: string; kind: string; balance: number }>(),
    ]);
    const primaryDebtKinds = new Map<string, string>();
    for (const debt of walkerDebtKindRows.results) {
      if (!primaryDebtKinds.has(debt.vault_id)) primaryDebtKinds.set(debt.vault_id, debt.kind);
    }
    const published = await db.prepare(
      `SELECT s.*,
        (SELECT COUNT(*) FROM story_encouragements e WHERE e.story_id = s.id) AS encouragement_count
       FROM public_stories s
       WHERE s.status = 'published'
       ORDER BY s.created_at DESC
       LIMIT 60`,
    ).all<StoryRow>();
    const countRow = await db.prepare(
      "SELECT COUNT(*) AS count FROM public_stories WHERE status = 'published'",
    ).first<{ count: number }>();
    const sampleSize = Number(countRow?.count ?? 0);
    const profileRows = await db.prepare(
      `SELECT v.id AS vault_id, v.mbti, d.currency, d.balance
       FROM vaults v JOIN debts d ON d.vault_id = v.id
       WHERE v.discovery_consent = 1 AND v.mbti <> ''`,
    ).all<{ vault_id: string; mbti: string; currency: string; balance: number }>();
    const profileVaults = new Set(profileRows.results.map((row) => row.vault_id));
    const mbtiGroups = new Map<string, { vaults: Set<string>; totalUsd: number }>();
    for (const row of profileRows.results) {
      const group = mbtiGroups.get(row.mbti) ?? { vaults: new Set<string>(), totalUsd: 0 };
      group.vaults.add(row.vault_id);
      group.totalUsd += convertCurrency(Number(row.balance), row.currency, "USD", fallbackUsdRates);
      mbtiGroups.set(row.mbti, group);
    }
    const profileReady = profileVaults.size >= MIN_AGGREGATE_SAMPLE;
    const mbtiDebt = profileReady ? [...mbtiGroups.entries()]
      .filter(([, group]) => group.vaults.size >= MIN_PROFILE_GROUP)
      .map(([key, group]) => ({ key, count: group.vaults.size, averageUsd: Math.round((group.totalUsd / group.vaults.size) / 100) * 100 }))
      .sort((left, right) => right.averageUsd - left.averageUsd) : [];
    let insights: {
      ready: boolean;
      sampleSize: number;
      minSample: number;
      debtKinds: Array<{ key: string; count: number }>;
      repaymentApproaches: Array<{ key: string; count: number }>;
      profileReady: boolean;
      profileSampleSize: number;
      profileMinSample: number;
      mbtiDebt: Array<{ key: string; count: number; averageUsd: number }>;
    } = { ready: false, sampleSize, minSample: MIN_AGGREGATE_SAMPLE, debtKinds: [], repaymentApproaches: [], profileReady, profileSampleSize: profileVaults.size, profileMinSample: MIN_AGGREGATE_SAMPLE, mbtiDebt };
    if (sampleSize >= MIN_AGGREGATE_SAMPLE) {
      const [kindRows, approachRows] = await Promise.all([
        db.prepare(
          "SELECT debt_kind AS key, COUNT(*) AS count FROM public_stories WHERE status = 'published' GROUP BY debt_kind ORDER BY count DESC",
        ).all<{ key: string; count: number }>(),
        db.prepare(
          "SELECT repayment_approach AS key, COUNT(*) AS count FROM public_stories WHERE status = 'published' GROUP BY repayment_approach ORDER BY count DESC",
        ).all<{ key: string; count: number }>(),
      ]);
      insights = {
        ready: true,
        sampleSize,
        minSample: MIN_AGGREGATE_SAMPLE,
        debtKinds: kindRows.results.map((row) => ({ key: row.key, count: Number(row.count) })),
        repaymentApproaches: approachRows.results.map((row) => ({ key: row.key, count: Number(row.count) })),
        profileReady,
        profileSampleSize: profileVaults.size,
        profileMinSample: MIN_AGGREGATE_SAMPLE,
        mbtiDebt,
      };
    }

    let encouraged = new Set<string>();
    let mine: StoryRow[] = [];
    let policyAccepted = false;
    if (vault) {
      const [encouragementRows, mineResult, acceptanceRows] = await Promise.all([
        db.prepare(
          "SELECT story_id FROM story_encouragements WHERE vault_id = ?1",
        ).bind(vault.id).all<{ story_id: string }>(),
        db.prepare(
          `SELECT s.*,
            (SELECT COUNT(*) FROM story_encouragements e WHERE e.story_id = s.id) AS encouragement_count
           FROM public_stories s
           WHERE s.vault_id = ?1
           ORDER BY s.created_at DESC
           LIMIT 20`,
        ).bind(vault.id).all<StoryRow>(),
        db.prepare(
          "SELECT policy_key FROM policy_acceptances WHERE vault_id = ?1 AND policy_version = ?2",
        ).bind(vault.id, SAFETY_POLICY_VERSION).all<{ policy_key: string }>(),
      ]);
      encouraged = new Set(encouragementRows.results.map((row) => row.story_id));
      mine = mineResult.results;
      const acceptedKeys = new Set(acceptanceRows.results.map((row) => row.policy_key));
      policyAccepted = acceptedKeys.has(COMMUNITY_POLICY_KEY) && acceptedKeys.has(COMMUNITY_AGE_KEY);
    }

    return noStoreJson({
      worldPulse: {
        population: Number(pulseRow?.population ?? 0),
        recordedDebts: Number(pulseRow?.recorded_debts ?? 0),
        confirmedPayments: Number(pulseRow?.confirmed_payments ?? 0),
        countries: Number(pulseRow?.countries ?? 0),
        districts: districtRows.results.map((row) => ({
          key: row.key,
          count: Number(row.count) >= 3 ? Number(row.count) : null,
          tier: Math.min(5, Math.max(1, Math.ceil(Number(row.count) / 10))),
        })),
      },
      sharedWalkers: sharedWalkerRows.results.map((walker) => ({
        id: `walker-${stableWalkerCode(walker.id)}`,
        anonymousName: `Walker-${stableWalkerCode(walker.id).slice(0, 5)}`,
        countryCode: walker.country_code,
        debtCountBand: Number(walker.debt_count ?? 0) < 1
          ? "none"
          : Number(walker.debt_count ?? 0) === 1
            ? "single"
            : "multiple",
        primaryDebtKind: primaryDebtKinds.get(walker.id) ?? "other",
        repaymentStage: repaymentStage(
          Number(walker.original_total ?? 0),
          Number(walker.balance_total ?? 0),
          Number(walker.debt_count ?? 0),
        ),
        isMine: vault?.id === walker.id,
      })),
      stories: published.results.map((story) => publicStory(story, encouraged.has(story.id))),
      mine: mine.map((story) => publicStory(story)),
      insights,
      policy: { version: SAFETY_POLICY_VERSION, accepted: policyAccepted },
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const vault = await requireVault(request);
    const payload = await request.json() as {
      action?: "publish" | "encourage" | "report" | "delete_story";
      debtId?: string;
      storyId?: string;
      storyText?: string;
      repaymentApproach?: string;
      reason?: string;
      details?: string;
      rulesAccepted?: boolean;
      ageConfirmed?: boolean;
    };
    const db = getD1();

    if (payload.action === "publish") {
      const debtId = cleanText(payload.debtId, 80);
      const source = cleanText(payload.storyText, 600);
      const repaymentApproach = repaymentApproaches.has(payload.repaymentApproach ?? "")
        ? payload.repaymentApproach!
        : "other";
      if (source.length < 20) throw new HttpError(400, "The anonymous story is too short.");
      const debt = await db.prepare(
        "SELECT id, vault_id, kind, currency, balance, sharing_mode FROM debts WHERE id = ?1 AND vault_id = ?2 LIMIT 1",
      ).bind(debtId, vault.id).first<{ id: string; vault_id: string; kind: string; currency: string; balance: number; sharing_mode: string }>();
      if (!debt) throw new HttpError(404, "Debt not found.");
      if (debt.sharing_mode !== "range") throw new HttpError(403, "This debt is private. Choose anonymous range sharing first.");
      const existing = await db.prepare(
        "SELECT id FROM public_stories WHERE debt_id = ?1 AND status IN ('pending', 'published', 'review') LIMIT 1",
      ).bind(debt.id).first();
      if (existing) throw new HttpError(409, "This debt already has a story awaiting or through review.");
      const redaction = redactStory(source);
      if (redaction.text.replace(/\[private detail hidden\]/g, "").trim().length < 12) {
        throw new HttpError(400, "The story contains too little shareable text after privacy filtering.");
      }
      const acceptanceRows = await db.prepare(
        "SELECT policy_key FROM policy_acceptances WHERE vault_id = ?1 AND policy_version = ?2",
      ).bind(vault.id, SAFETY_POLICY_VERSION).all<{ policy_key: string }>();
      const acceptedKeys = new Set(acceptanceRows.results.map((row) => row.policy_key));
      const hasCurrentPolicy = acceptedKeys.has(COMMUNITY_POLICY_KEY) && acceptedKeys.has(COMMUNITY_AGE_KEY);
      if (!hasCurrentPolicy && (!payload.rulesAccepted || !payload.ageConfirmed)) {
        throw new HttpError(428, "Confirm the current community rules, privacy notice, and age requirement before publishing.");
      }
      if (!hasCurrentPolicy) {
        await db.batch([
          db.prepare(
            `INSERT OR IGNORE INTO policy_acceptances (id, vault_id, policy_key, policy_version)
             VALUES (?1, ?2, ?3, ?4)`,
          ).bind(crypto.randomUUID(), vault.id, COMMUNITY_POLICY_KEY, SAFETY_POLICY_VERSION),
          db.prepare(
            `INSERT OR IGNORE INTO policy_acceptances (id, vault_id, policy_key, policy_version)
             VALUES (?1, ?2, ?3, ?4)`,
          ).bind(crypto.randomUUID(), vault.id, COMMUNITY_AGE_KEY, SAFETY_POLICY_VERSION),
        ]);
      }
      await consumeCommunityRateLimit(vault.id, "publish");
      const id = crypto.randomUUID();
      const suffix = id.replace(/-/g, "").slice(0, 4).toUpperCase();
      await db.prepare(
        `INSERT INTO public_stories
          (id, vault_id, debt_id, anonymous_name, country_code, debt_kind, amount_band, currency, repayment_approach, story_text, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'pending')`,
      ).bind(id, vault.id, debt.id, `Walker-${suffix}`, vault.country_code, debt.kind, amountBand(debt.balance), debt.currency, repaymentApproach, redaction.text).run();
      return noStoreJson({ status: "pending", redacted: redaction.redacted }, { status: 201 });
    }

    if (payload.action === "delete_story") {
      const storyId = cleanText(payload.storyId, 80);
      const deleted = await db.prepare(
        "DELETE FROM public_stories WHERE id = ?1 AND vault_id = ?2",
      ).bind(storyId, vault.id).run();
      if (Number(deleted.meta?.changes ?? 0) < 1) throw new HttpError(404, "Story not found.");
      return noStoreJson({ deleted: true, storyId });
    }

    const storyId = cleanText(payload.storyId, 80);
    const story = await db.prepare(
      "SELECT id, vault_id, status FROM public_stories WHERE id = ?1 LIMIT 1",
    ).bind(storyId).first<{ id: string; vault_id: string; status: string }>();
    if (!story || story.status !== "published") throw new HttpError(404, "Published story not found.");
    if (story.vault_id === vault.id) throw new HttpError(400, "You cannot act on your own story.");

    if (payload.action === "encourage") {
      const existing = await db.prepare(
        "SELECT id FROM story_encouragements WHERE story_id = ?1 AND vault_id = ?2 LIMIT 1",
      ).bind(story.id, vault.id).first();
      if (existing) {
        const count = await db.prepare(
          "SELECT COUNT(*) AS count FROM story_encouragements WHERE story_id = ?1",
        ).bind(story.id).first<{ count: number }>();
        return noStoreJson({ encouraged: true, count: Number(count?.count ?? 0) });
      }
      await consumeCommunityRateLimit(vault.id, "encourage");
      await db.prepare(
        "INSERT OR IGNORE INTO story_encouragements (id, story_id, vault_id) VALUES (?1, ?2, ?3)",
      ).bind(crypto.randomUUID(), story.id, vault.id).run();
      const count = await db.prepare(
        "SELECT COUNT(*) AS count FROM story_encouragements WHERE story_id = ?1",
      ).bind(story.id).first<{ count: number }>();
      return noStoreJson({ encouraged: true, count: Number(count?.count ?? 0) });
    }

    if (payload.action === "report") {
      const existing = await db.prepare(
        "SELECT id FROM story_reports WHERE story_id = ?1 AND reporter_vault_id = ?2 LIMIT 1",
      ).bind(story.id, vault.id).first();
      if (existing) return noStoreJson({ reported: true });
      await consumeCommunityRateLimit(vault.id, "report");
      const reason = reportReasons.has(payload.reason ?? "") ? payload.reason! : "bad_advice";
      const details = redactStory(cleanText(payload.details, 240)).text;
      await db.prepare(
        `INSERT OR IGNORE INTO story_reports
          (id, story_id, reporter_vault_id, reason, details, status)
         VALUES (?1, ?2, ?3, ?4, ?5, 'open')`,
      ).bind(crypto.randomUUID(), story.id, vault.id, reason, details).run();
      if (["scam", "identity_exposure", "self_harm", "debt_collection"].includes(reason)) {
        await db.prepare(
          "UPDATE public_stories SET status = 'review', updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND status = 'published'",
        ).bind(story.id).run();
      }
      return noStoreJson({ reported: true });
    }

    throw new HttpError(400, "Unknown community action.");
  } catch (error) {
    return routeError(error);
  }
}
