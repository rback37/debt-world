"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { countryFlag } from "@/lib/country-currency";
import type { DebtKind, Locale } from "@/lib/debt-world-types";

type ModerationStatus = "pending" | "review" | "published" | "hidden" | "rejected";
type ModerationAction = "approve" | "reject" | "hide" | "restore";

type ModerationStory = {
  id: string;
  anonymousName: string;
  countryCode: string;
  debtKind: DebtKind;
  amountBand: string;
  currency: string;
  repaymentApproach: string;
  storyText: string;
  status: ModerationStatus;
  createdAt: string;
  openReportCount: number;
  encouragementCount: number;
};

type ModerationReport = {
  id: string;
  storyId: string;
  reason: string;
  details: string;
  createdAt: string;
  anonymousName: string;
  storyStatus: ModerationStatus;
};

type ModerationLog = {
  id: string;
  storyId: string;
  anonymousName: string;
  action: ModerationAction;
  fromStatus: ModerationStatus;
  toStatus: ModerationStatus;
  note: string;
  createdAt: string;
};

type Counts = Record<"pending" | "review" | "published" | "hidden" | "rejected" | "openReports", number>;

const emptyCounts: Counts = { pending: 0, review: 0, published: 0, hidden: 0, rejected: 0, openReports: 0 };
const kindNames: Record<DebtKind, Record<Locale, string>> = {
  mortgage: { zh: "房贷", en: "Mortgage" }, card: { zh: "信用卡", en: "Credit card" },
  education: { zh: "学贷", en: "Student loan" }, medical: { zh: "医疗债务", en: "Medical debt" },
  car: { zh: "车贷", en: "Vehicle loan" }, personal: { zh: "个人借款", en: "Personal loan" },
  business: { zh: "经营债务", en: "Business debt" }, bnpl: { zh: "消费分期", en: "BNPL" },
  informal: { zh: "亲友借款", en: "Family & friends" }, other: { zh: "其他负债", en: "Other debt" },
};
const reasonNames: Record<string, Record<Locale, string>> = {
  scam: { zh: "诈骗或收费引流", en: "Scam or solicitation" },
  harassment: { zh: "骚扰或攻击", en: "Harassment" },
  bad_advice: { zh: "危险或错误建议", en: "Unsafe advice" },
  identity_exposure: { zh: "身份暴露", en: "Identity exposure" },
  self_harm: { zh: "自伤风险", en: "Self-harm risk" },
  debt_collection: { zh: "催收或借贷引流", en: "Collection or lending solicitation" },
};

function dateText(value: string, locale: Locale) {
  return new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminCommunityPanel({ open, locale, onClose, onChanged }: { open: boolean; locale: Locale; onClose: () => void; onChanged: () => void }) {
  const [stories, setStories] = useState<ModerationStory[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [actions, setActions] = useState<ModerationLog[]>([]);
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [tab, setTab] = useState<"queue" | "reports" | "history">("queue");
  const [filter, setFilter] = useState<"all" | ModerationStatus>("all");
  const [decision, setDecision] = useState<{ storyId: string; action: "reject" | "hide" } | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/community", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json() as { stories?: ModerationStory[]; reports?: ModerationReport[]; actions?: ModerationLog[]; counts?: Counts; error?: string };
      if (!response.ok) throw new Error(data.error ?? "load");
      setStories(data.stories ?? []); setReports(data.reports ?? []); setActions(data.actions ?? []); setCounts(data.counts ?? emptyCounts);
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "load" ? error.message : (locale === "zh" ? "审核队列暂时无法读取。" : "The moderation queue could not load."));
    } finally { setLoading(false); }
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [open, load]);

  const visibleStories = useMemo(() => filter === "all" ? stories : stories.filter((story) => story.status === filter), [filter, stories]);
  if (!open) return null;

  const moderate = async (storyId: string, action: ModerationAction, actionNote = "") => {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/admin/community", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, action, note: actionNote }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "moderate");
      setDecision(null); setNote("");
      setMessage(locale === "zh" ? "审核决定已保存，地图与社区状态将同步更新。" : "The decision was saved and will sync to the world.");
      await load();
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error && error.message !== "moderate" ? error.message : (locale === "zh" ? "审核操作失败，请重试。" : "The moderation action failed."));
    } finally { setLoading(false); }
  };

  const submitDecision = (event: FormEvent) => {
    event.preventDefault();
    if (!decision || note.trim().length < 4) return;
    void moderate(decision.storyId, decision.action, note);
  };

  const statusLabel = (status: ModerationStatus) => locale === "zh"
    ? ({ pending: "待初审", review: "举报复审", published: "已公开", hidden: "已隐藏", rejected: "已拒绝" }[status])
    : ({ pending: "Pending", review: "Reported", published: "Published", hidden: "Hidden", rejected: "Rejected" }[status]);

  return <div className="modal-shade admin-shade" onMouseDown={onClose}>
    <section className="admin-community-panel" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={onClose}>×</button>
      <header className="admin-community-head"><span>⌁</span><div><p>{locale === "zh" ? "仅管理员可见" : "ADMIN ONLY"}</p><h2>{locale === "zh" ? "真实世界安全审核台" : "Real-world safety desk"}</h2><small>{locale === "zh" ? "只审核匿名公开内容，不展示精确债务、收入或私人对话。" : "Reviews anonymous public content only—never exact debts, income, or private conversations."}</small></div></header>
      <div className="admin-count-grid">
        <button onClick={() => { setTab("queue"); setFilter("pending"); }}><b>{counts.pending}</b><span>{locale === "zh" ? "待初审" : "Pending"}</span></button>
        <button onClick={() => { setTab("queue"); setFilter("review"); }}><b>{counts.review}</b><span>{locale === "zh" ? "举报复审" : "Reported"}</span></button>
        <button onClick={() => setTab("reports")}><b>{counts.openReports}</b><span>{locale === "zh" ? "未结举报" : "Open reports"}</span></button>
        <button onClick={() => { setTab("queue"); setFilter("published"); }}><b>{counts.published}</b><span>{locale === "zh" ? "已公开" : "Published"}</span></button>
      </div>
      <nav className="admin-tabs"><button className={tab === "queue" ? "active" : ""} onClick={() => setTab("queue")}>{locale === "zh" ? "审核队列" : "Queue"}</button><button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>{locale === "zh" ? "举报明细" : "Reports"}</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>{locale === "zh" ? "操作记录" : "Audit log"}</button></nav>

      {tab === "queue" && <div className="admin-queue">
        <div className="admin-filters">{(["all", "pending", "review", "hidden", "rejected"] as const).map((value) => <button className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}>{value === "all" ? (locale === "zh" ? "全部" : "All") : statusLabel(value)}</button>)}</div>
        {loading && !stories.length && <p className="admin-empty">{locale === "zh" ? "正在读取审核队列…" : "Loading moderation queue…"}</p>}
        {!loading && !visibleStories.length && <p className="admin-empty">{locale === "zh" ? "这个队列目前是空的。" : "This queue is empty."}</p>}
        {visibleStories.map((story) => <article className={`admin-story status-${story.status}`} key={story.id}>
          <div className="admin-story-meta"><span>{countryFlag(story.countryCode)}</span><div><strong>{story.anonymousName}</strong><small>{kindNames[story.debtKind]?.[locale] ?? kindNames.other[locale]} · {story.currency} {story.amountBand} · {dateText(story.createdAt, locale)}</small></div><i>{statusLabel(story.status)}</i></div>
          <p>“{story.storyText}”</p>
          <div className="admin-story-signals"><span>✦ {story.encouragementCount} {locale === "zh" ? "道光" : "lights"}</span><span className={story.openReportCount ? "danger" : ""}>⚑ {story.openReportCount} {locale === "zh" ? "条未结举报" : "open reports"}</span></div>
          <div className="admin-story-actions">
            {story.status !== "published" && <button className="approve" disabled={loading} onClick={() => void moderate(story.id, story.status === "pending" ? "approve" : "restore")}>{story.status === "pending" ? (locale === "zh" ? "✓ 批准进入世界" : "✓ Approve") : (locale === "zh" ? "↗ 恢复公开" : "↗ Restore")}</button>}
            {(story.status === "pending" || story.status === "review") && <button disabled={loading} onClick={() => { setDecision({ storyId: story.id, action: "reject" }); setNote(""); }}>{locale === "zh" ? "拒绝发布" : "Reject"}</button>}
            {story.status !== "hidden" && <button className="danger" disabled={loading} onClick={() => { setDecision({ storyId: story.id, action: "hide" }); setNote(""); }}>{locale === "zh" ? "隐藏内容" : "Hide"}</button>}
          </div>
          {decision?.storyId === story.id && <form className="admin-decision" onSubmit={submitDecision}><label>{locale === "zh" ? "填写简短审核原因（不会公开）" : "Short internal reason (not public)"}<textarea autoFocus minLength={4} maxLength={240} value={note} onChange={(event) => setNote(event.target.value)}/></label><div><button type="button" onClick={() => setDecision(null)}>{locale === "zh" ? "取消" : "Cancel"}</button><button disabled={note.trim().length < 4} type="submit">{locale === "zh" ? "确认决定" : "Confirm"}</button></div></form>}
        </article>)}
      </div>}

      {tab === "reports" && <div className="admin-report-list">{!reports.length ? <p className="admin-empty">{locale === "zh" ? "目前没有未处理举报。" : "There are no open reports."}</p> : reports.map((report) => <article key={report.id}><div><strong>⚑ {reasonNames[report.reason]?.[locale] ?? report.reason}</strong><i>{statusLabel(report.storyStatus)}</i></div><span>{report.anonymousName} · {dateText(report.createdAt, locale)}</span><p>{report.details || (locale === "zh" ? "举报者未补充说明。" : "No additional details.")}</p><button onClick={() => { setTab("queue"); setFilter(report.storyStatus); }}>{locale === "zh" ? "返回队列处理这个故事" : "Handle this story in queue"} →</button></article>)}</div>}

      {tab === "history" && <div className="admin-log-list">{!actions.length ? <p className="admin-empty">{locale === "zh" ? "还没有审核操作记录。" : "No moderation actions yet."}</p> : actions.map((action) => <article key={action.id}><b>{action.anonymousName}</b><span>{statusLabel(action.fromStatus)} → {statusLabel(action.toStatus)}</span><small>{dateText(action.createdAt, locale)}{action.note ? ` · ${action.note}` : ""}</small></article>)}</div>}
      {message && <p className="admin-message">{message}</p>}
    </section>
  </div>;
}
