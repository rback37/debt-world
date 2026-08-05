"use client";

import { FormEvent, useEffect, useState } from "react";
import DebtWorldGame from "./DebtWorldGame";
import TurnstileWidget from "./TurnstileWidget";
import type { Locale } from "@/lib/debt-world-types";

type Account = {
  userCode: string;
  username: string;
  createdAt: string;
  vaultLinked: boolean;
};

type AccountState = {
  authenticated: boolean;
  account?: Account;
  legacyVaultDetected?: boolean;
  error?: string;
};

type SecurityState = {
  configured: boolean;
  required: boolean;
  siteKey: string | null;
};

type BetaState = { signupsEnabled: boolean; accountSignupsEnabled?: boolean; inviteRequired: boolean };

const ACCOUNT_REQUEST_TIMEOUT_MS = 10_000;

async function readState(response: Response) {
  const data = await response.json().catch(() => ({})) as AccountState;
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function requestAccount(init?: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ACCOUNT_REQUEST_TIMEOUT_MS);
  try {
    return await readState(await fetch("/api/account", {
      ...init,
      signal: controller.signal,
    }));
  } finally {
    window.clearTimeout(timer);
  }
}

function accountRequestMessage(error: unknown, zh: boolean) {
  if (error instanceof Error && error.name === "AbortError") {
    return zh
      ? "连接比平时慢，已为你打开账号入口。你可以重试登录或注册；如果仍然卡住，请稍后刷新页面。"
      : "The connection took longer than expected, so the account screen is now available. Try signing in or registering again; refresh later if it still stalls.";
  }
  return error instanceof Error ? error.message : (zh ? "账号服务暂时不可用。" : "The account service is temporarily unavailable.");
}

function readSignupSource() {
  if (typeof window === "undefined") return "direct";
  if (new URLSearchParams(window.location.search).get("ref")) return "referral";
  const source = new URLSearchParams(window.location.search).get("src")?.toLowerCase().replace(/[^a-z]/g, "") ?? "direct";
  return source || "direct";
}

function readReferralCode() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase().slice(0, 32) ?? "";
}

function EntryProductPreview({ locale, side }: { locale: Locale; side: "world" | "plan" }) {
  const zh = locale === "zh";
  if (side === "world") {
    return <aside className="entry-preview entry-preview-world" aria-label={zh ? "可行走的匿名债务世界产品预览" : "Walkable anonymous debt world preview"}>
      <div className="entry-preview-heading"><span>01</span><div><b>{zh ? "进入后，你不是一张表" : "You are more than a spreadsheet"}</b><small>{zh ? "产品真实界面预览" : "REAL PRODUCT PREVIEW"}</small></div></div>
      <div className="entry-world-scene" aria-hidden="true">
        <i className="entry-road entry-road-a"/><i className="entry-road entry-road-b"/>
        <span className="entry-district entry-district-home">⌂ <b>{zh ? "住房山丘" : "HOUSING HILL"}</b></span>
        <span className="entry-district entry-district-card">▤ <b>{zh ? "循环信贷街" : "CREDIT ROW"}</b></span>
        <span className="entry-walker entry-walker-one"><i>✦</i><b>{zh ? "我的角色" : "YOU"}</b></span>
        <span className="entry-walker entry-walker-two"><i>◎</i><b>Walker</b></span>
        <span className="entry-debt-orbit entry-orbit-one">🏠 {zh ? "最大来源 · 房贷" : "TOP · MORTGAGE"}</span>
        <span className="entry-debt-orbit entry-orbit-two">💳 {zh ? "信用卡 · 真实进度" : "CARD · REAL PROGRESS"}</span>
      </div>
      <h2>{zh ? "看见真实世界，而不是“人均富豪”" : "See real lives—not an everyone-is-rich illusion"}</h2>
      <p>{zh ? "你的角色可以走动、查看匿名同伴，并让多笔债务、最大来源与真实还款进度变成看得见的路。" : "Walk, meet anonymous peers, and turn multiple debts, the largest source, and real repayment progress into a visible route."}</p>
      <div className="entry-proof-row"><span>◎ {zh ? "共同世界" : "Shared world"}</span><span>◫ {zh ? "多笔债务" : "Multiple debts"}</span><span>✦ {zh ? "互相打气" : "Encouragement"}</span></div>
    </aside>;
  }
  return <aside className="entry-preview entry-preview-plan" aria-label={zh ? "手机还款计划与小岸 AI 产品预览" : "Mobile repayment planner and Kian AI preview"}>
    <div className="entry-preview-heading"><span>02</span><div><b>{zh ? "世界背后，是每天能用的计划" : "A planner you can use every day"}</b><small>{zh ? "手机端方向" : "MOBILE-FIRST DIRECTION"}</small></div></div>
    <div className="entry-phone" aria-hidden="true">
      <div className="entry-phone-top"><b>{zh ? "本月还款计划" : "MONTHLY PLAN"}</b><span>◒</span></div>
      <div className="entry-cashflow"><small>{zh ? "月度现金流" : "MONTHLY CASHFLOW"}</small><strong>{zh ? "收入 − 日常 − 还款" : "Income − living − debt"}</strong><i><b/></i></div>
      <div className="entry-plan-row"><span>15</span><div><b>{zh ? "房贷" : "Mortgage"}</b><small>{zh ? "到期后确认真实余额" : "Confirm the real balance"}</small></div><em>⌁</em></div>
      <div className="entry-plan-row"><span>23</span><div><b>{zh ? "信用卡" : "Credit card"}</b><small>{zh ? "记录实际还款" : "Record actual payment"}</small></div><em>○</em></div>
      <div className="entry-kian-bubble"><span>🐕</span><p><b>{zh ? "小岸" : "Kian"}</b>{zh ? "先把压力拆成一件能确认的下一步。" : "Let’s turn the pressure into one next step you can confirm."}</p></div>
    </div>
    <h2>{zh ? "记账、还款计划、AI 梳理与匿名社区合在一起" : "Tracking, planning, AI organization, and community—together"}</h2>
    <p>{zh ? "按真实日期生成任务；只有你确认实际发生并填写最新本金，人物进度才会变化。不会假装减债。" : "Tasks follow real dates. Progress changes only after you confirm what happened and enter the latest principal—never pretend debt reduction."}</p>
    <div className="entry-proof-row"><span>◷ {zh ? "真实日期" : "Real dates"}</span><span>↗ {zh ? "提前还款" : "Prepayment"}</span><span>🐕 {zh ? "小岸 AI" : "Kian AI"}</span></div>
  </aside>;
}

export default function AccountGate({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const [state, setState] = useState<AccountState | null>(null);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [legacyLocal, setLegacyLocal] = useState(false);
  const [importLegacyLocal, setImportLegacyLocal] = useState(false);
  const [turnstile, setTurnstile] = useState<SecurityState | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [beta, setBeta] = useState<BetaState>({ signupsEnabled: true, inviteRequired: false });

  useEffect(() => {
    const timer = window.setTimeout(() => setLegacyLocal(Boolean(window.localStorage.getItem("debt-world-v2"))), 0);
    void requestAccount({ credentials: "same-origin", cache: "no-store" })
      .then(setState)
      .catch((error) => {
        setState({ authenticated: false });
        setMessage(accountRequestMessage(error, zh));
      });
    void fetch("/api/security", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { turnstile?: SecurityState }) => setTurnstile(data.turnstile ?? null))
      .catch(() => setTurnstile(null));
    void fetch("/api/beta", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: BetaState) => setBeta(data))
      .catch(() => undefined);
    void fetch("/api/analytics", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, path: window.location.pathname, source: readSignupSource() }),
    }).catch(() => undefined);
    return () => window.clearTimeout(timer);
  }, [locale, zh]);

  const carryLocalRecord = (account: Account) => {
    if (!importLegacyLocal) return;
    const legacy = window.localStorage.getItem("debt-world-v2");
    const target = `debt-world-v3:${account.userCode}`;
    if (legacy && !window.localStorage.getItem(target)) window.localStorage.setItem(target, legacy);
  };

  const authenticate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const next = await requestAccount({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, username, password, signupSource: mode === "register" ? readSignupSource() : undefined, referralCode: mode === "register" ? readReferralCode() : undefined, turnstileToken: mode === "register" ? turnstileToken : undefined }),
      });
      if (next.account) carryLocalRecord(next.account);
      setState(next);
      setPassword("");
    } catch (error) {
      setMessage(accountRequestMessage(error, zh));
      if (mode === "register" && turnstile?.configured) setTurnstileResetKey((current) => current + 1);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      setState(await requestAccount({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      }));
      setMessage("");
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return <main className="account-shell"><div className="account-loading"><span>◒</span><strong>{zh ? "正在打开上岸星球…" : "Opening Debt World…"}</strong></div></main>;
  }

  if (!state.authenticated || !state.account) {
    return <main className="account-shell">
      <EntryProductPreview locale={locale} side="world"/>
      <section className="account-card">
        <div className="account-planet">◒<i/><i/><i/></div>
        <p className="account-kicker">DEBT WORLD · PRIVATE ACCOUNT</p>
        <h1>{zh ? "创建匿名账号，进入真实世界" : "Your private way into Debt World"}</h1>
        <p className="account-lead">{zh ? "不需要邮箱、手机号或真实姓名。用户名用于登录，角色昵称仍可保持匿名。" : "No email, phone number, or legal name required. Your username signs you in; your character can stay anonymous."}</p>
        <div className="account-beta-route">
          <div><span>β</span><strong>{beta.inviteRequired ? (zh ? "首批邀请码测试 · 大约 10 分钟" : "Invitation beta · about 10 minutes") : (zh ? "公开测试 · 大约 10 分钟" : "Public beta · about 10 minutes")}</strong></div>
          <ol>
            <li>{zh ? "注册匿名账号" : "Create an anonymous account"}</li>
            <li>{zh ? "账号自动进入同一个大世界" : "Your account enters the shared world automatically"}</li>
            <li>{zh ? "与小岸整理债务，世界随真实数据生长" : "Talk with Kian; the world grows with real data"}</li>
          </ol>
          <small>{zh ? "没有保险箱、恢复码或手动同步步骤。精确个人数据仍保持私密，匿名汇总会让公共世界逐渐扩大。" : "There is no vault, recovery-code, or manual-sync step. Exact personal data stays private while anonymous aggregates grow the public world."}</small>
        </div>
        <div className="account-tabs">
          <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setMessage(""); setTurnstileToken(""); }}>{zh ? "注册新账号" : "Create account"}</button>
          <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); setTurnstileToken(""); }}>{zh ? "已有账号登录" : "Sign in"}</button>
        </div>
        <form className="account-form" onSubmit={authenticate}>
          <label><span>{zh ? "用户名" : "Username"}</span><input required minLength={3} maxLength={30} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={zh ? "3–30 个字符，不必是真名" : "3–30 characters; not your legal name"}/></label>
          <label><span>{zh ? "密码" : "Password"}</span><input required minLength={10} maxLength={128} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={zh ? "至少 10 位，包含字母和数字" : "10+ characters with a letter and number"}/></label>
          {legacyLocal && <label className="account-import"><input type="checkbox" checked={importLegacyLocal} onChange={(event) => setImportLegacyLocal(event.target.checked)}/><span>{zh ? "将这台设备上已有的本地记录带入此账号" : "Bring this device’s existing local record into this account"}</span></label>}
          {mode === "register" && turnstile?.siteKey && <TurnstileWidget siteKey={turnstile.siteKey} action="register" locale={locale} resetKey={turnstileResetKey} onToken={setTurnstileToken}/>}
          {mode === "register" && turnstile?.required && !turnstile.configured && <p className="account-error">{zh ? "真人校验正在配置，注册会暂时恢复后开放。" : "Human verification is being configured; registration will reopen shortly."}</p>}
          <button className="account-primary" disabled={busy || (mode === "register" && (beta.accountSignupsEnabled === false || (Boolean(turnstile?.required) && !turnstileToken)))}>{busy ? (zh ? "请稍候…" : "Please wait…") : mode === "register" ? (beta.accountSignupsEnabled === false ? (zh ? "今日名额已满或注册已暂停" : "Registration is paused or full today") : (zh ? "注册并进入" : "Create and enter")) : (zh ? "登录" : "Sign in")}</button>
        </form>
        <div className="account-trust"><span>⌁</span><p><strong>{zh ? "密码无法被任何人查看" : "Nobody can view your password"}</strong>{zh ? "服务器只保存加盐加密摘要；管理员也看不到密码、精确债务或私人 AI 对话。" : "Only a salted cryptographic digest is stored. Admins cannot see passwords, exact debts, or private AI chats."}</p></div>
        {message && <p className="account-error">{message}</p>}
        <footer><a className="account-build-link" href={zh ? "/contribute" : "/en/contribute"}>✦ {zh ? "共同建造这个世界" : "Help build this world"}</a><a href={zh ? "/about" : "/en/about"}>{zh ? "了解上岸星球" : "About Debt World"}</a><a href={zh ? "/safety" : "/en/safety"}>{zh ? "隐私、社区规则与数据删除" : "Privacy, community rules, and deletion"}</a><a href={zh ? "/en" : "/"}>{zh ? "English" : "中文"}</a></footer>
      </section>
      <EntryProductPreview locale={locale} side="plan"/>
    </main>;
  }

  return <>
    <DebtWorldGame locale={locale} accountKey={state.account.userCode}/>
    <div className="account-chip"><span>●</span><b>{state.account.username}</b><small>{state.account.userCode}</small><button disabled={busy} onClick={logout}>{zh ? "退出" : "Sign out"}</button></div>
  </>;
}
