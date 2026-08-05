import type { Metadata } from "next";
import SafetyCenter from "../../SafetyCenter";

export const metadata: Metadata = {
  title: "Safety Center — Debt World",
  description: "Debt World's privacy notice, community rules, deletion controls, and financial and legal boundaries.",
  alternates: { canonical: "/en/safety", languages: { "zh-CN": "/safety", en: "/en/safety" } },
};

export default function EnglishSafetyPage() { return <SafetyCenter locale="en"/>; }
