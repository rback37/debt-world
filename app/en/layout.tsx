import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Debt World — A real-life debt simulation",
  description: "Walk through an anonymous debt world where conversation turns multiple debts, real due dates, and real repayments into a living journey.",
  alternates: {
    canonical: "/en",
    languages: {
      "zh-CN": "/",
      en: "/en",
    },
  },
};

export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
