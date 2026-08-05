import { getD1 } from "@/db";
import {
  HttpError,
  assertSameOrigin,
  cleanNumber,
  cleanText,
  noStoreJson,
  requireVault,
  routeError,
} from "@/lib/vault-server";

export const dynamic = "force-dynamic";

const sources = new Set(["self_report", "prepayment", "lucky_income"]);
const incomeTypes = new Set(["bonus", "freelance", "refund", "gift", "sale", "other"]);

function localEventDate(offsetValue: unknown) {
  const offset = Math.round(cleanNumber(offsetValue, -840, 840, 0));
  return new Date(Date.now() - offset * 60_000).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const vault = await requireVault(request);
    const url = new URL(request.url);
    const eventDate = localEventDate(url.searchParams.get("timezoneOffset"));
    const claim = await getD1().prepare(
      "SELECT id FROM lucky_income_claims WHERE vault_id = ?1 AND event_date = ?2 LIMIT 1",
    ).bind(vault.id, eventDate).first();
    return noStoreJson({ eventDate, luckyIncomeUsed: Boolean(claim) });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const vault = await requireVault(request);
    const payload = (await request.json()) as {
      debtId?: string;
      cashPayment?: number;
      newBalance?: number;
      scheduledDate?: string;
      source?: string;
      incomeType?: string;
      timezoneOffset?: number;
    };
    const debtId = cleanText(payload.debtId, 80);
    if (!debtId) throw new HttpError(400, "Debt id is required.");
    const source = sources.has(payload.source ?? "") ? payload.source! : "self_report";
    const incomeType = source === "lucky_income" && incomeTypes.has(payload.incomeType ?? "")
      ? payload.incomeType!
      : null;
    if (source === "lucky_income" && !incomeType) throw new HttpError(400, "A real income type is required.");

    const db = getD1();
    const debt = await db.prepare(
      "SELECT id, balance, payments FROM debts WHERE id = ?1 AND vault_id = ?2 LIMIT 1",
    ).bind(debtId, vault.id).first<{ id: string; balance: number; payments: number }>();
    if (!debt) throw new HttpError(404, "Debt not found.");

    const cashPayment = cleanNumber(payload.cashPayment, 0, 1_000_000_000_000);
    if (cashPayment <= 0) throw new HttpError(400, "The real cash payment must be greater than zero.");
    const newBalance = cleanNumber(payload.newBalance, 0, debt.balance);
    const confirmedAt = new Date().toISOString();
    const eventDate = localEventDate(payload.timezoneOffset);
    const scheduledDate = source === "self_report" && typeof payload.scheduledDate === "string"
      ? payload.scheduledDate.slice(0, 10)
      : null;
    const paymentId = crypto.randomUUID();
    const shoreValueId = crypto.randomUUID();

    if (source === "lucky_income") {
      const used = await db.prepare(
        "SELECT id FROM lucky_income_claims WHERE vault_id = ?1 AND event_date = ?2 LIMIT 1",
      ).bind(vault.id, eventDate).first();
      if (used) throw new HttpError(409, "Today's lucky-income record has already been used.");
    }

    const statements = [];
    if (source === "lucky_income") {
      statements.push(db.prepare(
        "INSERT INTO lucky_income_claims (id, vault_id, event_date) VALUES (?1, ?2, ?3)",
      ).bind(crypto.randomUUID(), vault.id, eventDate));
    }
    statements.push(
      db.prepare(
        `INSERT INTO payment_records
          (id, vault_id, debt_id, scheduled_date, confirmed_at, event_date, cash_payment, new_balance, source, income_type)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      ).bind(paymentId, vault.id, debt.id, scheduledDate, confirmedAt, eventDate, cashPayment, newBalance, source, incomeType),
      db.prepare(
        `UPDATE debts
         SET balance = ?1, last_paid_at = CASE WHEN ?2 = 'self_report' THEN ?3 ELSE last_paid_at END,
             payments = payments + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?4 AND vault_id = ?5`,
      ).bind(newBalance, source, confirmedAt, debt.id, vault.id),
      db.prepare(
        `INSERT INTO shore_value_ledger
          (id, vault_id, event_key, event_type, points, reference_id)
         VALUES (?1, ?2, ?3, 'verified_payment', 5, ?4)`,
      ).bind(shoreValueId, vault.id, `payment:${paymentId}`, paymentId),
      db.prepare(
        `INSERT INTO starlight_wallets
          (vault_id, available, lifetime_earned, lifetime_sent, lifetime_received, updated_at)
         VALUES (?1, 1, 1, 0, 0, CURRENT_TIMESTAMP)
         ON CONFLICT(vault_id) DO UPDATE SET
           available = available + 1,
           lifetime_earned = lifetime_earned + 1,
           updated_at = CURRENT_TIMESTAMP`,
      ).bind(vault.id),
    );
    await db.batch(statements);

    return noStoreJson({
      payment: { id: paymentId, confirmedAt, eventDate, cashPayment, newBalance, source, incomeType },
      debt: { id: debt.id, balance: newBalance, lastPaidAt: source === "self_report" ? confirmedAt : undefined, payments: debt.payments + 1 },
      rewards: { shoreValue: 5, starlight: 1 },
    }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
