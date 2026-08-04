import { getD1 } from "@/db";
import { cleanBetaFeedback } from "@/lib/beta-server";
import { HttpError, assertSameOrigin, cleanNumber, cleanText, noStoreJson, requireVault, routeError } from "@/lib/vault-server";

export const dynamic = "force-dynamic";

const categories = new Set(["confusing", "bug", "helpful", "missing", "safety", "other"]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const vault = await requireVault(request);
    const payload = await request.json() as { category?: string; rating?: number; message?: string; pagePath?: string };
    const category = categories.has(payload.category ?? "") ? payload.category! : "other";
    const rating = Math.round(cleanNumber(payload.rating, 1, 5));
    const message = cleanBetaFeedback(payload.message);
    if (message.length < 12) throw new HttpError(400, "Add a little more detail so the feedback can be acted on.");
    const pagePath = cleanText(payload.pagePath, 80, "/").split("?")[0] || "/";
    const db = getD1();
    const daily = await db.prepare(
      `SELECT COUNT(*) AS count FROM beta_feedback
       WHERE vault_id = ?1 AND created_at >= datetime('now', '-1 day')`,
    ).bind(vault.id).first<{ count: number }>();
    if (Number(daily?.count ?? 0) >= 3) {
      throw new HttpError(429, "Today's feedback limit has been reached. Thank you—please continue tomorrow.");
    }
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO beta_feedback (id, vault_id, category, rating, message, page_path)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).bind(id, vault.id, category, rating, message, pagePath).run();
    return noStoreJson({ id, received: true }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
