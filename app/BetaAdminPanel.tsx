"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/debt-world-types";

type BetaState = {
  config: { signupsEnabled: boolean; inviteRequired: boolean; inviteConfigured: boolean; maxUses: number; dailySignupLimit: number; signupsToday: number };
  counts: { vaults: number; enrolled: number; openFeedback: number; inviteUses: number; inviteLimit: number };
  feedback: Array<{ id: string; category: string; rating: number; message: string; pagePath: string; status: string; createdAt: string }>;
};

async function readBetaState() {
  const response = await fetch("/api/admin/beta", { credentials: "same-origin", cache: "no-store" });
  const next = await response.json() as BetaState & { error?: string };
  if (!response.ok || !next.config) throw new Error(next.error ?? "Beta desk unavailable");
  return next;
}

export default function BetaAdminPanel({ open, locale, onClose }: { open: boolean; locale: Locale; onClose: () => void }) {
  const [data, setData] = useState<BetaState | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const zh = locale === "zh";

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      setData(await readBetaState());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (zh ? "私测台暂时不可用。" : "The beta desk is unavailable."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void readBetaState()
      .then((next) => { if (!cancelled) setData(next); })
      .catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "Beta desk unavailable"); });
    return () => { cancelled = true; };
  }, [open]);
  if (!open) return null;

  const act = async (payload: Record<string, unknown>) => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/beta", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const next = await response.json() as BetaState & { error?: string };
      if (!response.ok || !next.config) throw new Error(next.error ?? "Action failed");
      setData(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (zh ? "操作没有完成。" : "The action did not finish."));
    } finally {
      setLoading(false);
    }
  };

  return <div className="modal-shade beta-admin-shade" onMouseDown={onClose}>
    <section className="beta-admin-panel" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={onClose}>×</button>
      <header><span>β</span><div><p>{zh ? "仅管理员可见" : "ADMIN ONLY"}</p><h2>{zh ? "公开测试运营台" : "Public-beta operations"}</h2><small>{zh ? "查看每日注册与反馈，必要时一键暂停新用户；不会显示债务金额或私人 AI 对话。" : "Track daily registrations and feedback, and pause signups when needed. Exact debts and private AI chats never appear here."}</small></div></header>
      {data && <>
        <div className="beta-admin-counts">
          <div><b>{data.config.signupsToday}/{data.config.dailySignupLimit}</b><span>{zh ? "今日注册" : "TODAY'S SIGNUPS"}</span></div>
          <div><b>{data.counts.enrolled}</b><span>{zh ? "已登记测试者" : "ENROLLED"}</span></div>
          <div><b>{data.counts.vaults}</b><span>{zh ? "共同世界角色" : "SHARED-WORLD CHARACTERS"}</span></div>
          <div><b>{data.counts.openFeedback}</b><span>{zh ? "待处理反馈" : "OPEN FEEDBACK"}</span></div>
        </div>
        <div className={`beta-signup-control ${data.config.signupsEnabled ? "enabled" : "paused"}`}>
          <div><strong>{data.config.signupsEnabled ? (zh ? "公开测试正在接收新用户" : "Public-beta registration is open") : (zh ? "当前已暂停新增用户" : "New signups are paused")}</strong><span>{data.config.inviteRequired ? (zh ? "邀请码校验仍在启用" : "Invitation validation is active") : (zh ? "无需邀请码，真人验证继续生效" : "No invitation code; human verification stays active")}</span></div>
          <button disabled={loading} onClick={() => act({ action: "set_signups", enabled: !data.config.signupsEnabled })}>{data.config.signupsEnabled ? (zh ? "暂停新增" : "Pause signups") : (zh ? "恢复新增" : "Resume signups")}</button>
        </div>
        <section className="beta-feedback-queue">
          <div><strong>{zh ? "最近反馈" : "Recent feedback"}</strong><button disabled={loading} onClick={load}>{zh ? "刷新" : "Refresh"}</button></div>
          {!data.feedback.length && <p>{zh ? "还没有收到反馈。" : "No feedback yet."}</p>}
          {data.feedback.map((item) => <article className={item.status === "resolved" ? "resolved" : ""} key={item.id}>
            <header><b>{"★".repeat(item.rating)}{"☆".repeat(5-item.rating)}</b><span>{item.category} · {new Date(item.createdAt).toLocaleDateString(zh ? "zh-CN" : "en-US")}</span></header>
            <p>{item.message}</p><small>{item.pagePath}</small>
            {item.status === "open" ? <button disabled={loading} onClick={() => act({ action: "resolve_feedback", feedbackId: item.id })}>{zh ? "标记已处理" : "Mark resolved"}</button> : <em>{zh ? "已处理" : "Resolved"}</em>}
          </article>)}
        </section>
      </>}
      {loading && !data && <p className="beta-admin-empty">{zh ? "正在读取私测状态…" : "Loading beta status…"}</p>}
      {message && <p className="admin-message">{message}</p>}
    </section>
  </div>;
}
