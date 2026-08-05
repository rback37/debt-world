"use client";

import { useEffect, useState } from "react";
import type {
  CloudState,
  Debt,
  Locale,
  Position,
  Profile,
  VaultPayload,
} from "@/lib/debt-world-types";

type Props = {
  open: boolean;
  locale: Locale;
  cloudState: CloudState;
  debts: Debt[];
  profile: Profile;
  position: Position;
  discoveryConsent: boolean;
  onClose: () => void;
  onStateChange: (state: CloudState) => void;
  onDiscoveryConsentChange: (consent: boolean) => void;
  onRestore: (vault: VaultPayload) => void;
  onDeleted: () => void;
};

const copy = {
  zh: {
    title: "匿名云端保险箱",
    localTitle: "让角色在不同设备上继续前进",
    localBody: "登录账号后仍可先在本机整理；主动创建保险箱后，昵称、国家、可选画像、收支、计划和债务才会同步。无需邮箱或手机号。",
    create: "创建并上传当前记录",
    recoverTitle: "已有恢复码？",
    recoverPlaceholder: "DW-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX",
    recover: "恢复我的角色",
    synced: "这台设备已连接匿名云端保险箱",
    syncedBody: "服务器只保存恢复码的不可逆摘要。恢复码本身就是钥匙，请不要截图公开或发送给任何人。",
    freshTitle: "现在保存恢复码",
    freshBody: "它只在此刻完整显示。建议保存在自己的密码管理器里；任何拿到它的人都能读取你的记录。",
    copy: "复制恢复码",
    copied: "已复制",
    rotate: "生成新的恢复码",
    rotateWarning: "生成后，旧恢复码立即失效。",
    export: "导出我的全部数据",
    exportLocal: "导出这台设备的数据",
    deleteTitle: "彻底删除保险箱",
    deleteBody: "输入 DELETE 后，云端角色、债务和还款记录会永久删除。",
    delete: "永久删除",
    close: "关闭",
    working: "正在处理…",
    retry: "重新检查连接",
    discoveryTitle: "参与世界成长（可随时关闭）",
    discoveryBody: "允许自定义负债名称、大区和可选 MBTI 进入匿名群体统计与新社区候选。准确金额、月收入、私人压力、计划和昵称不会直接公开；画像统计必须达到至少 30 人、每组至少 5 人。",
    discoveryOff: "默认关闭，不影响云端保存和还款记录。",
    error: "没有完成，请检查网络后重试。",
    inviteTitle: "首批真实用户邀请码",
    inviteBody: "邀请码只控制谁能创建新的匿名保险箱，不会关联真实姓名。每个名额都有总量上限，避免地址外传后产生失控成本。",
    invitePlaceholder: "例如 SHORE-XXXX-XXXX",
    betaConsent: "我知道这是早期私测：数据来自本人填写，AI 只提供教育性整理；遇到法律、财务、医疗或紧急安全问题，我会另行联系当地合格专业人士或官方服务。",
    signupsPaused: "公开测试已暂停新增，但已有恢复码仍可正常恢复。",
  },
  en: {
    title: "Anonymous cloud vault",
    localTitle: "Continue your person on another device",
    localBody: "After account sign-in, you may still organize locally. Alias, country, optional profile, cashflow, plans, and debts sync only after you create a vault. No email or phone number is required.",
    create: "Create vault and upload current records",
    recoverTitle: "Already have a recovery code?",
    recoverPlaceholder: "DW-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX",
    recover: "Recover my person",
    synced: "This device is connected to an anonymous cloud vault",
    syncedBody: "The server stores only a one-way hash of the recovery code. The code itself is your key. Never post or send it to anyone.",
    freshTitle: "Save this recovery code now",
    freshBody: "It is shown in full only now. Store it in your password manager. Anyone with it can read your records.",
    copy: "Copy recovery code",
    copied: "Copied",
    rotate: "Generate a new recovery code",
    rotateWarning: "The old code stops working immediately.",
    export: "Export all my data",
    exportLocal: "Export this device's data",
    deleteTitle: "Permanently delete vault",
    deleteBody: "Type DELETE to permanently remove the cloud person, debts, and payment history.",
    delete: "Delete permanently",
    close: "Close",
    working: "Working…",
    retry: "Check connection again",
    discoveryTitle: "Help the world grow (optional)",
    discoveryBody: "Allow custom debt labels, broad region, and optional MBTI to enter anonymous group statistics and community candidates. Exact amounts, income, private pressure, plans, and aliases are never directly published; profile aggregates require at least 30 people and 5 per group.",
    discoveryOff: "Off by default. Cloud backup and payment tracking work either way.",
    error: "That did not finish. Check your connection and try again.",
    inviteTitle: "First-wave invitation code",
    inviteBody: "The code controls who can create a new anonymous vault and is not linked to a legal identity. The round has a hard place limit to contain cost if the URL is forwarded.",
    invitePlaceholder: "For example SHORE-XXXX-XXXX",
    betaConsent: "I understand this is an early beta: records are self-reported and AI provides educational organization only. I will use qualified local or official help for legal, financial, medical, or immediate-safety needs.",
    signupsPaused: "Public-beta registration is paused, but existing recovery codes still work.",
  },
};

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({})) as {
    error?: string;
    recoveryCode?: string;
    vault?: VaultPayload;
  };
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function VaultPanel({
  open,
  locale,
  cloudState,
  debts,
  profile,
  position,
  discoveryConsent,
  onClose,
  onStateChange,
  onDiscoveryConsentChange,
  onRestore,
  onDeleted,
}: Props) {
  const t = copy[locale];
  const [recoveryInput, setRecoveryInput] = useState("");
  const [freshCode, setFreshCode] = useState("");
  const [deleteInput, setDeleteInput] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [betaConsent, setBetaConsent] = useState(false);
  const [betaState, setBetaState] = useState<{ signupsEnabled: boolean; inviteRequired: boolean; ready: boolean } | null>(null);
  const busy = cloudState === "syncing" || cloudState === "checking";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch("/api/beta", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (!cancelled) setBetaState(data); })
      .catch(() => { if (!cancelled) setBetaState(null); });
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  const createVault = async () => {
    onStateChange("syncing");
    setMessage("");
    try {
      const data = await readJson(await fetch("/api/vault", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          profile,
          position,
          locale,
          debts,
          discoveryConsent,
          inviteCode,
          betaConsent,
        }),
      }));
      if (!data.vault || !data.recoveryCode) throw new Error("Missing vault response");
      setFreshCode(data.recoveryCode);
      onRestore(data.vault);
      onStateChange("synced");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.error);
      onStateChange("error");
    }
  };

  const recoverVault = async () => {
    if (!recoveryInput.trim()) return;
    onStateChange("syncing");
    setMessage("");
    try {
      const data = await readJson(await fetch("/api/vault", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recover", recoveryCode: recoveryInput }),
      }));
      if (!data.vault) throw new Error("Missing vault response");
      onRestore(data.vault);
      setRecoveryInput("");
      onStateChange("synced");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.error);
      onStateChange("local");
    }
  };

  const rotateCode = async () => {
    onStateChange("syncing");
    setMessage("");
    try {
      const data = await readJson(await fetch("/api/vault", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate" }),
      }));
      if (!data.recoveryCode) throw new Error("Missing recovery code");
      setFreshCode(data.recoveryCode);
      onStateChange("synced");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.error);
      onStateChange("error");
    }
  };

  const retry = async () => {
    onStateChange("checking");
    setMessage("");
    try {
      const update = await fetch("/api/vault", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, position, locale, discoveryConsent }),
      });
      if (!update.ok && update.status !== 401) {
        await readJson(update);
      }
      const data = await readJson(await fetch("/api/vault", {
        credentials: "same-origin",
        cache: "no-store",
      }));
      if (!data.vault) throw new Error("Missing vault response");
      onRestore(data.vault);
      onStateChange("synced");
    } catch {
      onStateChange("local");
    }
  };

  const exportLocal = () => {
    const blob = new Blob([
      JSON.stringify({ exportedAt: new Date().toISOString(), profile, position, debts, discoveryConsent }, null, 2),
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "debt-world-local-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const deleteVault = async () => {
    if (deleteInput !== "DELETE") return;
    onStateChange("syncing");
    setMessage("");
    try {
      await readJson(await fetch("/api/vault", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      }));
      setFreshCode("");
      setDeleteInput("");
      onDeleted();
      onStateChange("local");
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.error);
      onStateChange("error");
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(freshCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="modal-shade" onMouseDown={onClose}>
      <section className="vault-panel" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label={t.close}>×</button>
        <p className="detail-kicker">CLOUD VAULT · PUBLIC BETA</p>
        <h2>{t.title}</h2>

        <label className="discovery-consent">
          <input
            type="checkbox"
            checked={discoveryConsent}
            onChange={(event) => onDiscoveryConsentChange(event.target.checked)}
          />
          <span><strong>{t.discoveryTitle}</strong><p>{t.discoveryBody}</p><small>{t.discoveryOff}</small></span>
        </label>
        <a className="vault-safety-link" href={locale === "zh" ? "/safety#privacy" : "/en/safety#privacy"} target="_blank" rel="noreferrer">◇ {locale === "zh" ? "查看完整隐私说明、数据权利与删除流程" : "Read the full privacy notice, data controls, and deletion flow"} ↗</a>

        {cloudState !== "synced" && !freshCode ? (
          <>
            <div className="vault-intro">
              <strong>{t.localTitle}</strong>
              <p>{t.localBody}</p>
            </div>
            {betaState?.inviteRequired && <div className="beta-invite-entry">
              <strong>{t.inviteTitle}</strong>
              <p>{t.inviteBody}</p>
              <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder={t.invitePlaceholder} autoCapitalize="characters" autoComplete="off"/>
              <label><input type="checkbox" checked={betaConsent} onChange={(event) => setBetaConsent(event.target.checked)}/><span>{t.betaConsent}</span></label>
            </div>}
            {betaState && !betaState.signupsEnabled && <p className="beta-signups-paused">⌁ {t.signupsPaused}</p>}
            <button className="vault-primary" disabled={busy || betaState?.signupsEnabled === false || Boolean(betaState?.inviteRequired && (!inviteCode.trim() || !betaConsent || !betaState.ready))} onClick={createVault}>
              {busy ? t.working : t.create}
            </button>
            <div className="vault-divider"><span>{t.recoverTitle}</span></div>
            <label className="vault-code-input">
              <input
                value={recoveryInput}
                onChange={(event) => setRecoveryInput(event.target.value)}
                placeholder={t.recoverPlaceholder}
                autoCapitalize="characters"
                autoComplete="off"
              />
            </label>
            <button className="vault-secondary" disabled={busy || !recoveryInput.trim()} onClick={recoverVault}>
              {t.recover}
            </button>
            <button className="vault-text-button" onClick={exportLocal}>{t.exportLocal}</button>
            {cloudState === "error" && <button className="vault-text-button" onClick={retry}>{t.retry}</button>}
          </>
        ) : (
          <>
            <div className="vault-connected">
              <span>✓</span>
              <div><strong>{t.synced}</strong><p>{t.syncedBody}</p></div>
            </div>
            {freshCode && (
              <div className="recovery-card">
                <strong>{t.freshTitle}</strong>
                <p>{t.freshBody}</p>
                <code>{freshCode}</code>
                <button onClick={copyCode}>{copied ? t.copied : t.copy}</button>
              </div>
            )}
            <div className="vault-actions">
              <a href="/api/vault?download=1" download>{t.export}</a>
              <button disabled={busy} onClick={rotateCode}>{t.rotate}</button>
              <small>{t.rotateWarning}</small>
            </div>
            <div className="danger-zone">
              <strong>{t.deleteTitle}</strong>
              <p>{t.deleteBody}</p>
              <input value={deleteInput} onChange={(event) => setDeleteInput(event.target.value)} placeholder="DELETE" />
              <button disabled={busy || deleteInput !== "DELETE"} onClick={deleteVault}>{t.delete}</button>
            </div>
          </>
        )}

        {message && <p className="vault-error">{message}</p>}
      </section>
    </div>
  );
}
