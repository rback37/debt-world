import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test, { after } from "node:test";
import { Miniflare } from "miniflare";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const serverDirectory = resolve(testDirectory, "../dist/server");
const miniflare = new Miniflare({
  modules: true,
  scriptPath: resolve(serverDirectory, "index.js"),
  modulesRoot: serverDirectory,
  modulesRules: [{ type: "ESModule", include: ["**/*.js"] }],
  compatibilityDate: "2026-05-22",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: { DB: "debt-world-test" },
  bindings: {
    OWNER_ADMIN_EMAIL: "owner@example.com",
    COMMUNITY_ADMIN_EMAILS: "owner@example.com",
    ACCOUNT_PASSWORD_ITERATIONS: "1000",
    BETA_INVITES_REQUIRED: "true",
    BETA_SIGNUPS_ENABLED: "true",
    BETA_INVITE_CODE: "SHORE-TEST-2026",
    BETA_INVITE_MAX_USES: "2",
  },
  serviceBindings: {
    ASSETS: async () => new Response("Not found", { status: 404 }),
  },
});
const testDb = await miniflare.getD1Database("DB");
const migrationFiles = (await readdir(new URL("../drizzle/", import.meta.url)))
  .filter((file) => file.endsWith(".sql"))
  .sort();
for (const migrationFile of migrationFiles) {
  const migration = await readFile(new URL(`../drizzle/${migrationFile}`, import.meta.url), "utf8");
  for (const statement of migration.split("--> statement-breakpoint").map((part) => part.trim()).filter(Boolean)) {
    await testDb.prepare(statement).run();
  }
}
after(() => miniflare.dispose());

async function render(path = "/") {
  return miniflare.dispatchFetch(`http://localhost${path}`, {
    headers: { accept: "text/html" },
  });
}

async function api(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.method && init.method !== "GET") {
    headers.set("origin", "http://localhost");
  }
  return miniflare.dispatchFetch(`http://localhost${path}`, { ...init, headers });
}

test("server-renders the Chinese debt world", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /正在打开上岸星球/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("server-renders a complete English entry", async () => {
  const response = await render("/en");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Opening Debt World/);
});

test("server-renders bilingual safety centers with data controls", async () => {
  const chinese = await render("/safety");
  assert.equal(chinese.status, 200);
  const chineseHtml = await chinese.text();
  assert.match(chineseHtml, /数据与隐私说明/);
  assert.match(chineseHtml, /怎样导出、撤回和删除/);
  assert.match(chineseHtml, /社区参与限年满 18 岁/);
  const english = await render("/en/safety");
  assert.equal(english.status, 200);
  const englishHtml = await english.text();
  assert.match(englishHtml, /Data and privacy notice/);
  assert.match(englishHtml, /How to export, withdraw, and delete/);
  assert.match(englishHtml, /Community participation is for adults aged 18\+/);
});

test("server-renders bilingual contribution gateways with privacy boundaries", async () => {
  const chinese = await render("/contribute");
  assert.equal(chinese.status, 200);
  const chineseHtml = await chinese.text();
  assert.match(chineseHtml, /你不必会写代码/);
  assert.match(chineseHtml, /这些内容不能进入公开仓库/);
  assert.match(chineseHtml, /AGPL-3\.0/);
  const english = await render("/en/contribute");
  assert.equal(english.status, 200);
  const englishHtml = await english.text();
  assert.match(englishHtml, /You do not need to code/);
  assert.match(englishHtml, /These never belong in the public repository/);
});

test("publishes indexable bilingual product pages and crawler routes", async () => {
  const chineseAbout = await render("/about");
  assert.equal(chineseAbout.status, 200);
  assert.match(await chineseAbout.text(), /不是人均富豪的橱窗/);
  const englishAbout = await render("/en/about");
  assert.equal(englishAbout.status, 200);
  assert.match(await englishAbout.text(), /Not another highlight reel/);
  const robots = await render("/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /sitemap\.xml/i);
  const sitemap = await render("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const sitemapXml = await sitemap.text();
  assert.match(sitemapXml, /\/en\/about/);
  assert.match(sitemapXml, /\/en\/contribute/);
});

test("source includes real-date, multi-debt, voice, country currency, keyboard inspection, and a growing shared world", async () => {
  const source = await readFile(new URL("../app/DebtWorldGame.tsx", import.meta.url), "utf8");
  assert.match(source, /DebtKind/);
  assert.match(source, /nextDueDate/);
  assert.match(source, /confirmPayment/);
  assert.match(source, /debt-world-v3/);
  assert.match(source, /webkitSpeechRecognition/);
  assert.match(source, /speechSynthesis/);
  assert.match(source, /arrowup/);
  assert.match(source, /mobile-controls/);
  assert.match(source, /current\.map/);
  assert.match(source, /\/api\/vault/);
  assert.match(source, /WorldPulse/);
  assert.match(source, /共同大世界正在生长/);
  assert.doesNotMatch(source, /<VaultPanel/);
  assert.match(source, /customLabel/);
  assert.match(source, /discoveryConsent/);
  assert.match(source, /event\.code === "Space"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /player-total-debt/);
  assert.match(source, /player-self-marker/);
  assert.match(source, /lightTier/);
  assert.match(source, /nextLightMilestone/);
  assert.match(source, /npc-light-ground/);
  assert.match(source, /lightFeedbackNpc/);
  assert.match(source, /WorldStory/);
  assert.match(source, /REAL STORY LIGHTHOUSE/);
  assert.match(source, /sendWorldStoryLight/);
  assert.match(source, /displayStoryAmountBand/);
  assert.match(source, /real-world-empty/);
  assert.match(source, /countryGateOpen/);
  assert.match(source, /convertCurrency/);
  assert.match(source, /ability-meters/);
  assert.match(source, /CharacterAvatar/);
  assert.match(source, /character-smile/);
  assert.match(source, /largestDebtShare/);
  assert.match(source, /monthlyCashflow/);
  assert.match(source, /repayment-strategy-panel/);
  assert.match(source, /avalancheTarget/);
  assert.match(source, /snowballTarget/);
  assert.match(source, /cashflowTarget/);
  assert.match(source, /draftMinimumPayment/);
  assert.match(source, /debt-composition/);
  assert.match(source, /每月日常生活开销/);
  assert.match(source, /sharingMode/);
  assert.match(source, /recordSpecialPayment/);
  assert.match(source, /lucky_income/);
  assert.match(source, /askKian/);
  assert.match(source, /\/api\/advisor/);
  assert.match(source, /advisorConsent/);
  assert.match(source, /applyAdvisorDraft/);
  assert.match(source, /本站也不保存 AI 对话原文/);
  assert.match(source, /CommunityPanel/);
  assert.match(source, /FeedbackPanel/);
  assert.match(source, /BetaAdminPanel/);
  assert.match(source, /safety-hud-link/);
  assert.match(source, /world-canvas/);
  assert.match(source, /worldZoom/);
  assert.match(source, /worldRulesOpen/);
  assert.match(source, /golden-dog/);
  assert.match(source, /debtBurdenIcons/);
  assert.match(source, /character-chains/);
  assert.match(source, /totalOriginalUsd\s*>=\s*1_000/);
  assert.match(source, /mbtiOptions/);
  assert.match(source, /repaymentOutlook/);
  assert.match(source, /SharedWalker/);
  assert.match(source, /mobile-planner-sheet/);
  assert.match(source, /真实共享角色/);
  assert.doesNotMatch(source, /value\s*>=\s*1_000_000|toFixed\(/);

  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /\.chat-bubble p[^}]*font-size:\s*14px/s);
  assert.match(styles, /\.npc-portrait[^}]*width:\s*142px/s);
  assert.match(styles, /Readability system/);
  assert.match(styles, /Game-score numbers/);
  assert.match(styles, /self-aura/);
  assert.match(styles, /\.npc-tag[^}]*border-radius:\s*17px/s);
  assert.match(styles, /light-tier-4/);
  assert.match(styles, /light-arrival/);
  assert.match(styles, /real-story-tag/);
  assert.match(styles, /real-light-milestones/);
  const communitySource = await readFile(new URL("../app/CommunityPanel.tsx", import.meta.url), "utf8");
  assert.match(communitySource, /story-light-burst/);
  assert.match(communitySource, /光已送达 \+1/);
  assert.match(communitySource, /每日最多 3 次投稿、30 次送光和 10 次举报/);
  assert.match(communitySource, /SAFETY_POLICY_VERSION/);
  assert.match(communitySource, /delete_story/);
  assert.match(communitySource, /mbtiDebt/);
  const communityRoute = await readFile(new URL("../app/api/community/route.ts", import.meta.url), "utf8");
  assert.match(communityRoute, /MIN_PROFILE_GROUP\s*=\s*5/);
  assert.match(communityRoute, /profileVaults\.size\s*>=\s*MIN_AGGREGATE_SAMPLE/);
  const adminSource = await readFile(new URL("../app/AdminCommunityPanel.tsx", import.meta.url), "utf8");
  assert.match(adminSource, /真实世界安全审核台/);
  assert.match(adminSource, /approve/);
  assert.match(adminSource, /restore/);
  const adminRoute = await readFile(new URL("../app/api/admin/community/route.ts", import.meta.url), "utf8");
  assert.match(adminRoute, /community_moderation_actions/);
  assert.match(adminRoute, /requireCommunityAdmin/);
  const communitySafety = await readFile(new URL("../lib/community-safety.ts", import.meta.url), "utf8");
  assert.match(communitySafety, /publish:\s*3/);
  assert.match(communitySafety, /encourage:\s*30/);
  assert.match(communitySafety, /report:\s*10/);
  assert.match(communitySafety, /cleanModerationNote/);
  const safetyCenter = await readFile(new URL("../app/SafetyCenter.tsx", import.meta.url), "utf8");
  assert.match(safetyCenter, /Private by default/);
  assert.match(safetyCenter, /Official principles used in product design/);
  assert.match(styles, /special-payment-tools/);
  assert.match(styles, /community-panel/);
  assert.match(styles, /admin-community-panel/);
  assert.match(styles, /safety-page/);
  assert.match(styles, /policy-confirm/);
  assert.match(styles, /beta-invite-entry/);
  assert.match(styles, /feedback-panel/);
  assert.match(styles, /beta-admin-panel/);
  assert.match(styles, /account-shell/);
  assert.match(styles, /owner-admin-shell/);

  const accountGate = await readFile(new URL("../app/AccountGate.tsx", import.meta.url), "utf8");
  assert.match(accountGate, /注册新账号/);
  assert.match(accountGate, /没有保险箱、恢复码或手动同步步骤/);
  const accountServer = await readFile(new URL("../lib/account-server.ts", import.meta.url), "utf8");
  assert.match(accountServer, /PBKDF2/);
  assert.match(accountServer, /MAX_PASSWORD_ITERATIONS\s*=\s*100_000/);
  assert.match(accountServer, /HttpOnly/);
  assert.match(accountServer, /account_auth_limits/);
  const ownerDashboard = await readFile(new URL("../app/OwnerAdminDashboard.tsx", import.meta.url), "utf8");
  assert.match(ownerDashboard, /唯一管理员/);
  assert.match(ownerDashboard, /内测反馈/);

  const betaServer = await readFile(new URL("../lib/beta-server.ts", import.meta.url), "utf8");
  assert.match(betaServer, /constantEqual/);
  assert.match(betaServer, /BETA_INVITE_MAX_USES/);
  assert.doesNotMatch(betaServer, /console\.(log|error)/);

  const ratesRoute = await readFile(new URL("../app/api/rates/route.ts", import.meta.url), "utf8");
  assert.match(ratesRoute, /api\.frankfurter\.dev\/v2\/rates/);
  assert.match(ratesRoute, /fallbackUsdRates/);
  const advisorServer = await readFile(new URL("../lib/advisor-server.ts", import.meta.url), "utf8");
  assert.match(advisorServer, /gpt-5\.6-terra/);
  assert.match(advisorServer, /MiniMax-M2\.7/);
  assert.match(advisorServer, /api\.minimaxi\.com\/v1/);
  assert.match(advisorServer, /MINIMAX_API_KEY/);
  assert.match(advisorServer, /process\.env/);
  assert.match(advisorServer, /store:\s*false/);
  assert.match(advisorServer, /safety_identifier/);
  assert.match(advisorServer, /ADVISOR_DAILY_REQUEST_LIMIT\s*=\s*20/);
  assert.match(advisorServer, /ai_daily_usage/);
  assert.match(advisorServer, /minimum_payment/);
  assert.match(advisorServer, /highest APR first/);
  assert.doesNotMatch(advisorServer, /console\.(log|error)/);
});

test("an account automatically enters, persists, exports, and deletes a debt journey", async () => {
  await testDb.prepare("DROP TABLE account_auth_limits").run();
  await testDb.prepare("DROP TABLE account_sessions").run();
  await testDb.prepare("DROP TABLE account_vaults").run();
  await testDb.prepare("ALTER TABLE accounts DROP COLUMN signup_source").run();
  await testDb.prepare("DROP TABLE payment_records").run();
  await testDb.prepare("DROP TABLE policy_acceptances").run();
  await testDb.prepare("DROP TABLE beta_enrollments").run();
  await testDb.prepare("DROP TABLE beta_feedback").run();
  await testDb.prepare("ALTER TABLE vaults DROP COLUMN age_band").run();
  await testDb.prepare("ALTER TABLE debts DROP COLUMN apr").run();
  const betaState = await api("/api/beta");
  assert.equal(betaState.status, 200);
  assert.deepEqual(await betaState.json(), { signupsEnabled: true, accountSignupsEnabled: true, inviteRequired: true, ready: true });

  const weakAccount = await api("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "register", username: "walker-one", password: "short" }),
  });
  assert.equal(weakAccount.status, 400);

  const accountCreate = await api("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "register", username: "walker-one", password: "safe-password-2026", signupSource: "github" }),
  });
  assert.equal(accountCreate.status, 201);
  const accountCreated = await accountCreate.json();
  assert.equal(accountCreated.authenticated, true);
  assert.match(accountCreated.account.userCode, /^SHORE-/);
  assert.equal(accountCreated.account.vaultLinked, true);
  const accountColumns = await testDb.prepare("PRAGMA table_info(accounts)").all();
  assert.equal(accountColumns.results.some((column) => column.name === "signup_source"), true);
  const cookie = accountCreate.headers.get("set-cookie")?.split(";")[0];
  assert.match(cookie ?? "", /^dw_account=/);

  const duplicateAccount = await api("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "register", username: "WALKER-ONE", password: "safe-password-2027" }),
  });
  assert.equal(duplicateAccount.status, 409);

  const automaticWorld = await api("/api/vault", { headers: { cookie } });
  assert.equal(automaticWorld.status, 200);
  assert.equal((await automaticWorld.json()).vault.debts.length, 0);

  const profileUpdate = await api("/api/vault", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      locale: "zh",
      profile: {
        alias: "测试行者", region: "亚洲", pressure: "现金流压力", countryCode: "CN", countryName: "", displayCurrency: "CNY", monthlyIncome: 30_000, monthlyExpenses: 9_000,
        ageBand: "25-34", gender: "prefer_not_say", mbti: "INFP", zodiac: "virgo", selfDescription: "房贷和生活开销叠在一起。", repaymentPlan: "保留生活缓冲后按月还款。", repaymentOutlook: "trying", incomePlan: "尝试增加自由职业收入。",
      },
      position: { x: 48, y: 62 },
      discoveryConsent: true,
    }),
  });
  assert.equal(profileUpdate.status, 200);

  const accountAfterVault = await api("/api/account", { headers: { cookie } });
  assert.equal(accountAfterVault.status, 200);
  assert.equal((await accountAfterVault.json()).account.vaultLinked, true);

  const advisorWithoutVault = await api("/api/advisor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "帮我拆解债务", locale: "zh" }),
  });
  assert.equal(advisorWithoutVault.status, 401);

  const advisorReadiness = await api("/api/advisor");
  assert.equal(advisorReadiness.status, 200);
  assert.deepEqual(await advisorReadiness.json(), {
    configured: false,
    provider: null,
    model: null,
  });

  const advisorWithoutServerKey = await api("/api/advisor", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ message: "帮我拆解债务", locale: "zh" }),
  });
  assert.equal(advisorWithoutServerKey.status, 503);

  const anonymousRead = await api("/api/vault");
  assert.equal(anonymousRead.status, 401);

  const debtCreate = await api("/api/debts", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      id: "demo-card",
      kind: "other",
      customLabel: "欠朋友的钱",
      currency: "CNY",
      original: 4_000_000,
      balance: 4_000_000,
      monthly: 13_000,
      apr: 3.85,
      minimumPayment: 13_000,
      paymentStatus: "current",
      remainingMonths: 312,
      dueDay: 15,
      method: "银行卡自动扣款",
    }),
  });
  assert.equal(debtCreate.status, 201);
  const debt = (await debtCreate.json()).debt;
  assert.notEqual(debt.id, "demo-card");
  assert.equal(debt.sharingMode, "private");

  const sharingUpdate = await api("/api/debts", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ id: debt.id, sharingMode: "range" }),
  });
  assert.equal(sharingUpdate.status, 200);

  const paymentCreate = await api("/api/payments", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      debtId: debt.id,
      cashPayment: 13_000,
      newBalance: 3_998_500,
      scheduledDate: "2026-07-15",
    }),
  });
  assert.equal(paymentCreate.status, 201);

  const prepayment = await api("/api/payments", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ debtId: debt.id, cashPayment: 2_000, newBalance: 3_997_200, source: "prepayment", timezoneOffset: -480 }),
  });
  assert.equal(prepayment.status, 201);
  assert.equal((await prepayment.json()).payment.source, "prepayment");

  const luckyIncome = await api("/api/payments", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ debtId: debt.id, cashPayment: 500, newBalance: 3_996_800, source: "lucky_income", incomeType: "freelance", timezoneOffset: -480 }),
  });
  assert.equal(luckyIncome.status, 201);
  assert.equal((await luckyIncome.json()).payment.incomeType, "freelance");

  const duplicateLuckyIncome = await api("/api/payments", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ debtId: debt.id, cashPayment: 100, newBalance: 3_996_700, source: "lucky_income", incomeType: "refund", timezoneOffset: -480 }),
  });
  assert.equal(duplicateLuckyIncome.status, 409);

  const missingPolicyStory = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ action: "publish", debtId: debt.id, repaymentApproach: "extra_income", storyText: "我正在用额外收入慢慢还款，联系电话 13800138000，原来欠款 4000000。" }),
  });
  assert.equal(missingPolicyStory.status, 428);

  const storyCreate = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ action: "publish", debtId: debt.id, repaymentApproach: "extra_income", storyText: "我正在用额外收入慢慢还款，联系电话 13800138000，原来欠款 4000000。", rulesAccepted: true, ageConfirmed: true }),
  });
  assert.equal(storyCreate.status, 201);
  assert.equal((await storyCreate.json()).redacted, true);

  const ownerCommunity = await api("/api/community", { headers: { cookie } });
  assert.equal(ownerCommunity.status, 200);
  const ownerCommunityBody = await ownerCommunity.json();
  assert.equal(ownerCommunityBody.stories.length, 0);
  assert.equal(ownerCommunityBody.mine.length, 1);
  assert.match(ownerCommunityBody.mine[0].storyText, /private detail hidden/);
  assert.doesNotMatch(ownerCommunityBody.mine[0].amountBand, /3,996,800/);
  assert.equal(ownerCommunityBody.insights.ready, false);
  assert.equal(ownerCommunityBody.policy.accepted, true);
  assert.equal(ownerCommunityBody.worldPulse.population, 1);
  assert.equal(ownerCommunityBody.worldPulse.recordedDebts, 1);
  assert.equal(ownerCommunityBody.worldPulse.confirmedPayments, 3);
  assert.equal(ownerCommunityBody.worldPulse.countries, 1);
  assert.equal(ownerCommunityBody.sharedWalkers.length, 1);
  assert.equal(ownerCommunityBody.sharedWalkers[0].isMine, true);
  assert.equal(ownerCommunityBody.sharedWalkers[0].debtCountBand, "single");
  assert.equal(ownerCommunityBody.sharedWalkers[0].primaryDebtKind, "other");
  assert.ok(!("balance" in ownerCommunityBody.sharedWalkers[0]));
  assert.ok(!("original" in ownerCommunityBody.sharedWalkers[0]));
  assert.ok(!("customLabel" in ownerCommunityBody.sharedWalkers[0]));

  const anonymousCommunity = await api("/api/community");
  assert.equal(anonymousCommunity.status, 200);
  const anonymousCommunityBody = await anonymousCommunity.json();
  assert.equal(anonymousCommunityBody.mine.length, 0);
  assert.equal(anonymousCommunityBody.sharedWalkers.length, 1);
  assert.equal(anonymousCommunityBody.sharedWalkers[0].isMine, false);
  assert.ok(!("debtCount" in anonymousCommunityBody.sharedWalkers[0]));

  const unauthorizedAdmin = await api("/api/admin/community?summary=1");
  assert.equal(unauthorizedAdmin.status, 404);
  const adminHeaders = { "oai-authenticated-user-email": "owner@example.com" };
  const ownerHeaders = { ...adminHeaders, cookie };
  const ownerWithoutSiteAccount = await api("/api/admin/session", { headers: adminHeaders });
  assert.equal(ownerWithoutSiteAccount.status, 401);
  const siteAccountWithoutOwner = await api("/api/admin/session", { headers: { cookie } });
  assert.equal(siteAccountWithoutOwner.status, 404);
  const ownerSessionBefore = await api("/api/admin/session", { headers: ownerHeaders });
  assert.equal(ownerSessionBefore.status, 200);
  assert.equal((await ownerSessionBefore.json()).registered, false);
  const betaBeforeActivation = await api("/api/admin/beta", { headers: ownerHeaders });
  assert.equal(betaBeforeActivation.status, 404);
  const wrongOwnerActivation = await api("/api/admin/session", {
    method: "POST",
    headers: { "content-type": "application/json", "oai-authenticated-user-email": "other@example.com", cookie },
    body: JSON.stringify({ action: "register" }),
  });
  assert.equal(wrongOwnerActivation.status, 404);
  const ownerActivation = await api("/api/admin/session", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ action: "register" }),
  });
  assert.equal(ownerActivation.status, 201);
  const ownerActivationBody = await ownerActivation.json();
  assert.equal(ownerActivationBody.registered, true);
  assert.equal(ownerActivationBody.accountUsername, "walker-one");
  assert.equal(ownerActivationBody.accountCode, accountCreated.account.userCode);
  const firstTraffic = await api("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ locale: "zh", path: "/", source: "github" }),
  });
  assert.equal(firstTraffic.status, 200);
  const visitorCookie = firstTraffic.headers.get("set-cookie")?.split(";")[0];
  assert.match(visitorCookie ?? "", /^dw_visitor=/);
  const repeatedTraffic = await api("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: visitorCookie },
    body: JSON.stringify({ locale: "zh", path: "/", source: "github" }),
  });
  assert.equal(repeatedTraffic.status, 200);
  const betaAdmin = await api("/api/admin/beta", { headers: ownerHeaders });
  assert.equal(betaAdmin.status, 200);
  const betaAdminBody = await betaAdmin.json();
  assert.equal(betaAdminBody.counts.enrolled, 0);
  assert.equal(betaAdminBody.counts.accounts, 1);
  assert.equal(betaAdminBody.testers[0].username, "walker-one");
  assert.equal(betaAdminBody.testers[0].signupSource, "github");
  assert.equal(betaAdminBody.testers[0].debtCount, 1);
  assert.equal(betaAdminBody.counts.visitorsToday, 1);
  assert.equal(betaAdminBody.counts.pageViewsToday, 2);
  assert.equal(betaAdminBody.trafficDaily.at(-1).uniqueVisitors, 1);
  assert.deepEqual(betaAdminBody.sources, [{ source: "github", accounts: 1, linked: 1, withDebt: 1, withFeedback: 0 }]);
  assert.doesNotMatch(JSON.stringify(betaAdminBody), /测试行者|3996800|safe-password|recovery/i);

  const feedbackCreate = await api("/api/beta/feedback", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ category: "confusing", rating: 3, message: "最低还款和计划月还的区别需要更明显。", pagePath: "/?private=1" }),
  });
  assert.equal(feedbackCreate.status, 201);
  const feedbackId = (await feedbackCreate.json()).id;

  const feedbackAdmin = await api("/api/admin/beta", { headers: ownerHeaders });
  const feedbackAdminBody = await feedbackAdmin.json();
  assert.equal(feedbackAdminBody.feedback[0].testerCode, accountCreated.account.userCode);
  assert.equal(feedbackAdminBody.feedback[0].username, "walker-one");
  assert.equal(feedbackAdminBody.sources[0].withFeedback, 1);

  const referralState = await api("/api/referral", { headers: { cookie } });
  assert.equal(referralState.status, 200);
  const referralCode = (await referralState.json()).referral.code;
  assert.match(referralCode, /^SHORE-/);
  const secondAccount = await api("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "register", username: "walker-two", password: "another-safe-2026", signupSource: "referral", referralCode }),
  });
  assert.equal(secondAccount.status, 201);
  const secondAccountBody = await secondAccount.clone().json();
  const secondCookie = secondAccount.headers.get("set-cookie")?.split(";")[0];
  assert.match(secondCookie ?? "", /^dw_account=/);
  const secondAccountOwnerAttempt = await api("/api/admin/session", {
    headers: { ...adminHeaders, cookie: secondCookie },
  });
  assert.equal(secondAccountOwnerAttempt.status, 404);

  const pauseSignups = await api("/api/admin/beta", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ action: "set_signups", enabled: false }),
  });
  assert.equal(pauseSignups.status, 200);
  assert.equal((await pauseSignups.json()).config.signupsEnabled, false);
  const pausedAttempt = await api("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "register", username: "paused-walker", password: "paused-safe-password-2026" }),
  });
  assert.equal(pausedAttempt.status, 503);
  const resumeSignups = await api("/api/admin/beta", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ action: "set_signups", enabled: true }),
  });
  assert.equal(resumeSignups.status, 200);

  const resolveFeedback = await api("/api/admin/beta", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ action: "resolve_feedback", feedbackId }),
  });
  assert.equal(resolveFeedback.status, 200);
  assert.equal((await resolveFeedback.json()).counts.openFeedback, 0);
  const reopenFeedback = await api("/api/admin/beta", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ action: "reopen_feedback", feedbackId }),
  });
  assert.equal(reopenFeedback.status, 200);
  assert.equal((await reopenFeedback.json()).counts.openFeedback, 1);
  const resolveFeedbackAgain = await api("/api/admin/beta", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ action: "resolve_feedback", feedbackId }),
  });
  assert.equal(resolveFeedbackAgain.status, 200);

  const moderationQueue = await api("/api/admin/community", { headers: ownerHeaders });
  assert.equal(moderationQueue.status, 200);
  const moderationQueueBody = await moderationQueue.json();
  assert.equal(moderationQueueBody.counts.pending, 1);
  assert.equal(moderationQueueBody.stories[0].storyText, ownerCommunityBody.mine[0].storyText);

  const publishedStoryId = ownerCommunityBody.mine[0].id;
  const approval = await api("/api/admin/community", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ storyId: publishedStoryId, action: "approve" }),
  });
  assert.equal(approval.status, 200);
  assert.equal((await approval.json()).status, "published");

  const secondVault = await api("/api/vault", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: secondCookie },
    body: JSON.stringify({ locale: "en", profile: { alias: "Second walker", region: "Private", countryCode: "US", displayCurrency: "USD" } }),
  });
  assert.equal(secondVault.status, 200);
  const invitedDebt = await api("/api/debts", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: secondCookie },
    body: JSON.stringify({ kind: "card", currency: "USD", original: 1200, balance: 1200, monthly: 100, apr: 18, minimumPayment: 50, paymentStatus: "current", remainingMonths: 14, dueDay: 5, method: "autopay" }),
  });
  assert.equal(invitedDebt.status, 201);
  assert.equal((await invitedDebt.json()).referralActivated, true);
  const rewardedReferralState = await api("/api/referral", { headers: { cookie } });
  const rewardedReferral = (await rewardedReferralState.json()).referral;
  assert.equal(rewardedReferral.invited, 1);
  assert.equal(rewardedReferral.activated, 1);
  const referralAdmin = await api("/api/admin/beta", { headers: ownerHeaders });
  const referralAdminBody = await referralAdmin.json();
  assert.equal(referralAdminBody.counts.referralInvites, 1);
  assert.equal(referralAdminBody.counts.referralActivated, 1);
  assert.equal(referralAdminBody.counts.referralPending, 0);
  const thirdAccount = await api("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "register", username: "walker-three", password: "third-safe-password-2026" }),
  });
  assert.equal(thirdAccount.status, 201);
  const thirdCookie = thirdAccount.headers.get("set-cookie")?.split(";")[0];
  const thirdWorld = await api("/api/vault", { headers: { cookie: thirdCookie } });
  assert.equal(thirdWorld.status, 200);

  const secondCommunity = await api("/api/community", { headers: { cookie: secondCookie } });
  assert.equal(secondCommunity.status, 200);
  const secondCommunityBody = await secondCommunity.json();
  assert.equal(secondCommunityBody.stories.length, 1);
  assert.equal(secondCommunityBody.stories[0].id, publishedStoryId);
  assert.equal(secondCommunityBody.stories[0].encouraged, false);
  assert.equal(secondCommunityBody.stories[0].encouragementCount, 0);
  assert.doesNotMatch(secondCommunityBody.stories[0].amountBand, /3,996,800/);

  const encouragement = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: secondCookie },
    body: JSON.stringify({ action: "encourage", storyId: publishedStoryId }),
  });
  assert.equal(encouragement.status, 200);
  assert.deepEqual(await encouragement.json(), { encouraged: true, count: 1 });

  const secondVaultRow = await testDb.prepare(
    "SELECT id FROM vaults WHERE alias = 'Second walker' LIMIT 1",
  ).first();
  assert.ok(secondVaultRow?.id);
  await testDb.prepare(
    "UPDATE community_rate_limits SET count = 30 WHERE vault_id = ?1 AND action = 'encourage'",
  ).bind(secondVaultRow.id).run();
  await testDb.prepare(
    "DELETE FROM story_encouragements WHERE story_id = ?1 AND vault_id = ?2",
  ).bind(publishedStoryId, secondVaultRow.id).run();
  const limitedEncouragement = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: secondCookie },
    body: JSON.stringify({ action: "encourage", storyId: publishedStoryId }),
  });
  assert.equal(limitedEncouragement.status, 429);
  await testDb.prepare(
    "UPDATE community_rate_limits SET count = 29 WHERE vault_id = ?1 AND action = 'encourage'",
  ).bind(secondVaultRow.id).run();
  const finalAllowedEncouragement = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: secondCookie },
    body: JSON.stringify({ action: "encourage", storyId: publishedStoryId }),
  });
  assert.equal(finalAllowedEncouragement.status, 200);
  assert.deepEqual(await finalAllowedEncouragement.json(), { encouraged: true, count: 1 });

  const duplicateEncouragement = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: secondCookie },
    body: JSON.stringify({ action: "encourage", storyId: publishedStoryId }),
  });
  assert.equal(duplicateEncouragement.status, 200);
  assert.deepEqual(await duplicateEncouragement.json(), { encouraged: true, count: 1 });

  const encouragedCommunity = await api("/api/community", { headers: { cookie: secondCookie } });
  const encouragedCommunityBody = await encouragedCommunity.json();
  assert.equal(encouragedCommunityBody.stories[0].encouraged, true);
  assert.equal(encouragedCommunityBody.stories[0].encouragementCount, 1);

  const windowKey = new Date().toISOString().slice(0, 10);
  await testDb.prepare(
    `INSERT INTO community_rate_limits (id, vault_id, action, window_key, count)
     VALUES ('report-limit-test', ?1, 'report', ?2, 10)`,
  ).bind(secondVaultRow.id, windowKey).run();
  const limitedReport = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: secondCookie },
    body: JSON.stringify({ action: "report", storyId: publishedStoryId, reason: "identity_exposure", details: "Possible identity clue" }),
  });
  assert.equal(limitedReport.status, 429);
  await testDb.prepare(
    "UPDATE community_rate_limits SET count = 9 WHERE id = 'report-limit-test'",
  ).run();
  const highRiskReport = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: secondCookie },
    body: JSON.stringify({ action: "report", storyId: publishedStoryId, reason: "identity_exposure", details: "Possible identity clue" }),
  });
  assert.equal(highRiskReport.status, 200);
  const hiddenFromWorld = await api("/api/community");
  assert.equal((await hiddenFromWorld.json()).stories.length, 0);

  const reportedQueue = await api("/api/admin/community", { headers: ownerHeaders });
  const reportedQueueBody = await reportedQueue.json();
  assert.equal(reportedQueueBody.counts.review, 1);
  assert.equal(reportedQueueBody.counts.openReports, 1);
  const missingHideReason = await api("/api/admin/community", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ storyId: publishedStoryId, action: "hide" }),
  });
  assert.equal(missingHideReason.status, 400);
  const hideStory = await api("/api/admin/community", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ storyId: publishedStoryId, action: "hide", note: "Identity risk confirmed 4000000 owner@example.com" }),
  });
  assert.equal(hideStory.status, 200);
  assert.equal((await hideStory.json()).status, "hidden");
  const restoreStory = await api("/api/admin/community", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ storyId: publishedStoryId, action: "restore", note: "Safe after review" }),
  });
  assert.equal(restoreStory.status, 200);
  const resolvedQueue = await api("/api/admin/community", { headers: ownerHeaders });
  const resolvedQueueBody = await resolvedQueue.json();
  assert.equal(resolvedQueueBody.counts.openReports, 0);
  assert.equal(resolvedQueueBody.actions.length, 3);
  assert.doesNotMatch(JSON.stringify(resolvedQueueBody.actions), /4000000|owner@example\.com/);

  const ownEncouragement = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ action: "encourage", storyId: publishedStoryId }),
  });
  assert.equal(ownEncouragement.status, 400);

  const deleteOwnStory = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ action: "delete_story", storyId: publishedStoryId }),
  });
  assert.equal(deleteOwnStory.status, 200);
  assert.equal((await deleteOwnStory.json()).deleted, true);
  const afterStoryDeletion = await api("/api/community", { headers: { cookie } });
  const afterStoryDeletionBody = await afterStoryDeletion.json();
  assert.equal(afterStoryDeletionBody.stories.length, 0);
  assert.equal(afterStoryDeletionBody.mine.length, 0);

  const foreignPayment = await api("/api/payments", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: secondCookie },
    body: JSON.stringify({ debtId: debt.id, cashPayment: 1, newBalance: 1, source: "prepayment" }),
  });
  assert.equal(foreignPayment.status, 404);
  const foreignStory = await api("/api/community", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: secondCookie },
    body: JSON.stringify({ action: "publish", debtId: debt.id, repaymentApproach: "other", storyText: "This is long enough but must not access another vault debt." }),
  });
  assert.equal(foreignStory.status, 404);
  const suspendSecondAccount = await api("/api/admin/beta", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ action: "set_account_status", testerCode: secondAccountBody.account.userCode, accountStatus: "suspended" }),
  });
  assert.equal(suspendSecondAccount.status, 200);
  assert.equal((await suspendSecondAccount.json()).counts.suspendedAccounts, 1);
  const suspendedSession = await api("/api/account", { headers: { cookie: secondCookie } });
  assert.equal((await suspendedSession.json()).authenticated, false);
  const reactivateSecondAccount = await api("/api/admin/beta", {
    method: "POST",
    headers: { "content-type": "application/json", ...ownerHeaders },
    body: JSON.stringify({ action: "set_account_status", testerCode: secondAccountBody.account.userCode, accountStatus: "active" }),
  });
  assert.equal(reactivateSecondAccount.status, 200);
  const reactivatedLogin = await api("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "login", username: "walker-two", password: "another-safe-2026" }),
  });
  assert.equal(reactivatedLogin.status, 200);

  const exportResponse = await api("/api/vault?download=1", {
    headers: { cookie },
  });
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get("content-disposition") ?? "", /attachment/);
  const exported = await exportResponse.json();
  assert.equal(exported.profile.alias, "测试行者");
  assert.equal(exported.profile.countryCode, "CN");
  assert.equal(exported.profile.displayCurrency, "CNY");
  assert.equal(exported.profile.monthlyIncome, 30_000);
  assert.equal(exported.profile.monthlyExpenses, 9_000);
  assert.equal(exported.profile.ageBand, "25-34");
  assert.equal(exported.profile.gender, "prefer_not_say");
  assert.equal(exported.profile.mbti, "INFP");
  assert.equal(exported.profile.zodiac, "virgo");
  assert.equal(exported.profile.selfDescription, "房贷和生活开销叠在一起。");
  assert.equal(exported.profile.repaymentPlan, "保留生活缓冲后按月还款。");
  assert.equal(exported.profile.repaymentOutlook, "trying");
  assert.equal(exported.profile.incomePlan, "尝试增加自由职业收入。");
  assert.equal(exported.discoveryConsent, true);
  assert.equal(exported.debts.length, 1);
  assert.equal(exported.debts[0].customLabel, "欠朋友的钱");
  assert.equal(exported.debts[0].sharingMode, "range");
  assert.equal(exported.debts[0].apr, 3.85);
  assert.equal(exported.debts[0].minimumPayment, 13_000);
  assert.equal(exported.debts[0].paymentStatus, "current");
  assert.equal(exported.debts[0].remainingMonths, 312);
  assert.equal(exported.debts[0].balance, 3_996_800);
  assert.equal(exported.debts[0].history.length, 3);
  assert.equal(exported.debts[0].history[1].source, "prepayment");
  assert.equal(exported.debts[0].history[2].source, "lucky_income");
  assert.equal(exported.betaEnrollment, null);
  assert.equal(exported.betaFeedback.length, 1);
  assert.equal(exported.betaFeedback[0].category, "confusing");
  assert.equal(exported.betaFeedback[0].status, "resolved");
  assert.equal(exported.betaFeedback[0].pagePath, "/");
  assert.equal(exported.policyAcceptances.length, 2);
  assert.deepEqual(new Set(exported.policyAcceptances.map((item) => item.policyKey)), new Set(["community-rules-and-privacy", "community-age-18"]));

  const deletion = await api("/api/vault", {
    method: "DELETE",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ confirm: "DELETE" }),
  });
  assert.equal(deletion.status, 200);
  const remainingAcceptances = await testDb.prepare("SELECT COUNT(*) AS count FROM policy_acceptances").first();
  assert.equal(Number(remainingAcceptances?.count ?? -1), 0);

  const deletedRead = await api("/api/vault", { headers: { cookie } });
  assert.equal(deletedRead.status, 401);
});
