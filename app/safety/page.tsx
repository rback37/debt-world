import type { Metadata } from "next";
import SafetyCenter from "../SafetyCenter";

export const metadata: Metadata = {
  title: "安全中心 — 上岸星球",
  description: "上岸星球的隐私说明、社区规则、数据删除和财务法律边界。",
  alternates: { canonical: "/safety", languages: { "zh-CN": "/safety", en: "/en/safety" } },
};

export default function SafetyPage() { return <SafetyCenter locale="zh"/>; }
