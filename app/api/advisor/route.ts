import { advisorReadiness, runAdvisor } from "@/lib/advisor-server";
import type { Locale } from "@/lib/debt-world-types";
import {
  HttpError,
  assertSameOrigin,
  cleanText,
  noStoreJson,
  requireVault,
  routeError,
} from "@/lib/vault-server";

export const dynamic = "force-dynamic";

export async function GET() {
  return noStoreJson(advisorReadiness());
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const vault = await requireVault(request);
    const body = await request.json() as { message?: unknown; locale?: unknown };
    const message = cleanText(body.message, 1000);
    if (!message) throw new HttpError(400, "A question is required.");
    const locale: Locale = body.locale === "en" ? "en" : "zh";
    const result = await runAdvisor(vault, message, locale);
    return noStoreJson(result);
  } catch (error) {
    return routeError(error);
  }
}
