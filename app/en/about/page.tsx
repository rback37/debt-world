import type { Metadata } from "next";
import AboutPage from "../../AboutPage";

export const metadata: Metadata = {
  title: "What is Debt World? — A real, anonymous world of debt journeys",
  description: "Learn how Debt World organizes mortgages, cards, student loans, and emerging debts, ties progress to real life, and grows an anonymous global debt map.",
  alternates: { canonical: "/en/about", languages: { "zh-CN": "/about", en: "/en/about" } },
};

export default function Page() { return <AboutPage locale="en"/>; }
