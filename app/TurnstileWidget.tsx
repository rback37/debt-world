"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-debt-world-turnstile]");
    const script = existing ?? document.createElement("script");
    const handleLoad = () => resolve();
    const handleError = () => reject(new Error("Turnstile failed to load"));
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    if (!existing) {
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.debtWorldTurnstile = "true";
      document.head.appendChild(script);
    }
  });
  return scriptPromise;
}

export default function TurnstileWidget({
  siteKey,
  action,
  locale,
  resetKey,
  onToken,
}: {
  siteKey: string;
  action: string;
  locale: "zh" | "en";
  resetKey: number;
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "verified" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        setStatus("ready");
        widgetRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "light",
          size: "flexible",
          appearance: "always",
          callback: (token: string) => { setStatus("verified"); onToken(token); },
          "expired-callback": () => { setStatus("ready"); onToken(""); },
          "error-callback": () => { setStatus("failed"); onToken(""); },
        });
      })
      .catch(() => setStatus("failed"));
    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [action, onToken, siteKey]);

  useEffect(() => {
    if (widgetRef.current && window.turnstile) window.turnstile.reset(widgetRef.current);
    onToken("");
  }, [onToken, resetKey]);

  return <div className="turnstile-wrap">
    <div ref={containerRef}/>
    <p className={`turnstile-${status}`}>
      {status === "verified"
        ? (locale === "zh" ? "✓ 真人验证已完成，现在可以注册。" : "✓ Human verification complete. You can create your account now.")
        : status === "failed"
          ? (locale === "zh" ? "真人验证没有加载成功，请检查网络或关闭拦截插件后刷新页面。" : "Human verification did not load. Check your connection or content blocker, then refresh.")
          : status === "ready"
            ? (locale === "zh" ? "请完成上方真人验证，完成后注册按钮会自动亮起。" : "Complete the check above; the create-account button will enable automatically.")
            : (locale === "zh" ? "正在加载真人验证…" : "Loading human verification…")}
    </p>
  </div>;
}
