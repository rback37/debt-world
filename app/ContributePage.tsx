import type { Locale } from "@/lib/debt-world-types";

const repoUrl = "https://github.com/rback37/debt-world";
const issuesUrl = `${repoUrl}/issues`;
const discussionsUrl = `${repoUrl}/discussions`;

export default function ContributePage({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const home = zh ? "/" : "/en";
  const languagePath = zh ? "/en/contribute" : "/contribute";

  const tracks = [
    {
      number: "01",
      icon: "◎",
      title: zh ? "补上一块真实世界" : "Add one missing piece",
      body: zh ? "告诉我们你的国家还缺什么债务类型、货币表达或真实使用场景。不要提交姓名、账号或精确个人金额。" : "Tell us which debt type, currency convention, or real-life situation is missing in your country—without names, account details, or exact personal amounts.",
      action: zh ? "提交地区与分类建议" : "Suggest a regional category",
      href: `${repoUrl}/issues/new?template=translation_review.yml`,
      tag: zh ? "无需写代码" : "NO CODE",
    },
    {
      number: "02",
      icon: "文",
      title: zh ? "让一种语言真正自然" : "Make one language feel native",
      body: zh ? "校对一小组界面短句，指出羞辱性、机器味或当地难以理解的表达。先从 10–25 句话开始。" : "Review a small set of interface strings and flag shaming, robotic, or locally confusing language. Start with just 10–25 lines.",
      action: zh ? "认领一次翻译校对" : "Claim a translation review",
      href: `${repoUrl}/issues/new?template=translation_review.yml`,
      tag: zh ? "10–30 分钟" : "10–30 MIN",
    },
    {
      number: "03",
      icon: "▣",
      title: zh ? "测试一台真实设备" : "Test one real device",
      body: zh ? "用手机、小屏幕、键盘或慢网走一次注册和建档流程，提交可复现步骤和隐私安全的截图。" : "Walk through signup and onboarding on a phone, small screen, keyboard, or slow connection. Share reproducible steps and privacy-safe screenshots.",
      action: zh ? "提交体验问题" : "Report an experience problem",
      href: `${repoUrl}/issues/new?template=bug_report.yml`,
      tag: zh ? "产品测试" : "PRODUCT TEST",
    },
    {
      number: "04",
      icon: "{ }",
      title: zh ? "领取一个可完成的代码任务" : "Take one finishable code task",
      body: zh ? "从 good first issue 开始。每个任务都应写清范围、验收方式和不能触碰的隐私边界。" : "Start with a good first issue. Each task should define scope, acceptance checks, and the privacy boundaries that must not be crossed.",
      action: zh ? "查看可领取任务" : "Browse claimable tasks",
      href: `${issuesUrl}?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`,
      tag: "GITHUB",
    },
  ];

  const stages = zh
    ? ["提交一个小而具体的建议", "自动排除身份与敏感数据", "维护者确认范围与安全边界", "通过测试与审核后合并", "在构建日志和世界中留下贡献痕迹"]
    : ["Submit one small, concrete proposal", "Keep identity and sensitive data out", "Maintainers confirm scope and safety", "Merge after tests and review", "Credit the contribution in the build log and world"];

  return <main className="contribute-page">
    <header className="contribute-nav">
      <a href={home}>← {zh ? "返回上岸星球" : "Back to Debt World"}</a>
      <div><a href={repoUrl} target="_blank" rel="noreferrer">GitHub ↗</a><a href={languagePath}>{zh ? "EN" : "中文"}</a></div>
    </header>

    <section className="contribute-hero">
      <div className="contribute-copy">
        <p>BUILD DEBT WORLD · OPEN COMMUNITY</p>
        <h1>{zh ? <>你不必会写代码，<em>也能建造这个世界。</em></> : <>You do not need to code <em>to build this world.</em></>}</h1>
        <span>{zh ? "补充一个国家的债务类型、校对十句话、测试一台手机，或者修复一个小问题——每一块真实而安全的拼图，都能让这个世界更接近普通人的生活。" : "Add a debt type from your country, review ten lines, test one phone, or fix one small issue. Every safe, real piece moves the world closer to ordinary life."}</span>
        <div className="contribute-hero-actions"><a href="#choose-a-brick">{zh ? "选择一块砖" : "Choose one brick"} ↓</a><a className="secondary" href={discussionsUrl} target="_blank" rel="noreferrer">{zh ? "加入公开讨论" : "Join the discussion"} ↗</a></div>
        <small>{zh ? "开源许可：AGPL-3.0 · 生产数据、密钥和管理员权限永远不属于公开贡献范围。" : "Open-source license: AGPL-3.0. Production data, secrets, and admin access are never part of public contributions."}</small>
      </div>
      <div className="builder-world" aria-label={zh ? "由不同贡献逐步生长的世界示意" : "Illustration of a world growing from different contributions"}>
        <span className="builder-orbit orbit-a"/><span className="builder-orbit orbit-b"/>
        <div className="builder-planet"><b>DEBT<br/>WORLD</b><i>✦</i></div>
        <article className="builder-piece piece-language"><b>文</b><span>{zh ? "语言" : "LANGUAGE"}</span></article>
        <article className="builder-piece piece-country"><b>◎</b><span>{zh ? "地区" : "REGION"}</span></article>
        <article className="builder-piece piece-test"><b>▣</b><span>{zh ? "测试" : "TEST"}</span></article>
        <article className="builder-piece piece-code"><b>{"{ }"}</b><span>{zh ? "代码" : "CODE"}</span></article>
        <p>{zh ? "每一种贡献，都是世界里的一块砖。" : "Every contribution is one brick in the world."}</p>
      </div>
    </section>

    <section className="contribute-tracks" id="choose-a-brick">
      <header><p>CHOOSE ONE BRICK</p><h2>{zh ? "第一次只做一件小事" : "Do one small thing first"}</h2><span>{zh ? "不要求长期承诺。选择最接近你经验的一项，完成后再决定是否继续。" : "No long-term commitment required. Pick the task closest to your experience, then decide whether to continue."}</span></header>
      <div className="contribute-track-grid">{tracks.map((track) => <article key={track.number}>
        <div><span>{track.number}</span><b>{track.tag}</b></div><i>{track.icon}</i><h3>{track.title}</h3><p>{track.body}</p><a href={track.href} target="_blank" rel="noreferrer">{track.action} →</a>
      </article>)}</div>
    </section>

    <section className="contribute-growth">
      <div className="contribute-section-title"><span>05</span><div><p>FROM SIGNAL TO WORLD</p><h2>{zh ? "贡献怎样真正进入上岸星球" : "How a contribution reaches Debt World"}</h2></div></div>
      <ol>{stages.map((stage, index) => <li key={stage}><b>{String(index + 1).padStart(2, "0")}</b><span>{stage}</span></li>)}</ol>
      <aside><strong>{zh ? "数据长出建筑，但不会暴露个人。" : "Data can grow a building without exposing a person."}</strong><p>{zh ? "新债务分类必须达到不同用户、不同地区和隐私阈值，再经过人工审核。精确金额、昵称和私人描述不会成为公开建筑材料。" : "A new debt category must meet cross-user, cross-region, and privacy thresholds before human review. Exact amounts, aliases, and private descriptions never become public building material."}</p></aside>
    </section>

    <section className="contribute-boundary">
      <div><p>SAFETY BEFORE GROWTH</p><h2>{zh ? "这些内容不能进入公开仓库" : "These never belong in the public repository"}</h2></div>
      <ul><li>{zh ? "真实姓名、邮箱、电话、地址或债权账号" : "Names, emails, phone numbers, addresses, or creditor accounts"}</li><li>{zh ? "精确个人债务、收入、账单或银行资料" : "Exact personal debts, income, statements, or bank information"}</li><li>{zh ? "密码、恢复信息、密钥或可利用的安全细节" : "Passwords, recovery information, secrets, or exploitable security details"}</li><li>{zh ? "私人小岸对话或未经授权的真实故事" : "Private Kian conversations or unauthorized real stories"}</li></ul>
      <a href={zh ? "/safety" : "/en/safety"}>{zh ? "阅读隐私与社区规则" : "Read privacy and community rules"} →</a>
    </section>

    <section className="contribute-callout">
      <span>✦</span><div><p>FOUNDING BUILDERS</p><h2>{zh ? "先帮助一个屏幕、一种语言或一个国家。" : "Start with one screen, one language, or one country."}</h2><small>{zh ? "贡献被采纳后，可选择使用 GitHub 名称或匿名代号出现在构建日志；贡献者不会获得任何用户私人数据访问权。" : "Accepted contributors may choose a GitHub name or anonymous credit in the build log. Contribution never grants access to private user data."}</small></div><a href={issuesUrl} target="_blank" rel="noreferrer">{zh ? "进入共建任务板" : "Open the builder board"} ↗</a>
    </section>

    <footer className="contribute-footer"><strong>上岸星球 · DEBT WORLD</strong><span>{zh ? "不是每个人都光鲜，也不是每个人都必须独自承受。" : "Not everyone is thriving, and nobody should have to carry everything alone."}</span><a href={home}>{zh ? "进入世界" : "Enter the world"} →</a></footer>
  </main>;
}
