"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/debt-world-types";

type ReferralState = {
  code: string;
  invited: number;
  activated: number;
  pending: number;
  rewards: { inviterShoreValue: number; inviterStarlight: number; invitedShoreValue: number; invitedStarlight: number };
};

export default function AccountPanel({
  open,
  locale,
  discoveryConsent,
  onClose,
  onDiscoveryConsentChange,
}: {
  open: boolean;
  locale: Locale;
  discoveryConsent: boolean;
  onClose: () => void;
  onDiscoveryConsentChange: (consent: boolean) => void;
}) {
  const zh = locale === "zh";
  const [deleteInput, setDeleteInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [referral, setReferral] = useState<ReferralState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/referral", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { referral?: ReferralState; error?: string };
        if (!response.ok || !body.referral) throw new Error(body.error || "Request failed");
        setReferral(body.referral);
      })
      .catch(() => setMessage(zh ? "邀请链接暂时没有生成，请稍后再打开。" : "Your invite link was not created. Please reopen this panel shortly."));
  }, [open, zh]);

  if (!open) return null;

  const deleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/vault", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Request failed");
      window.localStorage.clear();
      window.location.href = locale === "zh" ? "/" : "/en";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (zh ? "删除没有完成，请稍后重试。" : "Deletion did not finish. Please try again."));
      setBusy(false);
    }
  };

  const copyReferral = async () => {
    if (!referral) return;
    const path = locale === "zh" ? "/" : "/en";
    const link = `${window.location.origin}${path}?ref=${encodeURIComponent(referral.code)}&src=friend`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage(zh ? `请手动复制：${link}` : `Copy this link manually: ${link}`);
    }
  };

  return <div className="modal-shade" onMouseDown={onClose}>
    <section className="vault-panel account-data-panel" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label={zh ? "关闭" : "Close"}>×</button>
      <p className="detail-kicker">ACCOUNT · DATA CONTROLS</p>
      <h2>{zh ? "账号与数据" : "Account and data"}</h2>
      <div className="vault-connected">
        <span>◉</span>
        <div><strong>{zh ? "你已进入共同大世界" : "You are inside the shared world"}</strong><p>{zh ? "没有保险箱、恢复码或手动同步步骤。精确债务、收支和私人对话不会公开。" : "There is no vault, recovery code, or manual-sync step. Exact debts, cashflow, and private chats are not public."}</p></div>
      </div>
      <section className="referral-card">
        <header><div><span>✦</span><strong>{zh ? "邀请真实行者，一起点亮世界" : "Invite a real walker and light the world"}</strong></div>{referral && <code>{referral.code}</code>}</header>
        <p>{zh ? "朋友用你的专属链接注册，并至少真实录入一笔债务后才算激活。空账号不会发放奖励。" : "An invite activates only after your friend registers and truthfully adds at least one debt. Empty accounts earn no rewards."}</p>
        {!referral && <small>{zh ? "正在生成你的专属入口…" : "Creating your personal link…"}</small>}
        {referral && <>
          <div className="referral-rewards"><span><b>+{referral.rewards.inviterShoreValue}</b>{zh ? "上岸值" : "Shore"}</span><span><b>+{referral.rewards.inviterStarlight}</b>{zh ? "星光" : "Starlight"}</span><i>·</i><span><b>+{referral.rewards.invitedStarlight}</b>{zh ? "朋友欢迎星光" : "Friend welcome light"}</span></div>
          <div className="referral-stats"><span><strong>{referral.invited}</strong>{zh ? "已注册" : "registered"}</span><span><strong>{referral.activated}</strong>{zh ? "已激活" : "activated"}</span><span><strong>{referral.pending}</strong>{zh ? "待建档" : "pending"}</span></div>
          <button className="referral-copy" onClick={copyReferral}>{copied ? (zh ? "✓ 邀请链接已复制" : "✓ Invite link copied") : (zh ? "复制我的邀请链接" : "Copy my invite link")}</button>
        </>}
        <small>{zh ? "请只分享给愿意真实体验的人，不群发、不刷号；奖励不会改变任何真实欠款或信用信息。" : "Share only with people who genuinely want to try it—no spam or fake accounts. Rewards never change real debt or credit information."}</small>
      </section>
      <label className="discovery-consent">
        <input type="checkbox" checked={discoveryConsent} onChange={(event) => onDiscoveryConsentChange(event.target.checked)}/>
        <span><strong>{zh ? "帮助共同世界成长" : "Help the shared world grow"}</strong><p>{zh ? "允许自定义负债类型、大区和可选画像进入达到匿名门槛的群体统计。精确金额、昵称、收入和私人压力不会直接公开。" : "Allow custom debt types, broad region, and optional traits to enter group statistics only after anonymity thresholds are met. Exact amounts, alias, income, and private pressure are never directly published."}</p><small>{zh ? "你可以随时关闭。" : "You can turn this off at any time."}</small></span>
      </label>
      <div className="vault-actions account-data-actions">
        <a href="/api/vault?download=1" download>{zh ? "导出我的全部数据" : "Export all my data"}</a>
        <a href={zh ? "/safety#privacy" : "/en/safety#privacy"} target="_blank" rel="noreferrer">{zh ? "查看隐私与数据说明" : "Privacy and data notice"}</a>
      </div>
      <div className="danger-zone">
        <strong>{zh ? "永久删除账号与角色" : "Permanently delete account and character"}</strong>
        <p>{zh ? "输入 DELETE 后，账号、角色、债务、还款、反馈和投稿会一并删除，无法恢复。" : "Type DELETE to remove the account, character, debts, payments, feedback, and submissions. This cannot be undone."}</p>
        <input value={deleteInput} onChange={(event) => setDeleteInput(event.target.value)} placeholder="DELETE"/>
        <button disabled={busy || deleteInput !== "DELETE"} onClick={deleteAccount}>{busy ? (zh ? "正在删除…" : "Deleting…") : (zh ? "永久删除" : "Delete permanently")}</button>
      </div>
      {message && <p className="vault-error">{message}</p>}
    </section>
  </div>;
}
