import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og-beta.png`;

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: "上岸星球 Debt World — 让债务进度在真实世界里发生",
    description: "一个可以行走的匿名债务世界。通过对话拆解多笔负债，让还款日、余额与小人进度跟随真实生活变化。",
    applicationName: "上岸星球 Debt World",
    keywords: ["债务管理", "还款进度", "匿名债务社区", "debt tracker", "debt community", "repayment progress"],
    authors: [{ name: "Debt World" }],
    creator: "Debt World",
    category: "personal finance education",
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      title: "上岸星球 Debt World",
      description: "把压力说出来，让进度在真实世界里发生。",
      type: "website",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "上岸星球 Debt World — 看见真实压力，也看见正在前进的人" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "上岸星球 Debt World",
      description: "把压力说出来，让进度在真实世界里发生。",
      images: [socialImage],
    },
    icons: {
      icon: "/favicon.svg",
    },
    alternates: {
      canonical: "/",
      languages: {
        "zh-CN": "/",
        en: "/en",
      },
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
