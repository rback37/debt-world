export type Locale = "zh" | "en";
export type SharingMode = "private" | "range";
export type DebtPaymentStatus = "current" | "late" | "collection" | "unknown";

export type DebtKind =
  | "mortgage"
  | "card"
  | "education"
  | "medical"
  | "car"
  | "personal"
  | "business"
  | "bnpl"
  | "informal"
  | "other";

export type PaymentHistory = {
  confirmedAt: string;
  cashPayment: number;
  newBalance: number;
  source?: "self_report" | "prepayment" | "lucky_income";
  incomeType?: string;
  eventDate?: string;
};

export type Debt = {
  id: string;
  kind: DebtKind;
  customLabel?: string;
  currency: string;
  original: number;
  balance: number;
  monthly: number;
  apr?: number | null;
  minimumPayment?: number | null;
  paymentStatus?: DebtPaymentStatus;
  remainingMonths?: number | null;
  dueDay: number;
  method: string;
  sharingMode?: SharingMode;
  lastPaidAt?: string;
  payments: number;
  history?: PaymentHistory[];
};

export type Profile = {
  alias: string;
  region: string;
  pressure: string;
  ageBand: string;
  gender: string;
  mbti: string;
  zodiac: string;
  selfDescription: string;
  repaymentPlan: string;
  repaymentOutlook: string;
  incomePlan: string;
  countryCode: string;
  countryName: string;
  displayCurrency: string;
  monthlyIncome: number;
  monthlyExpenses: number;
};

export type Position = {
  x: number;
  y: number;
};

export type VaultPayload = {
  profile: Profile;
  position: Position;
  locale: Locale;
  discoveryConsent: boolean;
  debts: Debt[];
  policyAcceptances?: Array<{ policyKey: string; policyVersion: string; acceptedAt: string }>;
  betaEnrollment?: { consentVersion: string; createdAt: string } | null;
  betaFeedback?: Array<{ category: string; rating: number; message: string; pagePath: string; status: string; createdAt: string }>;
  createdAt?: string;
  updatedAt?: string;
};

export type CloudState = "checking" | "local" | "syncing" | "synced" | "error";

export type AdvisorRisk =
  | "none"
  | "self_harm"
  | "scam"
  | "illegal_collection"
  | "legal_deadline"
  | "medical";

export type AdvisorDebtDraft = {
  kind: DebtKind | null;
  customLabel: string | null;
  currency: string | null;
  original: number | null;
  balance: number | null;
  monthly: number | null;
  apr: number | null;
  minimumPayment: number | null;
  paymentStatus: DebtPaymentStatus;
  remainingMonths: number | null;
  dueDay: number | null;
  method: string | null;
  missingFields: Array<
    | "kind"
    | "customLabel"
    | "currency"
    | "original"
    | "balance"
    | "monthly"
    | "apr"
    | "minimumPayment"
    | "paymentStatus"
    | "remainingMonths"
    | "dueDay"
    | "method"
  >;
};

export type AdvisorResult = {
  reply: string;
  mode: "support" | "debt_capture" | "debt_review" | "world_data" | "urgent";
  nextQuestion: string | null;
  risk: AdvisorRisk;
  actions: string[];
  drafts: AdvisorDebtDraft[];
  remainingToday: number;
  provider: "openai" | "minimax";
  model: string;
};

export type AdvisorReadiness = {
  configured: boolean;
  provider: "openai" | "minimax" | null;
  model: string | null;
};
