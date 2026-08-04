import { noStoreJson } from "@/lib/vault-server";
import { turnstilePublicState } from "@/lib/turnstile-server";

export const dynamic = "force-dynamic";

export async function GET() {
  return noStoreJson({ turnstile: turnstilePublicState() });
}
