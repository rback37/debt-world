import type { Metadata } from "next";
import AboutPage from "../AboutPage";

export const metadata: Metadata = {
  title: "上岸星球是什么 — 真实、匿名、共同生长的债务世界",
  description: "了解上岸星球如何整理房贷、信用卡、学贷与更多债务，让还款进度跟随现实，并通过匿名数据形成全球债务地图。",
  alternates: { canonical: "/about", languages: { "zh-CN": "/about", en: "/en/about" } },
};

export default function Page() { return <AboutPage locale="zh"/>; }
