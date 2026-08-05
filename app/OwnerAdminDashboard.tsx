"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminCommunityPanel from "@/app/AdminCommunityPanel";

type SessionState = {
  eligible: boolean;
  registered: boolean;
  accountUsername: string;
  accountCode: string;
  activatedAt: string | null;
};
type Tester = {
  testerCode: string;
  username: string | null;
  loginStatus: "active" | "suspended" | "legacy";
  accountStatus: "linked" | "account_only" | "legacy";
  countryCode: string;
  joinedAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string;
  vaultCreatedAt: string | null;
  debtCount: number;
  paymentCount: number;
  aiCount: number;
  feedbackCount: number;
  storyCount: number;
  signupSource: string;
};
type Feedback = {
  id: string;
  testerCode: string;
  username: string | null;
  category: string;
  rating: number;
  message: string;
  pagePath: string;
  status: string;
  createdAt: string;
};
type SourceStat = {
  source: string;
  accounts: number;
  linked: number;
  withDebt: number;
  withFeedback: number;
};
type TrafficDay = {
  day: string;
  uniqueVisitors: number;
  pageViews: number;
  registrations: number;
  debtActivations: number;
  referralActivations: number;
};
type BetaState = {
  config: { signupsEnabled: boolean; inviteRequired: boolean; inviteConfigured: boolean; maxUses: number; dailySignupLimit: number; signupsToday: number };
  counts: {
    accounts: number; activeAccounts: number; suspendedAccounts: number; active24h: number; active7d: number;
    vaults: number; debts: number; payments: number; aiRequests: number; pendingStories: number; publishedStories: number;
    openReports: number; legacyVaults: number; enrolled: number; openFeedback: number; inviteUses: number; inviteLimit: number;
    visitorsToday: number; pageViewsToday: number; referralInvites: number; referralActivated: number; referralPending: number;
  };
  testers: Tester[];
  feedback: Feedback[];
  sources: SourceStat[];
  trafficDaily: TrafficDay[];
};

async function readJson<T>(response: Response) {
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function flag(code: string) {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0))) : "🌐";
}

export default function OwnerAdminDashboard({ signedInAs, signOutPath }: { signedInAs: string; signOutPath: string }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [data, setData] = useState<BetaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Tester["accountStatus"]>("all");
  const [journey, setJourney] = useState<"all" | "account_only" | "needs_debt" | "needs_feedback" | "feedback_done">("all");
  const [loginStatus, setLoginStatus] = useState<"all" | "active" | "suspended">("all");
  const [copied, setCopied] = useState("");
  const [communityOpen, setCommunityOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const publicUrl = "https://www.debtworld.org/";
  const invitationZh = `上岸星球现在开放公开测试：这是一个所有人共同进入、会随着真实匿名数据持续生长的债务世界。注册后直接进入，不需要保险箱、恢复码或手动同步。你可以与小岸整理债务、收入、开销和还款进度；精确个人数据保持私密，匿名汇总让世界出现更多行者、建筑与负债社区。\n\n打开 ${publicUrl}，注册匿名账号、选择国家后直接开始。体验后，请用顶部“反馈”告诉我哪里看不懂、卡住或让你不舒服。\n\n这是早期测试，不连接银行，也不是财务、法律、医疗或债务减免服务。`;
  const invitationEn = `Debt World is now in public beta: one shared debt world that keeps growing from real, anonymous data. Registration takes you straight inside—there is no vault, recovery code, or manual-sync step. Kian helps organize debts, income, living costs, and repayment progress. Exact personal data stays private while anonymous aggregates grow new walkers, buildings, and debt communities.\n\nOpen ${publicUrl}, create an anonymous account, choose your country, and begin. After trying it, use Feedback to tell me what was confusing, broken, or uncomfortable.\n\nThis is an early beta. It does not connect to banks and is not financial, legal, medical, or debt-relief advice.`;
  const campaignSources = [
    { key: "github", label: "GitHub", url: `${publicUrl}?src=github` },
    { key: "weibo", label: "微博", url: `${publicUrl}?src=weibo` },
    { key: "reddit", label: "Reddit", url: `${publicUrl}en?src=reddit` },
    { key: "x", label: "X", url: `${publicUrl}en?src=x` },
    { key: "producthunt", label: "Product Hunt", url: `${publicUrl}en?src=producthunt` },
    { key: "showhn", label: "Show HN", url: `${publicUrl}en?src=showhn` },
    { key: "friend", label: "朋友邀请", url: `${publicUrl}?src=friend` },
  ];
  const sourceLabels = Object.fromEntries([...campaignSources.map((item) => [item.key, item.label]), ["direct", "直接访问"], ["other", "其他"]]);

  const loadDashboard = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setMessage("");
    try {
      setData(await readJson<BetaState>(await fetch("/api/admin/beta", { credentials: "same-origin", cache: "no-store" })));
      setLastUpdatedAt(new Date());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "后台数据暂时不可用。");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) { setDenied(true); setLoading(false); return; }
        const next = await readJson<SessionState>(response);
        setSession(next);
        if (next.registered) await loadDashboard(); else setLoading(false);
      })
      .catch((error) => { setMessage(error instanceof Error ? error.message : "无法验证所有者身份。"); setLoading(false); });
  }, [loadDashboard]);

  useEffect(() => {
    if (!session?.registered || !autoRefresh) return;
    const timer = window.setInterval(() => void loadDashboard(true), 30_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, loadDashboard, session?.registered]);

  const activate = async () => {
    setLoading(true);
    setMessage("");
    try {
      const next = await readJson<SessionState>(await fetch("/api/admin/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register" }),
      }));
      setSession(next);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "管理员激活没有完成。");
      setLoading(false);
    }
  };

  const act = async (payload: Record<string, unknown>) => {
    setLoading(true);
    setMessage("");
    try {
      setData(await readJson<BetaState>(await fetch("/api/admin/beta", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })));
      setLastUpdatedAt(new Date());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作没有完成。");
    } finally {
      setLoading(false);
    }
  };

  const visibleTesters = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (data?.testers ?? []).filter((tester) => {
      if (status !== "all" && tester.accountStatus !== status) return false;
      if (loginStatus !== "all" && tester.loginStatus !== loginStatus) return false;
      if (journey === "account_only" && tester.accountStatus !== "account_only") return false;
      if (journey === "needs_debt" && !(tester.accountStatus === "linked" && tester.debtCount === 0)) return false;
      if (journey === "needs_feedback" && !(tester.accountStatus === "linked" && tester.debtCount > 0 && tester.feedbackCount === 0)) return false;
      if (journey === "feedback_done" && tester.feedbackCount === 0) return false;
      return !needle || tester.testerCode.toLocaleLowerCase().includes(needle) || tester.username?.toLocaleLowerCase().includes(needle) || tester.countryCode.toLocaleLowerCase().includes(needle);
    });
  }, [data, journey, loginStatus, query, status]);

  const funnel = useMemo(() => {
    const testers = data?.testers ?? [];
    const linked = testers.filter((tester) => tester.accountStatus === "linked" && tester.loginStatus === "active");
    return {
      accounts: data?.counts.accounts ?? 0,
      linked: linked.length,
      withDebt: linked.filter((tester) => tester.debtCount > 0).length,
      withFeedback: linked.filter((tester) => tester.feedbackCount > 0).length,
    };
  }, [data]);

  const copyAsset = async (kind: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setMessage("浏览器没有允许复制，请手动选择文字复制。");
    }
  };

  if (denied) return <main className="owner-admin-shell"><section className="owner-admin-denied"><span>404</span><h1>这个后台不存在</h1><p>当前身份不是已绑定的上岸星球唯一管理员。</p><a href="/">返回世界</a></section></main>;

  if (!session?.registered) return <main className="owner-admin-shell"><section className="owner-activation-card">
    <div className="owner-lock">⌁</div><p>DEBT WORLD · OWNER LOCK</p><h1>绑定唯一管理员账号</h1>
    <span>站内账号：{session?.accountUsername ? `@${session.accountUsername} · ${session.accountCode}` : "请先返回主页登录要绑定的账号"}</span>
    <p>首次绑定同时核验所有者身份和当前上岸星球账号。绑定后，只有这一个站内账号能看到入口并调用后台接口。</p>
    <button disabled={loading || !session?.eligible} onClick={activate}>{loading ? "正在验证…" : "绑定当前账号并授予管理员权限"}</button>
    <small>所有者身份：{signedInAs}。后台不会显示密码、精确负债金额或私人 AI 对话。</small>
    {message && <em>{message}</em>}<a href="/">返回主页登录站内账号</a><a href={signOutPath}>切换所有者身份</a>
  </section></main>;

  return <main className="owner-admin-shell">
    <header className="owner-admin-top"><div><p>DEBT WORLD · OWNER CONSOLE</p><h1>上岸星球管理后台</h1><span>唯一管理员账号 · @{session.accountUsername} · {session.accountCode}</span><small className="owner-live-state">{lastUpdatedAt ? `最近更新 ${lastUpdatedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "正在读取实时数据"}</small></div><nav><a href="/">返回世界</a><button className={autoRefresh ? "owner-auto-button active" : "owner-auto-button"} onClick={() => setAutoRefresh((value) => !value)}>{autoRefresh ? "● 30 秒自动刷新" : "自动刷新已关闭"}</button><button disabled={loading} onClick={() => void loadDashboard()}>立即刷新</button><a href={signOutPath}>退出管理员</a></nav></header>
    {!data && <section className="owner-panel owner-data-state"><b>{loading ? "◒" : "!"}</b><div><h2>{loading ? "正在载入管理员数据" : "管理员数据暂时没有返回"}</h2><p>{message || "用户、世界、还款、反馈和推广来源会在这里集中显示。"}</p></div>{!loading && <button onClick={() => void loadDashboard()}>重新读取</button>}</section>}
    {data && <>
      <section className="owner-metrics">
        <article><span>今日独立访客</span><strong>{data.counts.visitorsToday}</strong><small>{data.counts.pageViewsToday} 次页面打开</small></article>
        <article><span>注册账号</span><strong>{data.counts.accounts}</strong><small>{data.counts.activeAccounts} 正常 · {data.counts.suspendedAccounts} 暂停</small></article>
        <article><span>24 小时活跃</span><strong>{data.counts.active24h}</strong><small>近 7 天 {data.counts.active7d} 人</small></article>
        <article><span>共同世界角色</span><strong>{data.counts.vaults}</strong><small>{data.counts.legacyVaults} 个待迁移旧角色</small></article>
        <article><span>真实行动</span><strong>{data.counts.payments}</strong><small>{data.counts.debts} 笔债务 · {data.counts.aiRequests} 次 AI</small></article>
        <article className={data.counts.openFeedback ? "needs-attention" : ""}><span>待处理反馈</span><strong>{data.counts.openFeedback}</strong><small>最近共 {data.feedback.length} 条</small></article>
        <article className={data.counts.pendingStories ? "needs-attention" : ""}><span>待审核故事</span><strong>{data.counts.pendingStories}</strong><small>{data.counts.publishedStories} 个已公开</small></article>
        <article className={data.counts.openReports ? "needs-attention" : ""}><span>未结举报</span><strong>{data.counts.openReports}</strong><small>进入社区审核台处理</small></article>
        <article><span>公开状态</span><strong>{data.config.inviteRequired ? "邀请制" : "已开放"}</strong><small>{data.config.signupsEnabled ? `今日注册 ${data.config.signupsToday} / ${data.config.dailySignupLimit}` : "新注册已暂停"}</small></article>
        <article><span>真实邀请激活</span><strong>{data.counts.referralActivated}</strong><small>{data.counts.referralInvites} 人受邀 · {data.counts.referralPending} 人待建档</small></article>
      </section>
      <section className={`owner-signups ${data.config.signupsEnabled ? "open" : "paused"}`}><div><i/>
        <span><strong>{data.config.signupsEnabled ? "公开测试正在接收新用户" : "当前已暂停创建新世界"}</strong><small>{data.config.inviteRequired ? "仍需邀请码" : "无需邀请码 · 真人验证与安全审核继续生效"}</small></span>
      </div><div className="owner-signup-actions"><button className="owner-moderation-button" onClick={() => setCommunityOpen(true)}>社区审核与举报</button><button disabled={loading} onClick={() => act({ action: "set_signups", enabled: !data.config.signupsEnabled })}>{data.config.signupsEnabled ? "紧急暂停新增" : "恢复新增"}</button></div></section>
      <section className="owner-panel owner-launch-panel">
        <header><div><p>PUBLIC BETA · LAUNCH DESK</p><h2>公开测试发布台</h2><span>复制正式入口与中英文介绍；现在任何成年用户都可注册，不再需要邀请码。</span></div><a href={publicUrl} target="_blank" rel="noreferrer">打开正式网站 ↗</a></header>
        <div className="owner-launch-grid">
          <article className="owner-public-link"><span>全球正式入口</span><strong>{publicUrl}</strong><small>中文入口为首页；英文用户可打开 /en。不要再发送旧的 chatgpt.site 地址。</small><button onClick={() => copyAsset("link", publicUrl)}>{copied === "link" ? "✓ 已复制" : "复制网站地址"}</button></article>
          <article className="owner-invite-copy"><div><span>中文公开测试介绍</span><button onClick={() => copyAsset("zh", invitationZh)}>{copied === "zh" ? "✓ 已复制" : "复制中文文案"}</button></div><p>{invitationZh}</p></article>
          <article className="owner-invite-copy"><div><span>English public-beta copy</span><button onClick={() => copyAsset("en", invitationEn)}>{copied === "en" ? "✓ Copied" : "Copy English copy"}</button></div><p>{invitationEn}</p></article>
        </div>
        <div className="owner-funnel">
          <div><span>1</span><strong>{funnel.accounts}</strong><small>注册账号</small></div><i>→</i>
          <div><span>2</span><strong>{funnel.linked}</strong><small>自动进入大世界</small></div><i>→</i>
          <div><span>3</span><strong>{funnel.withDebt}</strong><small>至少录入一笔债务</small></div><i>→</i>
          <div><span>4</span><strong>{funnel.withFeedback}</strong><small>提交过反馈</small></div>
        </div>
        <p className="owner-launch-note">{!data.config.signupsEnabled ? "当前新增已暂停；恢复后再继续推广。" : data.config.inviteRequired ? "邀请码仍在生效，公开发布前需要关闭。" : funnel.accounts > funnel.linked ? `${funnel.accounts - funnel.linked} 位旧账号尚待系统自动补建世界，刷新后台后应自动减少。` : funnel.withDebt > funnel.withFeedback ? `${funnel.withDebt - funnel.withFeedback} 位已录入债务但尚未反馈，可以提醒他们使用顶部“反馈”。` : "公开注册、自动进入大世界、安全验证与反馈链路均已就绪，可以开始分阶段发布。"}</p>
      </section>
      <section className="owner-panel owner-source-panel">
        <header><div><p>ACQUISITION · PRIVACY-SAFE ATTRIBUTION</p><h2>公测推广来源</h2><span>分别复制带来源标记的入口；后台只保存渠道名称，不保存完整访问地址、搜索词或浏览历史。</span></div></header>
        <div className="owner-source-links">
          {campaignSources.map((item) => <article key={item.key}><span>{item.label}</span><code>{item.url}</code><button onClick={() => copyAsset(`source-${item.key}`, item.url)}>{copied === `source-${item.key}` ? "✓ 已复制" : "复制专属入口"}</button></article>)}
        </div>
        <div className="owner-source-stats">
          {(data.sources ?? []).map((item) => <article className="owner-source-stat" key={item.source}>
            <header><strong>{sourceLabels[item.source] || item.source}</strong><b>{item.accounts} 人</b></header>
            <div className="owner-source-funnel"><span>注册 {item.accounts}</span><i>→</i><span>建档 {item.linked}</span><i>→</i><span>录债 {item.withDebt}</span><i>→</i><span>反馈 {item.withFeedback}</span></div>
          </article>)}
          {!data.sources?.length && <p className="owner-empty">推广链接准备好了；第一位新用户注册后，这里会出现渠道数据。</p>}
        </div>
      </section>
      <section className="owner-panel owner-traffic-panel">
        <header><div><p>DAILY TRAFFIC · 14 DAYS</p><h2>每日访问与转化</h2><span>独立访客按匿名第一方标识逐日去重；不保存 IP、设备信息、搜索词或完整浏览地址。</span></div></header>
        <div className="owner-traffic-list">
          <div className="owner-traffic-row owner-traffic-head"><span>日期</span><span>独立访客</span><span>页面打开</span><span>新注册</span><span>首次录债</span><span>邀请激活</span></div>
          {(data.trafficDaily ?? []).slice().reverse().map((item) => <article className="owner-traffic-row" key={item.day}><strong>{item.day}</strong><span>{item.uniqueVisitors}</span><span>{item.pageViews}</span><span>{item.registrations}</span><span>{item.debtActivations}</span><span>{item.referralActivations}</span></article>)}
        </div>
      </section>
      <section className="owner-panel owner-users-panel"><header><div><p>REGISTERED PEOPLE & SHARED-WORLD ACTIVITY</p><h2>用户与使用情况</h2><span>只显示运营所需概况，不展示精确金额和私密内容。</span></div><div className="owner-user-filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索用户名、编号或国家"/><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">全部账号状态</option><option value="linked">已进入大世界</option><option value="account_only">待自动补建</option><option value="legacy">待迁移旧角色</option></select><select value={journey} onChange={(event) => setJourney(event.target.value as typeof journey)}><option value="all">全部体验阶段</option><option value="account_only">待自动补建角色</option><option value="needs_debt">已进入但未录债务</option><option value="needs_feedback">已录债务未反馈</option><option value="feedback_done">已经提交反馈</option></select></div></header>
        <div className="owner-account-filter"><button className={loginStatus === "all" ? "active" : ""} onClick={() => setLoginStatus("all")}>全部账号</button><button className={loginStatus === "active" ? "active" : ""} onClick={() => setLoginStatus("active")}>正常账号</button><button className={loginStatus === "suspended" ? "active" : ""} onClick={() => setLoginStatus("suspended")}>已暂停</button></div>
        <div className="owner-user-list"><div className="owner-user-row owner-user-head"><span>用户</span><span>地区与状态</span><span>最近活动</span><span>使用概况</span><span>管理</span></div>
          {visibleTesters.map((tester) => <article className="owner-user-row" key={tester.testerCode}>
            <div><strong>{tester.username || "旧匿名用户"}</strong><code>{tester.testerCode}</code><small>来源：{sourceLabels[tester.signupSource] || tester.signupSource}</small></div>
            <div><span>{flag(tester.countryCode)} {tester.countryCode || "未填写"}</span><em className={`status-${tester.loginStatus}`}>{tester.loginStatus === "suspended" ? "账号已暂停" : tester.accountStatus === "linked" ? "已进入大世界" : tester.accountStatus === "account_only" ? "待自动补建" : "待迁移旧角色"}</em></div>
            <div><strong>{formatDate(tester.lastActiveAt)}</strong><small>加入 {formatDate(tester.joinedAt)}</small></div>
            <div className="owner-usage-pills"><span>债务项 {tester.debtCount}</span><span>还款 {tester.paymentCount}</span><span>AI {tester.aiCount}</span><span>反馈 {tester.feedbackCount}</span><span>故事 {tester.storyCount}</span></div>
            <div className="owner-user-actions">{tester.loginStatus !== "legacy" && <button className={tester.loginStatus === "suspended" ? "restore" : "suspend"} disabled={loading} onClick={() => {
              const next = tester.loginStatus === "suspended" ? "active" : "suspended";
              if (next === "active" || window.confirm(`确认暂停 ${tester.username || tester.testerCode}？该账号会立即退出，数据不会删除。`)) void act({ action: "set_account_status", testerCode: tester.testerCode, accountStatus: next });
            }}>{tester.loginStatus === "suspended" ? "恢复账号" : "暂停账号"}</button>}</div>
          </article>)}
          {!visibleTesters.length && <p className="owner-empty">没有符合筛选条件的用户。</p>}
        </div>
      </section>
      <section className="owner-panel owner-feedback-panel"><header><div><p>REAL BETA FEEDBACK</p><h2>内测反馈</h2><span>用户从世界顶部“反馈”按钮提交后，会直接出现在这里。</span></div></header>
        <div className="owner-feedback-grid">{data.feedback.map((item) => <article className={item.status === "resolved" ? "resolved" : ""} key={item.id}><header><div><strong>{item.username || "旧匿名用户"}</strong><code>{item.testerCode}</code></div><b>{"★".repeat(item.rating)}{"☆".repeat(5-item.rating)}</b></header><p>{item.message}</p><footer><span>{item.category} · {formatDate(item.createdAt)} · {item.pagePath}</span>{item.status === "open" ? <button disabled={loading} onClick={() => act({ action: "resolve_feedback", feedbackId: item.id })}>标记已处理</button> : <button className="reopen" disabled={loading} onClick={() => act({ action: "reopen_feedback", feedbackId: item.id })}>重新打开</button>}</footer></article>)}</div>
        {!data.feedback.length && <p className="owner-empty">目前还没有用户提交反馈。</p>}
      </section>
    </>}
    {loading && <div className="owner-loading">正在更新后台数据…</div>}{message && <div className="owner-message">{message}</div>}
    <AdminCommunityPanel open={communityOpen} locale="zh" onClose={() => setCommunityOpen(false)} onChanged={() => void loadDashboard(true)}/>
  </main>;
}
