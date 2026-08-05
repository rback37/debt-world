import { getD1 } from "@/db";
import {
  HttpError,
  assertSameOrigin,
  noStoreJson,
  requireVault,
  routeError,
  validateDebt,
} from "@/lib/vault-server";
import { qualifyReferral } from "@/lib/referral-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const vault = await requireVault(request);
    const debt = { ...validateDebt(await request.json()), id: crypto.randomUUID() };
    await getD1()
      .prepare(
        `INSERT INTO debts
          (id, vault_id, kind, custom_label, currency, original, balance, monthly, apr, minimum_payment, payment_status, remaining_months, due_day, method, sharing_mode, last_paid_at, payments)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`,
      )
      .bind(
        debt.id,
        vault.id,
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
      )
      .run();
    const referralActivated = await qualifyReferral(vault.id);
    return noStoreJson({ debt: { ...debt, history: [] }, referralActivated }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const vault = await requireVault(request);
    const payload = (await request.json()) as { id?: string } & Record<string, unknown>;
    if (!payload.id) throw new HttpError(400, "Debt id is required.");
    const owned = await getD1()
      .prepare("SELECT * FROM debts WHERE id = ?1 AND vault_id = ?2 LIMIT 1")
      .bind(payload.id, vault.id)
      .first<{
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
      }>();
    if (!owned) throw new HttpError(404, "Debt not found.");
    const debt = validateDebt({
      id: owned.id,
      kind: typeof payload.kind === "string" ? payload.kind : owned.kind,
      customLabel: typeof payload.customLabel === "string" ? payload.customLabel : owned.custom_label ?? undefined,
      currency: typeof payload.currency === "string" ? payload.currency : owned.currency,
      original: payload.original === undefined ? owned.original : Number(payload.original),
      balance: payload.balance === undefined ? owned.balance : Number(payload.balance),
      monthly: payload.monthly === undefined ? owned.monthly : Number(payload.monthly),
      apr: payload.apr === undefined ? owned.apr : payload.apr === null || payload.apr === "" ? null : Number(payload.apr),
      minimumPayment: payload.minimumPayment === undefined ? owned.minimum_payment : payload.minimumPayment === null || payload.minimumPayment === "" ? null : Number(payload.minimumPayment),
      paymentStatus: typeof payload.paymentStatus === "string" ? payload.paymentStatus : owned.payment_status,
      remainingMonths: payload.remainingMonths === undefined ? owned.remaining_months : payload.remainingMonths === null || payload.remainingMonths === "" ? null : Number(payload.remainingMonths),
      dueDay: payload.dueDay === undefined ? owned.due_day : Number(payload.dueDay),
      method: typeof payload.method === "string" ? payload.method : owned.method,
      sharingMode: typeof payload.sharingMode === "string" ? payload.sharingMode : owned.sharing_mode,
      lastPaidAt: owned.last_paid_at ?? undefined,
      payments: owned.payments,
    });
    await getD1()
      .prepare(
        `UPDATE debts
         SET kind = ?1, custom_label = ?2, currency = ?3, original = ?4, balance = ?5, monthly = ?6,
             apr = ?7, minimum_payment = ?8, payment_status = ?9, remaining_months = ?10,
             due_day = ?11, method = ?12, sharing_mode = ?13, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?14 AND vault_id = ?15`,
      )
      .bind(
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
        debt.id,
        vault.id,
      )
      .run();
    return noStoreJson({ debt });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const vault = await requireVault(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new HttpError(400, "Debt id is required.");
    const db = getD1();
    const owned = await db
      .prepare("SELECT id FROM debts WHERE id = ?1 AND vault_id = ?2 LIMIT 1")
      .bind(id, vault.id)
      .first();
    if (!owned) throw new HttpError(404, "Debt not found.");
    await db.batch([
      db.prepare("DELETE FROM payment_records WHERE debt_id = ?1 AND vault_id = ?2").bind(id, vault.id),
      db.prepare("DELETE FROM debts WHERE id = ?1 AND vault_id = ?2").bind(id, vault.id),
    ]);
    return noStoreJson({ deleted: true });
  } catch (error) {
    return routeError(error);
  }
}
