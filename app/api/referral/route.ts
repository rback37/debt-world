import { getReferralState } from "@/lib/referral-server";
import { noStoreJson, requireVault, routeError } from "@/lib/vault-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const vault = await requireVault(request);
    return noStoreJson({ referral: await getReferralState(vault.id) });
  } catch (error) {
    return routeError(error);
  }
}
