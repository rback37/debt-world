import type { Metadata } from "next";
import ContributePage from "../ContributePage";

export const metadata: Metadata = {
  title: "参与共建上岸星球 — 不会写代码也可以",
  description: "通过地区债务分类、翻译校对、手机测试、隐私审核或代码贡献，共同建造真实、匿名、安全的全球债务世界。",
  alternates: { canonical: "/contribute", languages: { "zh-CN": "/contribute", en: "/en/contribute" } },
};

export default function Page() { return <ContributePage locale="zh"/>; }
