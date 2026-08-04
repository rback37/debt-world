"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { countryFlag } from "@/lib/country-currency";
import type { CloudState, Debt, DebtKind, Locale } from "@/lib/debt-world-types";
import { SAFETY_POLICY_VERSION } from "@/lib/safety-policy";

type CommunityStory = {
  id: string;
  anonymousName: string;
  countryCode: string;
  debtKind: DebtKind;
  amountBand: string;
  currency: string;
  repaymentApproach: string;
  storyText: string;
  status: "pending" | "published" | "review" | "hidden" | "rejected";
  createdAt: string;
  encouragementCount: number;
  encouraged: boolean;
};

type Insights = {
  ready: boolean;
  sampleSize: number;
  minSample: number;
  debtKinds: Array<{ key: string; count: number }>;
  repaymentApproaches: Array<{ key: string; count: number }>;
  profileReady: boolean;
  profileSampleSize: number;
  profileMinSample: number;
  mbtiDebt: Array<{ key: string; count: number; averageUsd: number }>;
};

const kindNames: Record<DebtKind, Record<Locale, string>> = {
  mortgage: { zh: "房贷", en: "Mortgage" }, card: { zh: "信用卡", en: "Credit card" },
  education: { zh: "学贷", en: "Student loan" }, medical: { zh: "医疗债务", en: "Medical debt" },
  car: { zh: "车贷", en: "Vehicle loan" }, personal: { zh: "个人借款", en: "Personal loan" },
  business: { zh: "经营债务", en: "Business debt" }, bnpl: { zh: "消费分期", en: "BNPL" },
  informal: { zh: "亲友借款", en: "Family & friends" }, other: { zh: "其他负债", en: "Other debt" },
};

const approachNames: Record<string, Record<Locale, string>> = {
  autopay: { zh: "自动扣款并定期加额", en: "Autopay with planned extras" },
  extra_income: { zh: "把额外收入用于还款", en: "Apply extra income" },
  negotiate: { zh: "与债权方协商方案", en: "Negotiate with creditor" },
  refinance: { zh: "重组或再融资", en: "Restructure or refinance" },
  snowball: { zh: "雪球法：先清最小余额", en: "Snowball: smallest balance first" },
  avalanche: { zh: "雪崩法：先处理高利率", en: "Avalanche: highest rate first" },
  family_plan: { zh: "家庭共同预算与分工", en: "Shared household plan" },
  other: { zh: "其他真实做法", en: "Another real approach" },
};

const reportReasons = {
  scam: { zh: "诈骗或收费引流", en: "Scam or paid solicitation" },
  harassment: { zh: "骚扰或攻击", en: "Harassment or attack" },
  bad_advice: { zh: "危险或错误建议", en: "Dangerous or incorrect advice" },
  identity_exposure: { zh: "暴露真实身份", en: "Identity exposure" },
  self_harm: { zh: "自伤风险", en: "Self-harm risk" },
  debt_collection: { zh: "催收或借贷引流", en: "Debt collection or lending solicitation" },
};

const emptyInsights: Insights = { ready: false, sampleSize: 0, minSample: 30, debtKinds: [], repaymentApproaches: [], profileReady: false, profileSampleSize: 0, profileMinSample: 30, mbtiDebt: [] };

function debtName(debt: Debt, locale: Locale) {
  return debt.kind === "other" && debt.customLabel?.trim() ? debt.customLabel.trim() : kindNames[debt.kind][locale];
}

export default function CommunityPanel({
  open, locale, debts, cloudState, onClose, onOpenVault, onSelectDebt,
}: {
  open: boolean;
  locale: Locale;
  debts: Debt[];
  cloudState: CloudState;
  onClose: () => void;
  onOpenVault: () => void;
  onSelectDebt: (id: string) => void;
}) {
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [mine, setMine] = useState<CommunityStory[]>([]);
  const [insights, setInsights] = useState<Insights>(emptyInsights);
  const [tab, setTab] = useState<"world" | "mine" | "insights">("world");
  const [loading, setLoading] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [debtId, setDebtId] = useState("");
  const [repaymentApproach, setRepaymentApproach] = useState("extra_income");
  const [message, setMessage] = useState("");
  const [lightFeedbackId, setLightFeedbackId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<keyof typeof reportReasons>("scam");
  const [reportDetails, setReportDetails] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);

  const shareableDebts = useMemo(() => debts.filter((debt) => debt.sharingMode === "range"), [debts]);
  const mineIds = useMemo(() => new Set(mine.map((story) => story.id)), [mine]);

  const loadStories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/community", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json() as { stories?: CommunityStory[]; mine?: CommunityStory[]; insights?: Insights; policy?: { accepted?: boolean } };
      if (!response.ok) throw new Error("load");
      setStories(data.stories ?? []);
      setMine(data.mine ?? []);
      setInsights(data.insights ?? emptyInsights);
      setPolicyAccepted(Boolean(data.policy?.accepted));
    } catch {
      setMessage(locale === "zh" ? "社区暂时无法加载，请稍后再试。" : "The community could not load. Try again later.");
    } finally { setLoading(false); }
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => { void loadStories(); }, 0);
    return () => window.clearTimeout(timer);
  }, [open, loadStories]);

  const selectedDebtId = debtId || shareableDebts[0]?.id || "";

  if (!open) return null;

  const publishStory = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDebtId || storyText.trim().length < 20) return;
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/community", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", debtId: selectedDebtId, storyText, repaymentApproach, rulesAccepted: policyAccepted || rulesAccepted, ageConfirmed: policyAccepted || ageConfirmed }),
      });
      const data = await response.json() as { redacted?: boolean; error?: string };
      if (response.status === 429) throw new Error(locale === "zh" ? "今天的匿名投稿次数已达到安全上限，请明天再试。" : "Today's anonymous submission safety limit has been reached. Try again tomorrow.");
      if (response.status === 428) throw new Error(locale === "zh" ? "请先确认当前社区规则、隐私说明与 18 岁限制。" : "Confirm the current community rules, privacy notice, and 18+ requirement first.");
      if (!response.ok) throw new Error(data.error ?? "publish");
      setStoryText("");
      setPolicyAccepted(true); setRulesAccepted(false); setAgeConfirmed(false);
      setMessage(data.redacted
        ? (locale === "zh" ? "敏感信息已隐藏，故事已送入审核队列。" : "Sensitive details were hidden before entering review.")
        : (locale === "zh" ? "故事已进入审核队列，通过前不会公开。" : "Your story entered review and will not appear before approval."));
      setTab("mine");
      await loadStories();
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "publish" ? error.message : (locale === "zh" ? "提交失败，请检查内容后重试。" : "Submission failed. Check the story and try again."));
    } finally { setLoading(false); }
  };

  const encourage = async (storyId: string) => {
    if (cloudState !== "synced") { setMessage(locale === "zh" ? "大世界连接尚未完成，请刷新后再送出鼓励。" : "The shared-world connection is not ready. Refresh before encouraging."); return; }
    const response = await fetch("/api/community", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "encourage", storyId }) });
    const data = await response.json() as { count?: number; error?: string };
    if (!response.ok) { setMessage(response.status === 429 ? (locale === "zh" ? "今天送出的光已达到安全上限，请明天继续。" : "Today's light-giving safety limit has been reached.") : (data.error ?? (locale === "zh" ? "这道光暂时没有送达。" : "The light did not arrive."))); return; }
    setStories((current) => current.map((story) => story.id === storyId ? { ...story, encouraged: true, encouragementCount: data.count ?? story.encouragementCount } : story));
    setLightFeedbackId(storyId);
    window.setTimeout(() => setLightFeedbackId((current) => current === storyId ? null : current), 1300);
  };

  const reportStory = async (event: FormEvent) => {
    event.preventDefault();
    if (!reportingId) return;
    const response = await fetch("/api/community", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "report", storyId: reportingId, reason: reportReason, details: reportDetails }) });
    const data = await response.json() as { error?: string };
    if (response.ok) {
      setStories((current) => current.filter((story) => story.id !== reportingId));
      setMessage(locale === "zh" ? "举报已进入审核队列；高风险内容已先行隐藏。" : "The report entered review; high-risk content was hidden immediately.");
      setReportingId(null); setReportDetails("");
    } else setMessage(response.status === 429 ? (locale === "zh" ? "今天的举报次数已达到安全上限；紧急风险请使用当地紧急援助渠道。" : "Today's report safety limit has been reached; use local emergency support for urgent risk.") : (data.error ?? (locale === "zh" ? "举报暂时没有提交成功。" : "The report could not be submitted.")));
  };

  const deleteMyStory = async (storyId: string) => {
    if (deletingStoryId !== storyId) { setDeletingStoryId(storyId); return; }
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/community", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_story", storyId }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "delete");
      setDeletingStoryId(null);
      setMessage(locale === "zh" ? "这篇投稿已永久删除，如果它曾在地图上，也会立即移除。" : "The submission was permanently deleted and removed from the world if it was visible.");
      await loadStories();
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "delete" ? error.message : (locale === "zh" ? "这篇投稿暂时无法删除。" : "The submission could not be deleted."));
    } finally { setLoading(false); }
  };

  const statusLabel = (status: CommunityStory["status"]) => locale === "zh"
    ? status === "pending" ? "等待审核" : status === "published" ? "已公开" : status === "review" ? "重新审核中" : status === "rejected" ? "未通过审核" : "已隐藏"
    : status === "pending" ? "Awaiting review" : status === "published" ? "Published" : status === "review" ? "Under review" : status === "rejected" ? "Not approved" : "Hidden";

  const topCount = Math.max(1, ...insights.debtKinds.map((item) => item.count), ...insights.repaymentApproaches.map((item) => item.count));
  const topMbtiAverage = Math.max(1, ...insights.mbtiDebt.map((item) => item.averageUsd));

  return (
    <div className="modal-shade community-shade" onMouseDown={onClose}>
      <section className="community-panel" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <header className="community-head"><span>✦</span><div><p>{locale === "zh" ? "安全社区私测" : "SAFE COMMUNITY BETA"}</p><h2>{locale === "zh" ? "真实世界，不做负债羞辱榜" : "A real world without debt shaming"}</h2><small>{locale === "zh" ? "匿名故事、固定鼓励、达到门槛才公开聚合数据。" : "Anonymous stories, fixed encouragement, and thresholded aggregates."}</small></div></header>
        <div className="community-safety-strip"><b>!</b><span>{locale === "zh" ? "联系方式、精确数字和身份线索会隐藏；没有私信、借钱或收费引流。每个匿名角色每日最多 3 次投稿、30 次送光和 10 次举报。" : "Contact details, exact numbers, and identity clues are hidden. No DMs, lending, or solicitation. Each anonymous character has daily limits of 3 submissions, 30 lights, and 10 reports."}</span></div>

        <nav className="community-tabs">
          <button className={tab === "world" ? "active" : ""} onClick={() => setTab("world")}>{locale === "zh" ? "世界故事" : "World stories"} <i>{stories.length}</i></button>
          <button className={tab === "insights" ? "active" : ""} onClick={() => setTab("insights")}>{locale === "zh" ? "世界数据" : "World data"}</button>
          <button className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>{locale === "zh" ? "我的投稿" : "My submissions"} <i>{mine.length}</i></button>
        </nav>

        {tab === "world" && <div className="community-feed">
          {loading && !stories.length && <p className="community-empty">{locale === "zh" ? "正在读取经过审核的故事…" : "Loading reviewed stories…"}</p>}
          {!loading && !stories.length && <div className="community-empty"><strong>{locale === "zh" ? "还没有通过审核的真实故事" : "No real stories have passed review yet"}</strong><span>{locale === "zh" ? "系统不会为了热闹而伪造用户，也不会让故事未经审核直接出现。" : "The product will not invent users or publish stories before review."}</span></div>}
          {stories.map((story) => <article className={`community-story ${lightFeedbackId === story.id ? "story-light-burst" : ""}`} key={story.id}>
            <div className="story-meta"><span>{countryFlag(story.countryCode)}</span><div><strong>{story.anonymousName}</strong><small>{kindNames[story.debtKind]?.[locale] ?? kindNames.other[locale]} · {story.currency} {story.amountBand}</small></div><time>{new Date(story.createdAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}</time></div>
            <div className="approach-pill">↗ {approachNames[story.repaymentApproach]?.[locale] ?? approachNames.other[locale]}</div>
            <p>“{story.storyText}”</p>
            <footer><button className={story.encouraged ? "encouraged" : ""} disabled={story.encouraged || mineIds.has(story.id)} onClick={() => encourage(story.id)}>✦ {story.encouraged ? (locale === "zh" ? "光已送达" : "Light sent") : (locale === "zh" ? "送一点光" : "Send light")} <b>{story.encouragementCount}</b></button><button onClick={() => setReportingId(story.id)}>⚑ {locale === "zh" ? "举报" : "Report"}</button></footer>
            {lightFeedbackId === story.id && <div className="story-light-arrival" role="status" aria-live="polite">✦ {locale === "zh" ? "光已送达 +1" : "Light delivered +1"}</div>}
            {reportingId === story.id && <form className="report-form" onSubmit={reportStory}><label>{locale === "zh" ? "举报原因" : "Reason"}<select value={reportReason} onChange={(event) => setReportReason(event.target.value as keyof typeof reportReasons)}>{Object.entries(reportReasons).map(([key, value]) => <option value={key} key={key}>{value[locale]}</option>)}</select></label><label>{locale === "zh" ? "补充说明（不要填写联系方式）" : "Details (no contact information)"}<textarea maxLength={240} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)}/></label><div><button type="button" onClick={() => setReportingId(null)}>{locale === "zh" ? "取消" : "Cancel"}</button><button type="submit">{locale === "zh" ? "提交举报" : "Submit report"}</button></div></form>}
          </article>)}
        </div>}

        {tab === "insights" && <div className="community-insights">
          <div className="privacy-meter"><div><strong>{insights.sampleSize} / {insights.minSample}</strong><span>{locale === "zh" ? "通过审核的匿名故事" : "reviewed anonymous stories"}</span></div><i><b style={{ width: `${Math.min(100, (insights.sampleSize / insights.minSample) * 100)}%` }}/></i></div>
          {!insights.ready ? <div className="insight-lock"><strong>⌁ {locale === "zh" ? "真实聚合数据尚未解锁" : "Real aggregate data is still locked"}</strong><p>{locale === "zh" ? "至少 30 个通过审核的故事后，才展示债务类型和还款方式统计，避免从小样本猜出任何个人。这里不会显示“谁欠得最多”。" : "Debt-type and repayment-method aggregates appear only after 30 reviewed stories, preventing inference about individuals. There is no 'who owes the most' leaderboard."}</p><div className="demo-insights"><article><b>5</b><span>{locale === "zh" ? "个明确标注的演示角色" : "clearly labeled demo people"}</span></article><article><b>5</b><span>{locale === "zh" ? "种不同还款做法" : "different repayment approaches"}</span></article><article><b>0</b><span>{locale === "zh" ? "个真实用户被排名" : "real users ranked"}</span></article></div><small>{locale === "zh" ? "当前世界人物是产品演示数据，不代表真实世界比例。" : "Current world characters are product demo data, not real-world proportions."}</small></div> : <div className="aggregate-grid"><section><h3>{locale === "zh" ? "最常出现的债务类型" : "Most reported debt types"}</h3>{insights.debtKinds.map((item) => <div className="aggregate-row" key={item.key}><span>{kindNames[item.key as DebtKind]?.[locale] ?? kindNames.other[locale]}</span><i><b style={{ width: `${(item.count / topCount) * 100}%` }}/></i><strong>{item.count}</strong></div>)}</section><section><h3>{locale === "zh" ? "大家正在尝试的还款方式" : "Repayment approaches people try"}</h3>{insights.repaymentApproaches.map((item) => <div className="aggregate-row" key={item.key}><span>{approachNames[item.key]?.[locale] ?? approachNames.other[locale]}</span><i><b style={{ width: `${(item.count / topCount) * 100}%` }}/></i><strong>{item.count}</strong></div>)}</section></div>}
          <section className="mbti-insight-panel"><header><div><p>OPTIONAL PROFILE AGGREGATE</p><h3>{locale === "zh" ? "哪个 MBTI 的平均自报余额更高？" : "Which MBTI reports a higher average balance?"}</h3></div><strong>{insights.profileSampleSize} / {insights.profileMinSample}</strong></header>{!insights.profileReady || !insights.mbtiDebt.length ? <div className="insight-lock compact"><strong>⌁ {locale === "zh" ? "画像样本仍不足" : "Not enough profile samples"}</strong><p>{locale === "zh" ? "只统计主动开启“帮助世界成长”的可选 MBTI；至少 30 个不同世界、且每个类型至少 5 人才显示。不会展示个人排行。" : "Only optional MBTI profiles with world-growth consent count. At least 30 worlds and 5 people per type are required. Individuals are never ranked."}</p></div> : <div className="mbti-aggregate-list">{insights.mbtiDebt.map((item, index) => <div key={item.key}><b>{index + 1}</b><strong>{item.key}</strong><i><span style={{ width: `${(item.averageUsd / topMbtiAverage) * 100}%` }}/></i><em>≈ US${item.averageUsd.toLocaleString("en-US")} / {locale === "zh" ? "人" : "person"}</em><small>n={item.count}</small></div>)}</div>}<p>{locale === "zh" ? "这是用备用参考汇率折算的群体平均自报余额，只用于探索，不代表性格导致负债，也不是科学因果结论。" : "This is an exploratory group average using fallback reference FX. It does not mean personality causes debt and is not a causal finding."}</p></section>
        </div>}

        {tab === "mine" && <div className="community-mine">
          {cloudState !== "synced" ? <div className="community-empty"><strong>{locale === "zh" ? "正在重新连接大世界" : "Reconnecting the shared world"}</strong><span>{locale === "zh" ? "投稿、鼓励和举报需要匿名账号身份，避免机器人滥用。" : "Community actions require an anonymous account identity to deter abuse."}</span><button onClick={onOpenVault}>{locale === "zh" ? "刷新并重连" : "Refresh and reconnect"}</button></div> : <>
            {shareableDebts.length ? <form className="story-composer" onSubmit={publishStory}><label>{locale === "zh" ? "选择一笔已允许匿名区间的债务" : "Choose a range-share debt"}<select value={selectedDebtId} onChange={(event) => setDebtId(event.target.value)}>{shareableDebts.map((debt) => <option value={debt.id} key={debt.id}>{debtName(debt, locale)}</option>)}</select></label><label>{locale === "zh" ? "你主要在用什么方式推进？" : "What approach are you mainly trying?"}<select value={repaymentApproach} onChange={(event) => setRepaymentApproach(event.target.value)}>{Object.entries(approachNames).map(([key, value]) => <option key={key} value={key}>{value[locale]}</option>)}</select></label><label>{locale === "zh" ? "写下困扰、变化或一步上岸经验" : "Share a struggle, change, or helpful step"}<textarea required minLength={20} maxLength={600} value={storyText} onChange={(event) => setStoryText(event.target.value)} placeholder={locale === "zh" ? "不要填写姓名、城市、电话、社交账号或精确金额。" : "Do not include names, cities, phone numbers, social accounts, or exact amounts."}/><small>{storyText.length}/600</small></label>{policyAccepted ? <p className="policy-accepted">✓ {locale === "zh" ? `已确认安全规则 ${SAFETY_POLICY_VERSION}` : `Safety rules ${SAFETY_POLICY_VERSION} confirmed`}</p> : <div className="policy-confirm"><label><input type="checkbox" checked={rulesAccepted} onChange={(event) => setRulesAccepted(event.target.checked)}/><span>{locale === "zh" ? <>我已阅读并同意<a href="/safety" target="_blank" rel="noreferrer">隐私说明与社区规则</a>，不发布身份线索、借贷引流或伤害内容。</> : <>I read and accept the <a href="/en/safety" target="_blank" rel="noreferrer">privacy notice and community rules</a> and will not post identity clues, lending solicitation, or harmful content.</>}</span></label><label><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)}/><span>{locale === "zh" ? "我确认自己已年满 18 岁。" : "I confirm that I am at least 18 years old."}</span></label></div>}<button disabled={loading || storyText.trim().length < 20 || (!policyAccepted && (!rulesAccepted || !ageConfirmed))} type="submit">{locale === "zh" ? "送入匿名审核队列" : "Submit to anonymous review"} →</button></form> : <div className="community-empty"><strong>{locale === "zh" ? "还没有允许匿名区间的债务" : "No debt allows anonymous range sharing"}</strong><span>{locale === "zh" ? "打开一笔债务的档案，将匿名世界权限改为匿名金额区间。" : "Open a debt file and change its permission to anonymous range sharing."}</span>{debts[0] && <button onClick={() => onSelectDebt(debts[0].id)}>{locale === "zh" ? "打开债务档案" : "Open debt file"}</button>}</div>}
            <div className="submission-list">{mine.map((story) => <article key={story.id}><span className={`story-status status-${story.status}`}>{statusLabel(story.status)}</span><strong>{kindNames[story.debtKind]?.[locale] ?? kindNames.other[locale]} · {story.currency} {story.amountBand}</strong><small>{approachNames[story.repaymentApproach]?.[locale] ?? approachNames.other[locale]}</small><p>{story.storyText}</p><div className="submission-actions"><button className={deletingStoryId === story.id ? "confirm-delete" : ""} disabled={loading} onClick={() => void deleteMyStory(story.id)}>{deletingStoryId === story.id ? (locale === "zh" ? "再次确认：永久删除" : "Confirm permanent deletion") : (locale === "zh" ? "撤回并永久删除" : "Withdraw and permanently delete")}</button>{deletingStoryId === story.id && <button onClick={() => setDeletingStoryId(null)}>{locale === "zh" ? "取消" : "Cancel"}</button>}</div></article>)}</div>
          </>}
        </div>}
        {message && <p className="community-message">{message}</p>}
      </section>
    </div>
  );
}
