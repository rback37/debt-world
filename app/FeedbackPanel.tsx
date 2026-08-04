"use client";

import { FormEvent, useState } from "react";
import type { CloudState, Locale } from "@/lib/debt-world-types";

const categoryLabels = {
  confusing: { zh: "有一步看不懂", en: "Something was confusing" },
  bug: { zh: "功能没有正常工作", en: "Something did not work" },
  helpful: { zh: "对我有帮助", en: "Something helped me" },
  missing: { zh: "缺少我需要的内容", en: "Something is missing" },
  safety: { zh: "让我感到不安全或不舒服", en: "Something felt unsafe" },
  other: { zh: "其他感受", en: "Something else" },
} as const;

export default function FeedbackPanel({
  open,
  locale,
  cloudState,
  onClose,
  onOpenVault,
}: {
  open: boolean;
  locale: Locale;
  cloudState: CloudState;
  onClose: () => void;
  onOpenVault: () => void;
}) {
  const [category, setCategory] = useState<keyof typeof categoryLabels>("confusing");
  const [rating, setRating] = useState(3);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  if (!open) return null;
  const zh = locale === "zh";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 12 || sending) return;
    setSending(true);
    setStatus("");
    try {
      const response = await fetch("/api/beta/feedback", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, rating, message, pagePath: window.location.pathname }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Feedback failed");
      setMessage("");
      setRating(3);
      setStatus(zh ? "谢谢，已经送到公开测试反馈台。我们不会把这段内容公开。" : "Thank you. It reached the private feedback desk for the public beta and will not be published.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : (zh ? "暂时没有送达，请稍后再试。" : "It did not arrive. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return <div className="modal-shade feedback-shade" onMouseDown={onClose}>
    <section className="feedback-panel" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label={zh ? "关闭" : "Close"}>×</button>
      <p className="detail-kicker">PUBLIC BETA · PRIVATE FEEDBACK</p>
      <h2>{zh ? "告诉我们哪里需要变好" : "Tell us what needs to improve"}</h2>
      <p>{zh ? "首批测试不是考试。看不懂、卡住、觉得不舒服，都比一句“挺好的”更有价值。请不要填写姓名、电话、邮箱、银行卡或密码。" : "This beta is not a test of you. Confusion, friction, and discomfort are more useful than a polite “looks good.” Do not include names, phone numbers, emails, bank details, or passwords."}</p>
      {cloudState !== "synced" ? <div className="feedback-vault-needed">
        <strong>{zh ? "正在重新连接大世界" : "Reconnecting the shared world"}</strong>
        <span>{zh ? "反馈需要匿名账号身份来限制刷屏；删除账号数据时反馈也会一起删除。" : "Feedback uses your anonymous account identity to limit spam and is removed when account data is deleted."}</span>
        <button onClick={onOpenVault}>{zh ? "刷新并重连" : "Refresh and reconnect"} →</button>
      </div> : <form onSubmit={submit}>
        <label>{zh ? "这次最想反馈什么？" : "What is this mainly about?"}
          <select value={category} onChange={(event) => setCategory(event.target.value as keyof typeof categoryLabels)}>
            {(Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map((value) => <option value={value} key={value}>{categoryLabels[value][locale]}</option>)}
          </select>
        </label>
        <fieldset><legend>{zh ? "这次体验总体几分？" : "How was this session overall?"}</legend><div className="feedback-rating">{[1,2,3,4,5].map((value) => <button type="button" className={rating === value ? "active" : ""} onClick={() => setRating(value)} key={value}>{value}<small>{value === 1 ? (zh ? "很难" : "Hard") : value === 5 ? (zh ? "很顺" : "Smooth") : ""}</small></button>)}</div></fieldset>
        <label>{zh ? "发生了什么？你原本希望怎样？" : "What happened, and what did you expect?"}
          <textarea minLength={12} maxLength={1200} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={zh ? "例如：我不知道“最低还款”和“每月还款”的区别，希望旁边有一个例子……" : "For example: I could not tell the difference between minimum and monthly payment; an example would help…"}/>
          <small>{message.length}/1200</small>
        </label>
        <button className="feedback-submit" disabled={sending || message.trim().length < 12}>{sending ? (zh ? "正在送达…" : "Sending…") : (zh ? "发送私测反馈" : "Send private feedback")} →</button>
      </form>}
      {status && <p className="feedback-status" role="status">⌁ {status}</p>}
    </section>
  </div>;
}
