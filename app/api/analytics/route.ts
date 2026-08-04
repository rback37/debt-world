import { getD1 } from "@/db";
import { assertSameOrigin, cleanText, noStoreJson, routeError } from "@/lib/vault-server";

export const dynamic = "force-dynamic";
const VISITOR_COOKIE = "dw_visitor";

function readCookie(request: Request, name: string) {
  const source = request.headers.get("Cookie") ?? "";
  for (const part of source.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function newVisitorId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sourceName(value: unknown) {
  const source = cleanText(value, 24).toLowerCase().replace(/[^a-z]/g, "");
  return source || "direct";
}

function safePath(value: unknown) {
  const path = cleanText(value, 80).split("?")[0];
  return /^\/(?:en(?:\/about)?|about|safety|en\/safety)?$/.test(path) ? path || "/" : "/other";
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const payload = await request.json().catch(() => ({})) as { locale?: unknown; source?: unknown; path?: unknown };
    const visitDate = new Date().toISOString().slice(0, 10);
    const existing = readCookie(request, VISITOR_COOKIE);
    const visitorId = /^[a-f0-9]{32}$/.test(existing) ? existing : newVisitorId();
    const visitorDigest = await digest(`${visitDate}:${visitorId}`);
    const id = `${visitDate}:${visitorDigest}`;
    const locale = payload.locale === "en" ? "en" : "zh";
    const db = getD1();
    await db.batch([
      db.prepare(`INSERT INTO site_daily_visitors
        (id, visit_date, visitor_digest, first_source, first_locale, first_path, page_views)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)
       ON CONFLICT(visit_date, visitor_digest) DO UPDATE SET
         page_views = MIN(site_daily_visitors.page_views + 1, 1000),
         last_seen_at = CURRENT_TIMESTAMP`).bind(id, visitDate, visitorDigest, sourceName(payload.source), locale, safePath(payload.path)),
      db.prepare("DELETE FROM site_daily_visitors WHERE visit_date < date('now', '-90 days')"),
    ]);
    const response = noStoreJson({ recorded: true });
    if (visitorId !== existing) {
      const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
      response.headers.append("Set-Cookie", `${VISITOR_COOKIE}=${visitorId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=15552000${secure}`);
    }
    return response;
  } catch (error) {
    return routeError(error);
  }
}
