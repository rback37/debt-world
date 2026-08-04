import type { Locale } from "@/lib/debt-world-types";

const copy = {
  zh: {
    kicker: "DEBT WORLD · PUBLIC BETA",
    title: "不是人均富豪的橱窗，而是一个真实前行的债务世界",
    lead: "上岸星球把房贷、信用卡、学贷、亲友借款和更多意想不到的压力，变成一个可以行走、观察和互相照亮的匿名世界。",
    enter: "进入共同大世界",
    language: "English",
    sections: [
      ["先把混乱说清楚", "与小岸对话，写下每笔债务、余额、利率、月还、收入与日常开销。系统把它们整理成个人画像和真实进度，但不会假装替你做持牌财务或法律决定。"],
      ["进度跟着现实改变", "真实还款、提前还款和额外收入记录会更新余额、铁链、背负物与脚下光效。游戏反馈帮助看见变化，但不会篡改真实债务或信用信息。"],
      ["看见别人也在负重", "共同世界只使用经过隐私保护的匿名汇总。你可以看到不同国家、债务类型和还款方法的趋势，也可以为真实故事送光、交流经验。"],
      ["世界会由数据长大", "当越来越多人写下新的负债原因，新的标签、社区与建筑会逐渐出现。产品希望成为一张不断生长的全球债务地图。"],
    ],
    debtTitle: "目前支持的债务入口",
    debts: ["房贷与住房贷款", "信用卡与循环信贷", "学生贷款与教育借款", "车贷", "消费分期", "医疗债务", "税务欠款", "经营与商业贷款", "亲友借款", "自定义未知类型"],
    faqTitle: "常见问题",
    faq: [
      ["需要真实姓名或邮箱吗？", "不需要。公开测试使用用户名和密码，角色昵称可以保持匿名。"],
      ["别人能看到我的精确金额吗？", "精确债务、收入、开销和私人 AI 对话默认不公开；共同世界展示经过限制的匿名信息与群体趋势。"],
      ["这是财务顾问、律师或债务减免服务吗？", "不是。这里提供信息整理、教育性支持和同伴经验；重要决定应向所在地区的合格专业人士核实。"],
      ["邀请奖励如何生效？", "朋友通过专属链接注册并至少真实录入一笔债务后，双方获得虚拟上岸值或星光。它们只改变世界视觉体验。"],
    ],
  },
  en: {
    kicker: "DEBT WORLD · PUBLIC BETA",
    title: "Not another highlight reel—a world for real debt journeys",
    lead: "Debt World turns mortgages, credit cards, student loans, money owed to friends, and unexpected financial pressure into an anonymous world people can walk through and illuminate together.",
    enter: "Enter the shared world",
    language: "中文",
    sections: [
      ["Turn confusion into a clear picture", "Talk with Kian about each balance, APR, monthly payment, income, and living cost. The system organizes them into a personal map and real progress without pretending to replace licensed financial or legal advice."],
      ["Progress changes with real life", "Confirmed payments, prepayments, and real extra income update balances, chains, burdens, and ground light. Game feedback makes change visible but never alters real debt or credit information."],
      ["See that others carry weight too", "The shared world uses privacy-protected anonymous aggregates. Explore patterns across countries, debt types, and repayment approaches, then send light to reviewed stories and exchange experience."],
      ["A world that grows from data", "As more people describe new reasons for debt, new labels, districts, and buildings can emerge. The long-term vision is a living global map of debt pressure and progress."],
    ],
    debtTitle: "Debt paths currently supported",
    debts: ["Mortgages and housing loans", "Credit cards and revolving credit", "Student and education loans", "Auto loans", "Consumer installment debt", "Medical debt", "Tax debt", "Business loans", "Money owed to friends or family", "Custom and emerging debt types"],
    faqTitle: "Frequently asked questions",
    faq: [
      ["Do I need a legal name or email?", "No. The public beta uses a username and password, while your character alias can remain anonymous."],
      ["Can others see my exact amounts?", "Exact debts, income, living costs, and private AI conversations are not public by default. The shared world uses limited anonymous information and group trends."],
      ["Is this a financial adviser, law firm, or debt-relief service?", "No. It provides organization, educational support, and peer experience. Verify important decisions with a qualified professional in your jurisdiction."],
      ["When do referral rewards activate?", "After a friend registers through your personal link and truthfully adds at least one debt, both people receive virtual Shore value or starlight. These affect only the world experience."],
    ],
  },
} as const;

export default function AboutPage({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const base = "https://www.debtworld.org";
  const faqJson = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faq.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) };
  const appJson = { "@context": "https://schema.org", "@type": "WebApplication", name: "Debt World", alternateName: "上岸星球", url: `${base}${locale === "zh" ? "/" : "/en"}`, applicationCategory: "FinanceApplication", operatingSystem: "Web", isAccessibleForFree: true, description: c.lead };
  return <main className="about-shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJson) }}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }}/>
    <nav><a href={locale === "zh" ? "/" : "/en"}>◒ Debt World</a><a href={locale === "zh" ? "/en/about" : "/about"}>{c.language}</a></nav>
    <header className="about-hero"><p>{c.kicker}</p><h1>{c.title}</h1><span>{c.lead}</span><a href={locale === "zh" ? "/" : "/en"}>{c.enter} →</a></header>
    <section className="about-principles">{c.sections.map(([title, body], index) => <article key={title}><b>0{index + 1}</b><h2>{title}</h2><p>{body}</p></article>)}</section>
    <section className="about-debts"><p>REAL-WORLD DEBT PATHS</p><h2>{c.debtTitle}</h2><div>{c.debts.map((debt) => <span key={debt}>{debt}</span>)}</div></section>
    <section className="about-faq"><p>PRIVACY · TRUST · BOUNDARIES</p><h2>{c.faqTitle}</h2>{c.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    <footer><a href={locale === "zh" ? "/safety" : "/en/safety"}>{locale === "zh" ? "隐私、社区规则与数据删除" : "Privacy, community rules, and data deletion"}</a><a href={locale === "zh" ? "/" : "/en"}>{c.enter} →</a></footer>
  </main>;
}
