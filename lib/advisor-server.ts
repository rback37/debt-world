import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import type { AdvisorDebtDraft, AdvisorResult, DebtKind, Locale } from "@/lib/debt-world-types";
import { HttpError, cleanText, type VaultRow } from "@/lib/vault-server";

export const ADVISOR_MODEL = "gpt-5.6-terra";
export const MINIMAX_ADVISOR_MODEL = "MiniMax-M2.7";
export const ADVISOR_DAILY_REQUEST_LIMIT = 20;
const ADVISOR_DAILY_INPUT_LIMIT = 50_000;
const ADVISOR_DAILY_OUTPUT_LIMIT = 20_000;

type AdvisorProvider = "openai" | "minimax";

type AdvisorProviderConfig = {
  provider: AdvisorProvider;
  model: string;
  apiKey: string;
};

const debtKinds = new Set<DebtKind>([
  "mortgage",
  "card",
  "education",
  "medical",
  "car",
  "personal",
  "business",
  "bnpl",
  "informal",
  "other",
]);

const missingFields = new Set<AdvisorDebtDraft["missingFields"][number]>([
  "kind",
  "customLabel",
  "currency",
  "original",
  "balance",
  "monthly",
  "apr",
  "minimumPayment",
  "paymentStatus",
  "remainingMonths",
  "dueDay",
  "method",
]);

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "mode", "nextQuestion", "risk", "actions", "drafts"],
  properties: {
    reply: { type: "string", minLength: 1, maxLength: 1500 },
    mode: {
      type: "string",
      enum: ["support", "debt_capture", "debt_review", "world_data", "urgent"],
    },
    nextQuestion: {
      anyOf: [
        { type: "string", minLength: 1, maxLength: 220 },
        { type: "null" },
      ],
    },
    risk: {
      type: "string",
      enum: ["none", "self_harm", "scam", "illegal_collection", "legal_deadline", "medical"],
    },
    actions: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 180 },
    },
    drafts: {
      type: "array",
      minItems: 0,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "kind",
          "customLabel",
          "currency",
          "original",
          "balance",
          "monthly",
          "apr",
          "minimumPayment",
          "paymentStatus",
          "remainingMonths",
          "dueDay",
          "method",
          "missingFields",
        ],
        properties: {
          kind: {
            anyOf: [
              { type: "string", enum: [...debtKinds] },
              { type: "null" },
            ],
          },
          customLabel: {
            anyOf: [
              { type: "string", maxLength: 80 },
              { type: "null" },
            ],
          },
          currency: {
            anyOf: [
              { type: "string", pattern: "^[A-Z]{3,8}$" },
              { type: "null" },
            ],
          },
          original: {
            anyOf: [
              { type: "number", minimum: 0, maximum: 1_000_000_000_000 },
              { type: "null" },
            ],
          },
          balance: {
            anyOf: [
              { type: "number", minimum: 0, maximum: 1_000_000_000_000 },
              { type: "null" },
            ],
          },
          monthly: {
            anyOf: [
              { type: "number", minimum: 0, maximum: 1_000_000_000_000 },
              { type: "null" },
            ],
          },
          apr: {
            anyOf: [
              { type: "number", minimum: 0, maximum: 1_000 },
              { type: "null" },
            ],
          },
          minimumPayment: {
            anyOf: [
              { type: "number", minimum: 0, maximum: 1_000_000_000_000 },
              { type: "null" },
            ],
          },
          paymentStatus: {
            type: "string",
            enum: ["current", "late", "collection", "unknown"],
          },
          remainingMonths: {
            anyOf: [
              { type: "integer", minimum: 1, maximum: 1_200 },
              { type: "null" },
            ],
          },
          dueDay: {
            anyOf: [
              { type: "integer", minimum: 1, maximum: 31 },
              { type: "null" },
            ],
          },
          method: {
            anyOf: [
              { type: "string", maxLength: 80 },
              { type: "null" },
            ],
          },
          missingFields: {
            type: "array",
            minItems: 0,
            maxItems: 12,
            items: {
              type: "string",
              enum: [...missingFields],
            },
          },
        },
      },
    },
  },
} as const;

const systemPrompt = `
You are Kian, the bilingual debt-pressure guide inside Debt World.
Your job is to reduce shame, organize facts, and help the user choose one safe next step.

Hard boundaries:
- This is educational support, not financial, legal, medical, or tax advice.
- Never guarantee debt relief, tell a user to stop paying, hide assets, evade a creditor, borrow more, or make an investment.
- Never invent interest rates, laws, deadlines, creditor policies, world statistics, or facts not present in the supplied JSON.
- For local law, court papers, limitation periods, collections, insolvency, taxes, or contract penalties: organize documents and questions, then recommend checking a qualified local professional or official service. Do not reach a local legal conclusion.
- If self-harm or immediate-safety risk appears: respond briefly and compassionately, prioritize contacting local emergency/crisis services or a trusted person now, and do not keep discussing repayment strategy. Do not provide a phone number.
- If a scam or impersonation risk appears: advise pausing payment, independently verifying the organization through an official channel, and never sharing codes or passwords.
- Never shame a person or produce an individual "who owes the most" leaderboard.
- World aggregates may be discussed only when dataReady is true and only from the supplied aggregate fields.

Debt capture:
- Extract every clearly described debt into drafts, up to six.
- Treat every draft as unconfirmed. Never claim it was saved.
- Use only these kinds: mortgage, card, education, medical, car, personal, business, bnpl, informal, other.
- "Owe a friend/family member" is informal. A novel source can be other with a concise customLabel.
- Use null for unknown fields and list each unknown field in missingFields.
- APR means the stated annual percentage rate, not a guessed monthly rate. minimumPayment is the creditor-required minimum, while monthly is what the user currently plans or actually pays.
- paymentStatus must be current, late, collection, or unknown. remainingMonths is the stated remaining term, never an estimate.
- If data is missing, ask exactly one short question in nextQuestion: the single most useful missing field across all drafts.
- If nothing is missing or no debt capture is underway, nextQuestion may be null.

Repayment comparison:
- When the user asks what to repay first, compare three lenses when the supplied facts allow it: highest APR first, smallest balance first, and cash-flow safety first.
- Put overdue or collection risk and essential living costs ahead of optional extra payments. If monthly cash flow is not positive, do not recommend an extra-payment amount.
- Explain which missing APR, minimum-payment, status, or remaining-term facts could change the comparison. Never invent payoff dates or savings.

Response style:
- Reply in the requested locale (zh or en).
- Lead with the most useful conclusion. Be warm, direct, and concise.
- Give at most three concrete actions.
- Do not repeat all supplied balances unless it helps answer the question.
`.trim();

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

type MiniMaxResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

function runtimeValue(name: string, max = 512) {
  const workerEnv = env as unknown as Record<string, unknown>;
  const bindingValue = cleanText(workerEnv[name], max);
  if (bindingValue) return bindingValue;
  try {
    return cleanText(process.env?.[name], max);
  } catch {
    return "";
  }
}

function advisorProviderConfig(): AdvisorProviderConfig | null {
  const preferred = runtimeValue("AI_PROVIDER", 20).toLowerCase();
  const minimaxKey = runtimeValue("MINIMAX_API_KEY");
  const openAIKey = runtimeValue("OPENAI_API_KEY");
  if (preferred === "minimax") {
    return minimaxKey
      ? { provider: "minimax", model: MINIMAX_ADVISOR_MODEL, apiKey: minimaxKey }
      : null;
  }
  if (preferred === "openai") {
    return openAIKey
      ? { provider: "openai", model: ADVISOR_MODEL, apiKey: openAIKey }
      : null;
  }
  if (minimaxKey) {
    return { provider: "minimax", model: MINIMAX_ADVISOR_MODEL, apiKey: minimaxKey };
  }
  if (openAIKey) {
    return { provider: "openai", model: ADVISOR_MODEL, apiKey: openAIKey };
  }
  return null;
}

export function advisorReadiness() {
  const config = advisorProviderConfig();
  return config
    ? { configured: true as const, provider: config.provider, model: config.model }
    : { configured: false as const, provider: null, model: null };
}

function boundedNumber(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, value));
}

function oneQuestion(value: unknown) {
  const text = cleanText(value, 220);
  if (!text) return null;
  const match = text.match(/^.*?[?？]/);
  return match?.[0] ?? text;
}

function normalizeDraft(value: unknown): AdvisorDebtDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Record<string, unknown>;
  const kind = typeof draft.kind === "string" && debtKinds.has(draft.kind as DebtKind)
    ? draft.kind as DebtKind
    : null;
  const customLabel = cleanText(draft.customLabel, 80) || null;
  const currencyText = cleanText(draft.currency, 8).toUpperCase();
  const currency = /^[A-Z]{3,8}$/.test(currencyText) ? currencyText : null;
  const rawMissing = Array.isArray(draft.missingFields) ? draft.missingFields : [];
  return {
    kind,
    customLabel,
    currency,
    original: boundedNumber(draft.original, 0, 1_000_000_000_000),
    balance: boundedNumber(draft.balance, 0, 1_000_000_000_000),
    monthly: boundedNumber(draft.monthly, 0, 1_000_000_000_000),
    apr: boundedNumber(draft.apr, 0, 1_000),
    minimumPayment: boundedNumber(draft.minimumPayment, 0, 1_000_000_000_000),
    paymentStatus: draft.paymentStatus === "current" || draft.paymentStatus === "late" || draft.paymentStatus === "collection"
      ? draft.paymentStatus
      : "unknown",
    remainingMonths: boundedNumber(draft.remainingMonths, 1, 1_200) === null
      ? null
      : Math.round(boundedNumber(draft.remainingMonths, 1, 1_200)!),
    dueDay: boundedNumber(draft.dueDay, 1, 31),
    method: cleanText(draft.method, 80) || null,
    missingFields: rawMissing
      .filter((field): field is AdvisorDebtDraft["missingFields"][number] =>
        typeof field === "string" && missingFields.has(field as AdvisorDebtDraft["missingFields"][number]))
      .slice(0, 12),
  };
}

function normalizeResult(
  value: unknown,
  remainingToday: number,
  provider: AdvisorProvider,
  model: string,
): AdvisorResult {
  if (!value || typeof value !== "object") {
    throw new HttpError(502, "The AI reply could not be read. Please try again.");
  }
  const result = value as Record<string, unknown>;
  const reply = cleanText(result.reply, 1500);
  if (!reply) throw new HttpError(502, "The AI reply was empty. Please try again.");
  const modes = new Set(["support", "debt_capture", "debt_review", "world_data", "urgent"]);
  const risks = new Set(["none", "self_harm", "scam", "illegal_collection", "legal_deadline", "medical"]);
  return {
    reply,
    mode: typeof result.mode === "string" && modes.has(result.mode)
      ? result.mode as AdvisorResult["mode"]
      : "support",
    nextQuestion: oneQuestion(result.nextQuestion),
    risk: typeof result.risk === "string" && risks.has(result.risk)
      ? result.risk as AdvisorResult["risk"]
      : "none",
    actions: Array.isArray(result.actions)
      ? result.actions.map((action) => cleanText(action, 180)).filter(Boolean).slice(0, 3)
      : [],
    drafts: Array.isArray(result.drafts)
      ? result.drafts.map(normalizeDraft).filter((draft): draft is AdvisorDebtDraft => Boolean(draft)).slice(0, 6)
      : [],
    remainingToday,
    provider,
    model,
  };
}

async function safetyIdentifier(vaultId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`debt-world:${vaultId}`),
  );
  return `dw_${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")).join("").slice(0, 32)}`;
}

async function reserveDailyUse(vaultId: string) {
  const db = getD1();
  const usageDate = new Date().toISOString().slice(0, 10);
  await db.prepare(
    `INSERT OR IGNORE INTO ai_daily_usage
      (id, vault_id, usage_date, request_count, input_tokens, output_tokens)
     VALUES (?1, ?2, ?3, 0, 0, 0)`,
  ).bind(crypto.randomUUID(), vaultId, usageDate).run();
  const updated = await db.prepare(
    `UPDATE ai_daily_usage
     SET request_count = request_count + 1, updated_at = CURRENT_TIMESTAMP
     WHERE vault_id = ?1 AND usage_date = ?2
       AND request_count < ?3 AND input_tokens < ?4 AND output_tokens < ?5`,
  ).bind(
    vaultId,
    usageDate,
    ADVISOR_DAILY_REQUEST_LIMIT,
    ADVISOR_DAILY_INPUT_LIMIT,
    ADVISOR_DAILY_OUTPUT_LIMIT,
  ).run();
  if (Number(updated.meta?.changes ?? 0) < 1) {
    throw new HttpError(429, "Today's private-test AI limit has been reached. Please try again after 00:00 UTC.");
  }
  const row = await db.prepare(
    `SELECT request_count FROM ai_daily_usage
     WHERE vault_id = ?1 AND usage_date = ?2 LIMIT 1`,
  ).bind(vaultId, usageDate).first<{ request_count: number }>();
  return {
    usageDate,
    remainingToday: Math.max(0, ADVISOR_DAILY_REQUEST_LIMIT - Number(row?.request_count ?? ADVISOR_DAILY_REQUEST_LIMIT)),
  };
}

async function recordUsage(vaultId: string, usageDate: string, inputTokens: number, outputTokens: number) {
  await getD1().prepare(
    `UPDATE ai_daily_usage
     SET input_tokens = input_tokens + ?1, output_tokens = output_tokens + ?2, updated_at = CURRENT_TIMESTAMP
     WHERE vault_id = ?3 AND usage_date = ?4`,
  ).bind(
    Math.max(0, Math.round(inputTokens)),
    Math.max(0, Math.round(outputTokens)),
    vaultId,
    usageDate,
  ).run();
}

function outputText(response: OpenAIResponse) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  return "";
}

async function loadAdvisorContext(vault: VaultRow) {
  const db = getD1();
  const [debtResult, storyCount, debtKindsResult, approachesResult] = await Promise.all([
    db.prepare(
      `SELECT kind, custom_label, currency, original, balance, monthly, apr, minimum_payment,
              payment_status, remaining_months, due_day, method
       FROM debts WHERE vault_id = ?1 ORDER BY created_at ASC LIMIT 12`,
    ).bind(vault.id).all<{
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
    }>(),
    db.prepare("SELECT COUNT(*) AS count FROM public_stories WHERE status = 'published'")
      .first<{ count: number }>(),
    db.prepare(
      `SELECT debt_kind AS label, COUNT(*) AS count FROM public_stories
       WHERE status = 'published' GROUP BY debt_kind ORDER BY count DESC, debt_kind ASC LIMIT 5`,
    ).all<{ label: string; count: number }>(),
    db.prepare(
      `SELECT repayment_approach AS label, COUNT(*) AS count FROM public_stories
       WHERE status = 'published' GROUP BY repayment_approach ORDER BY count DESC, repayment_approach ASC LIMIT 5`,
    ).all<{ label: string; count: number }>(),
  ]);
  const reviewedStoryCount = Number(storyCount?.count ?? 0);
  const dataReady = reviewedStoryCount >= 30;
  return {
    profile: {
      countryCode: vault.country_code,
      displayCurrency: vault.display_currency,
      monthlyIncome: vault.monthly_income,
      monthlyExpenses: vault.monthly_expenses,
      ageBand: vault.age_band || null,
      mbti: vault.mbti || null,
      zodiac: vault.zodiac || null,
      selfDescription: vault.self_description || null,
      repaymentPlan: vault.repayment_plan || null,
      repaymentOutlook: vault.repayment_outlook || null,
      incomePlan: vault.income_plan || null,
    },
    debts: debtResult.results.map((debt) => ({
      kind: debt.kind,
      customLabel: debt.custom_label,
      currency: debt.currency,
      original: debt.original,
      balance: debt.balance,
      monthly: debt.monthly,
      apr: debt.apr,
      minimumPayment: debt.minimum_payment,
      paymentStatus: debt.payment_status,
      remainingMonths: debt.remaining_months,
      dueDay: debt.due_day,
      method: debt.method,
    })),
    worldData: {
      reviewedStoryCount,
      dataReady,
      minimumReviewedStories: 30,
      debtKinds: dataReady ? debtKindsResult.results : [],
      repaymentApproaches: dataReady ? approachesResult.results : [],
      individualLargestDebtorLeaderboard: "not_collected_or_published",
    },
  };
}

export async function runAdvisor(
  vault: VaultRow,
  userQuestion: string,
  locale: Locale,
) {
  const config = advisorProviderConfig();
  if (!config) {
    throw new HttpError(
      503,
      locale === "zh"
        ? "真实 AI 密钥尚未进入运行环境，本机规则分析仍可使用。"
        : "The real-AI key is not available in the runtime yet. The on-device guide remains available.",
    );
  }
  const context = await loadAdvisorContext(vault);
  const reservation = await reserveDailyUse(vault.id);
  const privacyNote = "No recovery code, alias, exact city, message history, or public identity is supplied.";
  const input = JSON.stringify({
    locale,
    userQuestion,
    ...context,
    privacyNote,
  });
  const providerResult = config.provider === "minimax"
    ? await callMiniMax(config, input, locale)
    : await callOpenAI(config, input, vault.id, locale);
  await recordUsage(
    vault.id,
    reservation.usageDate,
    providerResult.inputTokens,
    providerResult.outputTokens,
  );
  try {
    return normalizeResult(
      parseProviderJson(providerResult.text),
      reservation.remainingToday,
      config.provider,
      config.model,
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      502,
      locale === "zh"
        ? "AI 回答暂时无法解析，请换一种简短说法再试一次。"
        : "The AI reply could not be read. Try again with a shorter wording.",
    );
  }
}

function parseProviderJson(source: string) {
  const trimmed = source
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown;
    }
    throw new Error("No JSON object in provider response.");
  }
}

function providerHttpError(status: number, locale: Locale) {
  if (status === 401 || status === 403) {
    return new HttpError(
      503,
      locale === "zh"
        ? "AI 密钥无效、已失效或服务区域不匹配，请检查服务商控制台。"
        : "The AI key is invalid, expired, or belongs to a different service region.",
    );
  }
  if (status === 429) {
    return new HttpError(
      503,
      locale === "zh"
        ? "AI 套餐窗口额度或并发限制已达到，请稍后再试。"
        : "The AI plan window or concurrency limit has been reached. Please try again later.",
    );
  }
  return new HttpError(
    502,
    locale === "zh"
      ? "AI 服务暂时没有成功响应，请稍后再试。"
      : "The AI service did not respond successfully. Please try again later.",
  );
}

async function callOpenAI(
  config: AdvisorProviderConfig,
  input: string,
  vaultId: string,
  locale: Locale,
) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      store: false,
      safety_identifier: await safetyIdentifier(vaultId),
      reasoning: { effort: "low" },
      max_output_tokens: 1200,
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "debt_world_advisor",
          strict: true,
          schema: responseSchema,
        },
      },
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: input }],
        },
      ],
    }),
  });
  if (!response.ok) {
    throw providerHttpError(response.status, locale);
  }
  const providerResponse = await response.json() as OpenAIResponse;
  return {
    text: outputText(providerResponse),
    inputTokens: Number(providerResponse.usage?.input_tokens ?? 0),
    outputTokens: Number(providerResponse.usage?.output_tokens ?? 0),
  };
}

async function callMiniMax(
  config: AdvisorProviderConfig,
  input: string,
  locale: Locale,
) {
  const globalRegion = runtimeValue("MINIMAX_REGION", 20).toLowerCase() === "global";
  const baseUrl = globalRegion ? "https://api.minimax.io/v1" : "https://api.minimaxi.com/v1";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      temperature: 1,
      top_p: 0.95,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `${systemPrompt}

Output contract for this request:
- Return exactly one JSON object and no markdown fence.
- Follow this JSON Schema as closely as possible:
${JSON.stringify(responseSchema)}`,
        },
        { role: "user", content: input },
      ],
    }),
  });
  if (!response.ok) {
    throw providerHttpError(response.status, locale);
  }
  const providerResponse = await response.json() as MiniMaxResponse;
  const providerStatus = Number(providerResponse.base_resp?.status_code ?? 0);
  if (providerStatus !== 0) {
    if (providerStatus === 1004) throw providerHttpError(401, locale);
    if (providerStatus === 1002 || providerStatus === 1008 || providerStatus === 1039 || providerStatus === 1041) {
      throw providerHttpError(429, locale);
    }
    throw providerHttpError(502, locale);
  }
  return {
    text: cleanText(providerResponse.choices?.[0]?.message?.content, 10_000),
    inputTokens: Number(providerResponse.usage?.prompt_tokens ?? 0),
    outputTokens: Number(providerResponse.usage?.completion_tokens ?? 0),
  };
}
