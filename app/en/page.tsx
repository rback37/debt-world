import type { Metadata } from "next";
import AccountGate from "../AccountGate";

export const metadata: Metadata = {
  title: "Debt World — A shared world for real repayment journeys",
  description: "Walk through an anonymous debt world, organize multiple debts with Kian, and keep balances, due dates, and repayment progress tied to real life.",
  alternates: { canonical: "/en", languages: { "zh-CN": "/", en: "/en" } },
  openGraph: { title: "Debt World", description: "See the financial pressure behind ordinary lives—and the real steps people take toward shore.", url: "/en" },
};

export default function EnglishHome() {
  return <AccountGate locale="en" />;
}
