export const SAFETY_POLICY_VERSION = "2026-08-01.1";
export const COMMUNITY_POLICY_KEY = "community-rules-and-privacy";
export const COMMUNITY_AGE_KEY = "community-age-18";

export const safetySources = {
  euPrivacyPrinciples: "https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en",
  euDataRequests: "https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/dealing-individuals-requests_en",
  californiaPrivacy: "https://oag.ca.gov/privacy/ccpa",
  usDebtCollection: "https://www.consumerfinance.gov/consumer-tools/debt-collection/",
  usDebtReliefRisk: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-relief-program-and-how-do-i-know-if-i-should-use-one-en-1457/",
} as const;
