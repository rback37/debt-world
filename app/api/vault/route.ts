import { getD1 } from "@/db";
import { accountHasVault, clearAccountSession, requireAccount } from "@/lib/account-server";
import { consumeBetaInvite } from "@/lib/beta-server";
import {
  HttpError,
  assertSameOrigin,
  cleanNumber,
  cleanText,
  clearSessionCookie,
  generateRecoveryCode,
  hashRecoveryCode,
  ensureVaultStorageSchema,
  loadVaultState,
  noStoreJson,
  normalizeRecoveryCode,
  requireVault,
  routeError,
  validateDebt,
  withSessionCookie,
} from "@/lib/vault-server";

export const dynamic = "force-dynamic";

const ageBands = new Set(["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]);
const genders = new Set(["woman", "man", "nonbinary", "self_described", "prefer_not_say"]);
const mbtiTypes = new Set(["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"]);
const zodiacSigns = new Set(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]);
const repaymentOutlooks = new Set(["clear_plan", "trying", "uncertain", "no_current_way"]);

type ProfileInput = {
  alias?: string; region?: string; pressure?: string; ageBand?: string; gender?: string; mbti?: string; zodiac?: string;
  selfDescription?: string; repaymentPlan?: string; repaymentOutlook?: string; incomePlan?: string;
  countryCode?: string; countryName?: string; displayCurrency?: string; monthlyIncome?: number; monthlyExpenses?: number;
};

export async function GET(request: Request) {
  try {
    await ensureVaultStorageSchema();
    const vault = await requireVault(request);
    const state = await loadVaultState(vault);
    if (new URL(request.url).searchParams.get("download") === "1") {
      return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2), {
        headers: {
          "Cache-Control": "no-store, private",
          "Content-Disposition": 'attachment; filename="debt-world-export.json"',
          "Content-Type": "application/json; charset=utf-8",
        },
      });
    }
    return noStoreJson({ vault: state });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  let stage = "request";
  try {
    assertSameOrigin(request);
    stage = "payload";
    const payload = (await request.json()) as {
      action?: "create" | "recover" | "rotate";
      recoveryCode?: string;
      profile?: ProfileInput;
      position?: { x?: number; y?: number };
      locale?: string;
      discoveryConsent?: boolean;
      inviteCode?: string;
      betaConsent?: boolean;
      debts?: unknown[];
    };
    stage = "account";
    const account = await requireAccount(request);
    stage = "storage_schema";
    await ensureVaultStorageSchema();

    if (payload.action === "recover") {
      stage = "recover";
      if (await accountHasVault(account.id)) {
        throw new HttpError(409, "This account already has a linked world.");
      }
      const code = normalizeRecoveryCode(payload.recoveryCode);
      if (code.length !== 26 || !code.startsWith("DW")) {
        throw new HttpError(400, "The recovery code format is invalid.");
      }
      const recoveryHash = await hashRecoveryCode(code);
      const vault = await getD1()
        .prepare(
          `SELECT v.* FROM vaults v
           LEFT JOIN account_vaults av ON av.vault_id = v.id
           WHERE v.recovery_hash = ?1 AND av.vault_id IS NULL LIMIT 1`,
        )
        .bind(recoveryHash)
        .first<import("@/lib/vault-server").VaultRow>();
      if (!vault) throw new HttpError(404, "No vault matched that recovery code.");
      await getD1().prepare(
        "INSERT INTO account_vaults (account_id, vault_id) VALUES (?1, ?2)",
      ).bind(account.id, vault.id).run();
      const response = noStoreJson({ vault: await loadVaultState(vault) });
      return withSessionCookie(response, request, code);
    }

    if (payload.action === "rotate") {
      stage = "rotate";
      const vault = await requireVault(request);
      const recovery = generateRecoveryCode();
      const hash = await hashRecoveryCode(recovery.raw);
      await getD1()
        .prepare("UPDATE vaults SET recovery_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2")
        .bind(hash, vault.id)
        .run();
      const response = noStoreJson({ recoveryCode: recovery.display });
      return withSessionCookie(response, request, recovery.raw);
    }

    if (payload.action !== "create") {
      throw new HttpError(400, "Unknown vault action.");
    }

    if (await accountHasVault(account.id)) {
      throw new HttpError(409, "This account already has a connected world.");
    }

    const recovery = generateRecoveryCode();
    stage = "create_validation";
    const recoveryHash = await hashRecoveryCode(recovery.raw);
    const vaultId = crypto.randomUUID();
    const alias = cleanText(payload.profile?.alias, 30, "Shore Walker") || "Shore Walker";
    const region = cleanText(payload.profile?.region, 60, "Not shared") || "Not shared";
    const pressure = cleanText(payload.profile?.pressure, 800);
    const ageBand = ageBands.has(payload.profile?.ageBand ?? "") ? payload.profile!.ageBand! : "";
    const gender = genders.has(payload.profile?.gender ?? "") ? payload.profile!.gender! : "";
    const mbtiCandidate = cleanText(payload.profile?.mbti, 4).toUpperCase();
    const mbti = mbtiTypes.has(mbtiCandidate) ? mbtiCandidate : "";
    const zodiac = zodiacSigns.has(payload.profile?.zodiac ?? "") ? payload.profile!.zodiac! : "";
    const selfDescription = cleanText(payload.profile?.selfDescription, 1_200);
    const repaymentPlan = cleanText(payload.profile?.repaymentPlan, 1_200);
    const repaymentOutlook = repaymentOutlooks.has(payload.profile?.repaymentOutlook ?? "") ? payload.profile!.repaymentOutlook! : "";
    const incomePlan = cleanText(payload.profile?.incomePlan, 800);
    const countryCode = cleanText(payload.profile?.countryCode, 8).toUpperCase();
    const countryName = cleanText(payload.profile?.countryName, 80);
    const displayCurrency = /^[A-Z]{3}$/.test(payload.profile?.displayCurrency ?? "")
      ? payload.profile!.displayCurrency!
      : "CNY";
    const monthlyIncome = cleanNumber(payload.profile?.monthlyIncome, 0, 1_000_000_000_000, 0);
    const monthlyExpenses = cleanNumber(payload.profile?.monthlyExpenses, 0, 1_000_000_000_000, 0);
    const positionX = cleanNumber(payload.position?.x, 6, 94, 47);
    const positionY = cleanNumber(payload.position?.y, 12, 88, 63);
    const locale = payload.locale === "en" ? "en" : "zh";
    const discoveryConsent = payload.discoveryConsent === true ? 1 : 0;
    const debts = Array.isArray(payload.debts)
      ? payload.debts.slice(0, 30).map((item) => ({ ...validateDebt(item as import("@/lib/vault-server").DebtInput), id: crypto.randomUUID() }))
      : [];
    stage = "beta_rules";
    const betaEnrollment = await consumeBetaInvite({
      inviteCode: payload.inviteCode,
      betaConsent: payload.betaConsent,
      locale,
    });
    const db = getD1();
    const statements = [
      db
        .prepare(
          `INSERT INTO vaults
            (id, recovery_hash, alias, region, pressure, age_band, gender, mbti, zodiac,
             self_description, repayment_plan, repayment_outlook, income_plan, position_x, position_y, locale,
             country_code, country_name, display_currency, monthly_income, monthly_expenses, discovery_consent)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)`,
        )
        .bind(vaultId, recoveryHash, alias, region, pressure, ageBand, gender, mbti, zodiac, selfDescription, repaymentPlan, repaymentOutlook, incomePlan, positionX, positionY, locale, countryCode, countryName, displayCurrency, monthlyIncome, monthlyExpenses, discoveryConsent),
      db.prepare(
        "INSERT INTO account_vaults (account_id, vault_id) VALUES (?1, ?2)",
      ).bind(account.id, vaultId),
      ...(betaEnrollment ? [db.prepare(
        `INSERT INTO beta_enrollments (id, vault_id, invite_digest, consent_version)
         VALUES (?1, ?2, ?3, ?4)`,
      ).bind(crypto.randomUUID(), vaultId, betaEnrollment.inviteDigest, betaEnrollment.consentVersion)] : []),
      ...debts.map((debt) =>
        db
          .prepare(
            `INSERT INTO debts
              (id, vault_id, kind, custom_label, currency, original, balance, monthly, apr, minimum_payment, payment_status, remaining_months, due_day, method, sharing_mode, last_paid_at, payments)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`,
          )
          .bind(
            debt.id,
            vaultId,
            debt.kind,
            debt.customLabel,
            debt.currency,
            debt.original,
            debt.balance,
            debt.monthly,
            debt.apr,
            debt.minimumPayment,
            debt.paymentStatus,
            debt.remainingMonths,
            debt.dueDay,
            debt.method,
            debt.sharingMode,
            debt.lastPaidAt,
            debt.payments,
          ),
      ),
      ...debts.flatMap((debt) =>
        debt.history.map((payment) =>
          db
            .prepare(
              `INSERT INTO payment_records
                (id, vault_id, debt_id, scheduled_date, confirmed_at, event_date, cash_payment, new_balance, source, income_type)
               VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, ?8, ?9)`,
            )
            .bind(
              crypto.randomUUID(),
              vaultId,
              debt.id,
              payment.confirmedAt,
              payment.eventDate ?? payment.confirmedAt.slice(0, 10),
              payment.cashPayment,
              payment.newBalance,
              payment.source ?? "self_report",
              payment.incomeType ?? null,
            ),
        ),
      ),
    ];
    stage = "create_batch";
    await db.batch(statements);
    stage = "create_readback";
    const vault = await db
      .prepare("SELECT * FROM vaults WHERE id = ?1")
      .bind(vaultId)
      .first<import("@/lib/vault-server").VaultRow>();
    if (!vault) throw new Error("Vault creation did not return a record.");
    stage = "create_state";
    const response = noStoreJson({
      recoveryCode: recovery.display,
      vault: await loadVaultState(vault),
    }, { status: 201 });
    return withSessionCookie(response, request, recovery.raw);
  } catch (error) {
    if (!(error instanceof HttpError)) {
      const message = error instanceof Error ? error.message.slice(0, 300) : "Unknown vault storage failure";
      console.error("Debt World vault request failed", { stage, message });
    }
    return routeError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    await ensureVaultStorageSchema();
    const vault = await requireVault(request);
    const payload = (await request.json()) as {
      profile?: ProfileInput;
      position?: { x?: number; y?: number };
      locale?: string;
      discoveryConsent?: boolean;
    };
    const alias = cleanText(payload.profile?.alias, 30, vault.alias) || vault.alias;
    const region = cleanText(payload.profile?.region, 60, vault.region) || vault.region;
    const pressure = cleanText(payload.profile?.pressure, 800, vault.pressure);
    const ageBand = payload.profile?.ageBand === undefined ? vault.age_band : ageBands.has(payload.profile.ageBand) ? payload.profile.ageBand : "";
    const gender = payload.profile?.gender === undefined ? vault.gender : genders.has(payload.profile.gender) ? payload.profile.gender : "";
    const mbtiCandidate = cleanText(payload.profile?.mbti, 4, vault.mbti).toUpperCase();
    const mbti = mbtiTypes.has(mbtiCandidate) ? mbtiCandidate : "";
    const zodiac = payload.profile?.zodiac === undefined ? vault.zodiac : zodiacSigns.has(payload.profile.zodiac) ? payload.profile.zodiac : "";
    const selfDescription = cleanText(payload.profile?.selfDescription, 1_200, vault.self_description);
    const repaymentPlan = cleanText(payload.profile?.repaymentPlan, 1_200, vault.repayment_plan);
    const repaymentOutlook = payload.profile?.repaymentOutlook === undefined ? vault.repayment_outlook : repaymentOutlooks.has(payload.profile.repaymentOutlook) ? payload.profile.repaymentOutlook : "";
    const incomePlan = cleanText(payload.profile?.incomePlan, 800, vault.income_plan);
    const countryCode = cleanText(payload.profile?.countryCode, 8, vault.country_code).toUpperCase();
    const countryName = cleanText(payload.profile?.countryName, 80, vault.country_name);
    const displayCurrency = typeof payload.profile?.displayCurrency === "string" && /^[A-Z]{3}$/.test(payload.profile.displayCurrency)
      ? payload.profile.displayCurrency
      : vault.display_currency;
    const monthlyIncome = cleanNumber(payload.profile?.monthlyIncome, 0, 1_000_000_000_000, vault.monthly_income);
    const monthlyExpenses = cleanNumber(payload.profile?.monthlyExpenses, 0, 1_000_000_000_000, vault.monthly_expenses);
    const positionX = cleanNumber(payload.position?.x, 6, 94, vault.position_x);
    const positionY = cleanNumber(payload.position?.y, 12, 88, vault.position_y);
    const locale = payload.locale === "en" || payload.locale === "zh" ? payload.locale : vault.locale;
    const discoveryConsent = payload.discoveryConsent === undefined
      ? vault.discovery_consent
      : payload.discoveryConsent === true ? 1 : 0;
    await getD1()
      .prepare(
         `UPDATE vaults
         SET alias = ?1, region = ?2, pressure = ?3, age_band = ?4, gender = ?5, mbti = ?6, zodiac = ?7,
             self_description = ?8, repayment_plan = ?9, repayment_outlook = ?10, income_plan = ?11,
             position_x = ?12, position_y = ?13, locale = ?14, country_code = ?15, country_name = ?16,
             display_currency = ?17, monthly_income = ?18, monthly_expenses = ?19, discovery_consent = ?20,
             updated_at = CURRENT_TIMESTAMP WHERE id = ?21`,
      )
      .bind(alias, region, pressure, ageBand, gender, mbti, zodiac, selfDescription, repaymentPlan, repaymentOutlook, incomePlan, positionX, positionY, locale, countryCode, countryName, displayCurrency, monthlyIncome, monthlyExpenses, discoveryConsent, vault.id)
      .run();
    return noStoreJson({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    await ensureVaultStorageSchema();
    const vault = await requireVault(request);
    const payload = (await request.json()) as { confirm?: string };
    if (payload.confirm !== "DELETE") {
      throw new HttpError(400, "Type DELETE to permanently remove the vault.");
    }
    const db = getD1();
    const link = await db.prepare(
      "SELECT account_id FROM account_vaults WHERE vault_id = ?1 LIMIT 1",
    ).bind(vault.id).first<{ account_id: string }>();
    await db.batch([
      db.prepare("DELETE FROM lucky_income_claims WHERE vault_id = ?1").bind(vault.id),
      db.prepare("DELETE FROM payment_records WHERE vault_id = ?1").bind(vault.id),
      db.prepare("DELETE FROM debts WHERE vault_id = ?1").bind(vault.id),
      ...(link ? [
        db.prepare("DELETE FROM account_sessions WHERE account_id = ?1").bind(link.account_id),
        db.prepare("DELETE FROM account_vaults WHERE account_id = ?1").bind(link.account_id),
        db.prepare("DELETE FROM accounts WHERE id = ?1").bind(link.account_id),
      ] : []),
      db.prepare("DELETE FROM vaults WHERE id = ?1").bind(vault.id),
    ]);
    return clearAccountSession(clearSessionCookie(noStoreJson({ deleted: true }), request), request);
  } catch (error) {
    return routeError(error);
  }
}
