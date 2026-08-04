import { env } from "cloudflare:workers";
import { HttpError, cleanText } from "@/lib/vault-server";

type TurnstileVerification = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

function runtimeValue(name: string, max = 2_048) {
  const workerEnv = env as unknown as Record<string, unknown>;
  const bindingValue = cleanText(workerEnv[name], max);
  if (bindingValue) return bindingValue;
  try {
    return cleanText(process.env?.[name], max);
  } catch {
    return "";
  }
}

function truthy(value: string) {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function configuredKeys() {
  return {
    siteKey: runtimeValue("TURNSTILE_SITE_KEY"),
    secretKey: runtimeValue("TURNSTILE_SECRET_KEY"),
  };
}

export function turnstilePublicState() {
  const keys = configuredKeys();
  const configured = Boolean(keys.siteKey && keys.secretKey);
  return {
    configured,
    required: configured || truthy(runtimeValue("TURNSTILE_REQUIRED", 10)),
    siteKey: configured ? keys.siteKey : null,
  };
}

function requestIp(request: Request) {
  return cleanText(
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0],
    80,
  );
}

export async function verifyTurnstileToken(request: Request, token: unknown, expectedAction: string) {
  const keys = configuredKeys();
  const configured = Boolean(keys.siteKey && keys.secretKey);
  const required = configured || truthy(runtimeValue("TURNSTILE_REQUIRED", 10));
  if (!configured) {
    if (required) throw new HttpError(503, "Human verification is still being configured. Please try again later.");
    return;
  }

  const responseToken = cleanText(token, 2_048);
  if (!responseToken) throw new HttpError(428, "Complete the human verification before creating an account.");

  const body = new FormData();
  body.set("secret", keys.secretKey);
  body.set("response", responseToken);
  body.set("idempotency_key", crypto.randomUUID());
  const remoteIp = requestIp(request);
  if (remoteIp) body.set("remoteip", remoteIp);

  let verification: TurnstileVerification;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Siteverify returned ${response.status}`);
    verification = await response.json() as TurnstileVerification;
  } catch {
    throw new HttpError(503, "Human verification is temporarily unavailable. Please try again.");
  }

  if (!verification.success || verification.action !== expectedAction) {
    throw new HttpError(403, "Human verification did not complete. Refresh it and try again.");
  }

  const allowedHostnames = runtimeValue("TURNSTILE_HOSTNAMES", 1_000)
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
  if (allowedHostnames.length && !allowedHostnames.includes((verification.hostname ?? "").toLowerCase())) {
    throw new HttpError(403, "Human verification came from an unexpected website.");
  }
}
