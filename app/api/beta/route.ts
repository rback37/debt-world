import { betaPublicState } from "@/lib/beta-server";
import { ensureAccountSignupSourceSchema } from "@/lib/account-server";
import { ensureVaultStorageSchema, noStoreJson, routeError } from "@/lib/vault-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureAccountSignupSourceSchema();
    await ensureVaultStorageSchema();
    const state = await betaPublicState();
    return noStoreJson({
      signupsEnabled: state.signupsEnabled,
      accountSignupsEnabled: state.signupsEnabled && state.signupsToday < state.dailySignupLimit,
      inviteRequired: state.inviteRequired,
      ready: !state.inviteRequired || state.inviteConfigured,
    });
  } catch (error) {
    return routeError(error);
  }
}
