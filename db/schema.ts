import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const vaults = sqliteTable("vaults", {
  id: text("id").primaryKey(),
  recoveryHash: text("recovery_hash").notNull().unique(),
  alias: text("alias").notNull(),
  region: text("region").notNull(),
  pressure: text("pressure").notNull().default(""),
  ageBand: text("age_band").notNull().default(""),
  gender: text("gender").notNull().default(""),
  mbti: text("mbti").notNull().default(""),
  zodiac: text("zodiac").notNull().default(""),
  selfDescription: text("self_description").notNull().default(""),
  repaymentPlan: text("repayment_plan").notNull().default(""),
  repaymentOutlook: text("repayment_outlook").notNull().default(""),
  incomePlan: text("income_plan").notNull().default(""),
  positionX: real("position_x").notNull().default(47),
  positionY: real("position_y").notNull().default(63),
  locale: text("locale").notNull().default("zh"),
  countryCode: text("country_code").notNull().default(""),
  countryName: text("country_name").notNull().default(""),
  displayCurrency: text("display_currency").notNull().default("CNY"),
  monthlyIncome: real("monthly_income").notNull().default(0),
  monthlyExpenses: real("monthly_expenses").notNull().default(0),
  discoveryConsent: integer("discovery_consent", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userCode: text("user_code").notNull().unique(),
    username: text("username").notNull(),
    usernameNormalized: text("username_normalized").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    passwordIterations: integer("password_iterations").notNull(),
    status: text("status").notNull().default("active"),
    signupSource: text("signup_source").notNull().default("direct"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastLoginAt: text("last_login_at"),
    lastSeenAt: text("last_seen_at"),
  },
  (table) => [index("accounts_created_idx").on(table.createdAt)],
);

export const accountSessions = sqliteTable(
  "account_sessions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("account_sessions_account_idx").on(table.accountId),
    index("account_sessions_expires_idx").on(table.expiresAt),
  ],
);

export const accountVaults = sqliteTable(
  "account_vaults",
  {
    accountId: text("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
    vaultId: text("vault_id").notNull().unique().references(() => vaults.id, { onDelete: "cascade" }),
    linkedAt: text("linked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("account_vaults_vault_idx").on(table.vaultId)],
);

export const accountAuthLimits = sqliteTable(
  "account_auth_limits",
  {
    limitKey: text("limit_key").primaryKey(),
    action: text("action").notNull(),
    windowKey: text("window_key").notNull(),
    attempts: integer("attempts").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("account_auth_limits_window_idx").on(table.windowKey)],
);

export const ownerAdmins = sqliteTable("owner_admins", {
  id: text("id").primaryKey(),
  emailDigest: text("email_digest").notNull().unique(),
  accountId: text("account_id").unique().references(() => accounts.id, { onDelete: "set null" }),
  role: text("role").notNull().default("owner"),
  activatedAt: text("activated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const debts = sqliteTable(
  "debts",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id")
      .notNull()
      .references(() => vaults.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    customLabel: text("custom_label"),
    currency: text("currency").notNull(),
    original: real("original").notNull(),
    balance: real("balance").notNull(),
    monthly: real("monthly").notNull(),
    apr: real("apr"),
    minimumPayment: real("minimum_payment"),
    paymentStatus: text("payment_status").notNull().default("unknown"),
    remainingMonths: integer("remaining_months"),
    dueDay: integer("due_day").notNull(),
    method: text("method").notNull(),
    sharingMode: text("sharing_mode").notNull().default("private"),
    lastPaidAt: text("last_paid_at"),
    payments: integer("payments").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("debts_vault_id_idx").on(table.vaultId)],
);

export const paymentRecords = sqliteTable(
  "payment_records",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id")
      .notNull()
      .references(() => vaults.id, { onDelete: "cascade" }),
    debtId: text("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    scheduledDate: text("scheduled_date"),
    confirmedAt: text("confirmed_at").notNull(),
    eventDate: text("event_date"),
    cashPayment: real("cash_payment").notNull(),
    newBalance: real("new_balance").notNull(),
    source: text("source").notNull().default("self_report"),
    incomeType: text("income_type"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("payments_vault_id_idx").on(table.vaultId),
    index("payments_debt_id_idx").on(table.debtId),
  ],
);

export const shoreValueLedger = sqliteTable(
  "shore_value_ledger",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    eventKey: text("event_key").notNull().unique(),
    eventType: text("event_type").notNull(),
    points: integer("points").notNull(),
    referenceId: text("reference_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("shore_value_vault_created_idx").on(table.vaultId, table.createdAt),
    index("shore_value_event_type_idx").on(table.eventType),
  ],
);

export const starlightWallets = sqliteTable("starlight_wallets", {
  vaultId: text("vault_id").primaryKey().references(() => vaults.id, { onDelete: "cascade" }),
  available: integer("available").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  lifetimeSent: integer("lifetime_sent").notNull().default(0),
  lifetimeReceived: integer("lifetime_received").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const starlightGifts = sqliteTable(
  "starlight_gifts",
  {
    id: text("id").primaryKey(),
    senderVaultId: text("sender_vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    recipientVaultId: text("recipient_vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    storyId: text("story_id"),
    points: integer("points").notNull(),
    giftDate: text("gift_date").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("starlight_sender_created_idx").on(table.senderVaultId, table.createdAt),
    index("starlight_recipient_created_idx").on(table.recipientVaultId, table.createdAt),
  ],
);

export const referralCodes = sqliteTable(
  "referral_codes",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id").notNull().unique().references(() => vaults.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("referral_codes_status_idx").on(table.status)],
);

export const referralRelationships = sqliteTable(
  "referral_relationships",
  {
    id: text("id").primaryKey(),
    inviterVaultId: text("inviter_vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    invitedVaultId: text("invited_vault_id").notNull().unique().references(() => vaults.id, { onDelete: "cascade" }),
    codeId: text("code_id").notNull().references(() => referralCodes.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    qualifiedAt: text("qualified_at"),
    rewardedAt: text("rewarded_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("referrals_inviter_status_idx").on(table.inviterVaultId, table.status),
    index("referrals_created_idx").on(table.createdAt),
  ],
);

export const siteDailyVisitors = sqliteTable(
  "site_daily_visitors",
  {
    id: text("id").primaryKey(),
    visitDate: text("visit_date").notNull(),
    visitorDigest: text("visitor_digest").notNull(),
    firstSource: text("first_source").notNull().default("direct"),
    firstLocale: text("first_locale").notNull().default("zh"),
    firstPath: text("first_path").notNull().default("/"),
    pageViews: integer("page_views").notNull().default(1),
    firstSeenAt: text("first_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("site_daily_visitors_date_digest_unique").on(table.visitDate, table.visitorDigest),
    index("site_daily_visitors_date_idx").on(table.visitDate),
    index("site_daily_visitors_source_date_idx").on(table.firstSource, table.visitDate),
  ],
);

export const luckyIncomeClaims = sqliteTable(
  "lucky_income_claims",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    eventDate: text("event_date").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("lucky_income_vault_day_unique").on(table.vaultId, table.eventDate),
  ],
);

export const publicStories = sqliteTable(
  "public_stories",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    debtId: text("debt_id").notNull().references(() => debts.id, { onDelete: "cascade" }),
    anonymousName: text("anonymous_name").notNull(),
    countryCode: text("country_code").notNull().default(""),
    debtKind: text("debt_kind").notNull(),
    amountBand: text("amount_band").notNull(),
    currency: text("currency").notNull(),
    repaymentApproach: text("repayment_approach").notNull().default("other"),
    storyText: text("story_text").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("public_stories_status_idx").on(table.status),
    index("public_stories_vault_idx").on(table.vaultId),
  ],
);

export const storyEncouragements = sqliteTable(
  "story_encouragements",
  {
    id: text("id").primaryKey(),
    storyId: text("story_id").notNull().references(() => publicStories.id, { onDelete: "cascade" }),
    vaultId: text("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("story_encouragement_unique").on(table.storyId, table.vaultId),
    index("story_encouragement_story_idx").on(table.storyId),
  ],
);

export const storyReports = sqliteTable(
  "story_reports",
  {
    id: text("id").primaryKey(),
    storyId: text("story_id").notNull().references(() => publicStories.id, { onDelete: "cascade" }),
    reporterVaultId: text("reporter_vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status").notNull().default("open"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    resolvedAt: text("resolved_at"),
  },
  (table) => [
    uniqueIndex("story_report_unique").on(table.storyId, table.reporterVaultId),
    index("story_reports_status_idx").on(table.status),
  ],
);

export const communityRateLimits = sqliteTable(
  "community_rate_limits",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    windowKey: text("window_key").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("community_rate_vault_action_window_unique").on(table.vaultId, table.action, table.windowKey),
    index("community_rate_window_idx").on(table.windowKey),
  ],
);

export const communityModerationActions = sqliteTable(
  "community_moderation_actions",
  {
    id: text("id").primaryKey(),
    storyId: text("story_id").notNull().references(() => publicStories.id, { onDelete: "cascade" }),
    actorDigest: text("actor_digest").notNull(),
    action: text("action").notNull(),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("community_moderation_story_idx").on(table.storyId),
    index("community_moderation_created_idx").on(table.createdAt),
  ],
);

export const policyAcceptances = sqliteTable(
  "policy_acceptances",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    policyKey: text("policy_key").notNull(),
    policyVersion: text("policy_version").notNull(),
    acceptedAt: text("accepted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("policy_acceptance_vault_key_version_unique").on(table.vaultId, table.policyKey, table.policyVersion),
    index("policy_acceptance_vault_idx").on(table.vaultId),
  ],
);

export const aiDailyUsage = sqliteTable(
  "ai_daily_usage",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    usageDate: text("usage_date").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("ai_daily_usage_vault_date_unique").on(table.vaultId, table.usageDate),
    index("ai_daily_usage_date_idx").on(table.usageDate),
  ],
);

export const betaInviteCounters = sqliteTable("beta_invite_counters", {
  inviteDigest: text("invite_digest").primaryKey(),
  uses: integer("uses").notNull().default(0),
  maxUses: integer("max_uses").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const betaEnrollments = sqliteTable(
  "beta_enrollments",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id").notNull().unique().references(() => vaults.id, { onDelete: "cascade" }),
    inviteDigest: text("invite_digest").notNull(),
    consentVersion: text("consent_version").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("beta_enrollments_created_idx").on(table.createdAt)],
);

export const betaFeedback = sqliteTable(
  "beta_feedback",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id").notNull().references(() => vaults.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    rating: integer("rating").notNull(),
    message: text("message").notNull(),
    pagePath: text("page_path").notNull().default("/"),
    status: text("status").notNull().default("open"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    resolvedAt: text("resolved_at"),
  },
  (table) => [
    index("beta_feedback_vault_idx").on(table.vaultId),
    index("beta_feedback_status_idx").on(table.status),
  ],
);

export const betaRuntimeSettings = sqliteTable("beta_runtime_settings", {
  id: text("id").primaryKey(),
  signupsEnabled: integer("signups_enabled", { mode: "boolean" }).notNull(),
  updatedByDigest: text("updated_by_digest"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const worldWeightProfiles = sqliteTable("world_weight_profiles", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().unique(),
  status: text("status").notNull().default("draft"),
  frequencyWeight: real("frequency_weight").notNull(),
  growthWeight: real("growth_weight").notNull(),
  geographyWeight: real("geography_weight").notNull(),
  recurrenceWeight: real("recurrence_weight").notNull(),
  connectionWeight: real("connection_weight").notNull(),
  qualityWeight: real("quality_weight").notNull(),
  proposedBy: text("proposed_by").notNull().default("human"),
  modelRef: text("model_ref"),
  rationale: text("rationale").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  activatedAt: text("activated_at"),
});

export const worldCategoryCandidates = sqliteTable(
  "world_category_candidates",
  {
    id: text("id").primaryKey(),
    canonicalKey: text("canonical_key").notNull().unique(),
    parentKind: text("parent_kind").notNull().default("other"),
    nameZh: text("name_zh").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionZh: text("description_zh").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    status: text("status").notNull().default("candidate"),
    stage: integer("stage").notNull().default(0),
    confidence: real("confidence").notNull().default(0),
    uniqueVaults: integer("unique_vaults").notNull().default(0),
    regionCount: integer("region_count").notNull().default(0),
    mentionCount: integer("mention_count").notNull().default(0),
    emergenceScore: real("emergence_score").notNull().default(0),
    weightProfileId: text("weight_profile_id").references(() => worldWeightProfiles.id),
    mergedIntoId: text("merged_into_id"),
    proposedAt: text("proposed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    reviewedAt: text("reviewed_at"),
    publishedAt: text("published_at"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("world_candidates_status_idx").on(table.status),
    index("world_candidates_score_idx").on(table.emergenceScore),
  ],
);

export const worldSignalAssignments = sqliteTable(
  "world_signal_assignments",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id")
      .notNull()
      .references(() => vaults.id, { onDelete: "cascade" }),
    debtId: text("debt_id")
      .notNull()
      .unique()
      .references(() => debts.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => worldCategoryCandidates.id, { onDelete: "cascade" }),
    confidence: real("confidence").notNull(),
    assignmentSource: text("assignment_source").notNull().default("ai"),
    taxonomyVersion: integer("taxonomy_version").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("world_signals_vault_idx").on(table.vaultId),
    index("world_signals_candidate_idx").on(table.candidateId),
  ],
);

export const worldGrowthEvents = sqliteTable(
  "world_growth_events",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => worldCategoryCandidates.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    fromStage: integer("from_stage"),
    toStage: integer("to_stage"),
    actorType: text("actor_type").notNull().default("system"),
    weightProfileId: text("weight_profile_id").references(() => worldWeightProfiles.id),
    evidenceJson: text("evidence_json").notNull().default("{}"),
    reason: text("reason").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("world_events_candidate_idx").on(table.candidateId)],
);
