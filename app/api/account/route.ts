import { getD1 } from "@/db";
import {
  accountHasVault,
  clearAccountSession,
  getAccount,
  loginAccount,
  publicAccount,
  registerAccount,
  requireAccount,
  withAccountSession,
} from "@/lib/account-server";
import {
  HttpError,
  SESSION_COOKIE,
  assertSameOrigin,
  ensureAccountWorld,
  hashRecoveryCode,
  noStoreJson,
  normalizeRecoveryCode,
  routeError,
  withSessionCookie,
} from "@/lib/vault-server";
import { verifyTurnstileToken } from "@/lib/turnstile-server";
import { assertAccountSignupOpen } from "@/lib/beta-server";
import { attachReferral } from "@/lib/referral-server";

export const dynamic = "force-dynamic";

function cookieValue(request: Request, name: string) {
  const source = request.headers.get("Cookie") ?? "";
  for (const part of source.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

async function unclaimedVaultFromCode(value: unknown) {
  const code = normalizeRecoveryCode(value);
  if (code.length !== 26 || !code.startsWith("DW")) return null;
  const recoveryHash = await hashRecoveryCode(code);
  const vault = await getD1().prepare(
    `SELECT v.id FROM vaults v
     LEFT JOIN account_vaults av ON av.vault_id = v.id
     WHERE v.recovery_hash = ?1 AND av.vault_id IS NULL LIMIT 1`,
  ).bind(recoveryHash).first<{ id: string }>();
  return vault ? { id: vault.id, code } : null;
}

async function accountState(request: Request) {
  const account = await getAccount(request);
  if (!account) return { authenticated: false as const };
  await ensureAccountWorld(account.id);
  return {
    authenticated: true as const,
    account: publicAccount(account, true),
    legacyVaultDetected: false,
  };
}

export async function GET(request: Request) {
  try {
    return noStoreJson(await accountState(request));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const payload = await request.json() as {
      action?: "register" | "login" | "logout" | "claim_legacy" | "link_vault";
      username?: string;
      password?: string;
      recoveryCode?: string;
      turnstileToken?: string;
      signupSource?: string;
      referralCode?: string;
    };

    if (payload.action === "logout") {
      return clearAccountSession(noStoreJson({ authenticated: false }), request);
    }

    if (payload.action === "register" || payload.action === "login") {
      if (payload.action === "register") {
        await assertAccountSignupOpen();
        await verifyTurnstileToken(request, payload.turnstileToken, "register");
      }
      const result = payload.action === "register"
        ? await registerAccount(request, payload.username, payload.password, payload.signupSource)
        : await loginAccount(request, payload.username, payload.password);
      const world = await ensureAccountWorld(result.account.id);
      if (payload.action === "register" && payload.referralCode) await attachReferral(world.id, payload.referralCode);
      const response = noStoreJson({
        authenticated: true,
        account: publicAccount(result.account, true),
        legacyVaultDetected: false,
      }, { status: payload.action === "register" ? 201 : 200 });
      return withAccountSession(response, request, result.rawToken);
    }

    if (payload.action === "claim_legacy" || payload.action === "link_vault") {
      const account = await requireAccount(request);
      if (await accountHasVault(account.id)) throw new HttpError(409, "This account already has a linked world.");
      const sourceCode = payload.action === "link_vault"
        ? payload.recoveryCode
        : cookieValue(request, SESSION_COOKIE);
      const vault = await unclaimedVaultFromCode(sourceCode);
      if (!vault) throw new HttpError(404, "No unclaimed world matched that recovery code.");
      await getD1().prepare(
        "INSERT INTO account_vaults (account_id, vault_id) VALUES (?1, ?2)",
      ).bind(account.id, vault.id).run();
      const response = noStoreJson({
        authenticated: true,
        account: publicAccount(account, true),
        legacyVaultDetected: false,
      });
      return withSessionCookie(response, request, vault.code);
    }

    throw new HttpError(400, "A valid account action is required.");
  } catch (error) {
    return routeError(error);
  }
}
