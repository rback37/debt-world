import type { Metadata } from "next";
import ContributePage from "../../ContributePage";

export const metadata: Metadata = {
  title: "Help build Debt World — no coding required",
  description: "Contribute a regional debt category, translation review, device test, privacy review, or a small code change to the anonymous global debt world.",
  alternates: { canonical: "/en/contribute", languages: { "zh-CN": "/contribute", en: "/en/contribute" } },
};

export default function Page() { return <ContributePage locale="en"/>; }
