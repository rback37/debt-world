import { SAFETY_POLICY_VERSION, safetySources } from "@/lib/safety-policy";
import type { Locale } from "@/lib/debt-world-types";

export default function SafetyCenter({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return <main className="safety-page">
    <header className="safety-nav">
      <a href={zh ? "/" : "/en"}>← {zh ? "返回上岸星球" : "Back to Debt World"}</a>
      <div><span>{zh ? "规则版本" : "POLICY VERSION"} {SAFETY_POLICY_VERSION}</span><a href={zh ? "/en/safety" : "/safety"}>{zh ? "EN" : "中文"}</a></div>
    </header>

    <section className="safety-hero">
      <p>SAFETY CENTER · PUBLIC BETA</p>
      <h1>{zh ? "你的债务不应成为你的身份。" : "Your debt should never become your identity."}</h1>
      <span>{zh ? "这里说清数据怎么流动、什么能公开、什么永远不该公开，以及你如何带走或删除自己的记录。" : "This page explains how data moves, what may become public, what must remain private, and how you can take or delete your records."}</span>
      <div className="safety-hero-note"><b>!</b><p>{zh ? "当前是面向成年用户的公开测试版，仍在持续改进。这些是可执行的产品规则和透明说明，不是对全球法律合规的自动保证；扩大地区与服务范围前仍需法律复核。" : "This is an evolving public beta for adults. These are enforceable product rules and transparency notes, not an automatic claim of compliance with every country's law; legal review remains required as regions and services expand."}</p></div>
    </section>

    <section className="safety-principles">
      <article><b>⌁</b><strong>{zh ? "默认私密" : "Private by default"}</strong><span>{zh ? "用户名用于登录；角色昵称、精确债务和私人对话默认不公开。" : "The username is for sign-in; character alias, exact debts, and private chats are not public by default."}</span></article>
      <article><b>◎</b><strong>{zh ? "公开要二次选择" : "Sharing takes a second choice"}</strong><span>{zh ? "允许金额区间不等于直接公开；故事还要单独投稿并通过审核。" : "Allowing an amount range does not publish it. A separate story must be submitted and reviewed."}</span></article>
      <article><b>↺</b><strong>{zh ? "随时带走或删除" : "Take it or delete it"}</strong><span>{zh ? "你可导出账号数据、删除单篇故事，或彻底删除账号与角色。" : "Export your account data, delete one story, or permanently delete the account and character."}</span></article>
    </section>

    <section className="safety-section" id="privacy">
      <div className="safety-section-title"><span>01</span><div><p>PRIVACY</p><h2>{zh ? "数据与隐私说明" : "Data and privacy notice"}</h2></div></div>
      <div className="data-layer-grid">
        <article><em>1</em><h3>{zh ? "设备缓存层" : "Device cache layer"}</h3><p>{zh ? "设备会保留必要的界面与位置缓存，帮助页面恢复；清除浏览器数据只会移除这台设备的缓存。" : "The device keeps limited interface and position cache so the page can recover. Clearing browser data removes only this device cache."}</p></article>
        <article><em>2</em><h3>{zh ? "账号与共同世界层" : "Account and shared-world layer"}</h3><p>{zh ? "注册后自动进入共同大世界，不需要保险箱、恢复码或手动同步。唯一用户名和密码用于登录，不要求邮箱、手机号、真实姓名或银行连接；精确债务、收支与私人对话不会公开。" : "Registration enters the shared world automatically, with no vault, recovery code, or manual-sync step. A unique username and password are used for sign-in; no email, phone, legal name, or bank connection is required. Exact debts, cashflow, and private chats are not public."}</p></article>
        <article><em>3</em><h3>{zh ? "审核公开层" : "Reviewed public layer"}</h3><p>{zh ? "最多包含匿名代号、国家、债务类型、金额区间、还款方法、审核后故事和鼓励数。" : "At most: anonymous label, country, debt type, amount band, repayment approach, reviewed story, and light count."}</p></article>
        <article><em>4</em><h3>{zh ? "匿名访问统计层" : "Anonymous traffic layer"}</h3><p>{zh ? "网站使用一个随机第一方访客标识，按天生成不可逆摘要，用于统计每日独立访客、页面打开和粗粒度推广来源；不保存 IP、设备指纹、搜索词或完整浏览地址。" : "A random first-party visitor identifier creates a one-way daily digest for unique-visitor, page-view, and broad campaign-source counts. IP addresses, device fingerprints, search terms, and full browsing URLs are not stored."}</p></article>
      </div>
      <div className="safety-detail-grid">
        <article><h3>{zh ? "我们为什么处理这些数据" : "Why data is processed"}</h3><ul><li>{zh ? "保存真实还款进度并在设备间恢复。" : "Save real repayment progress and restore it across devices."}</li><li>{zh ? "根据债务构成与进度生成匿名角色、铁链、背负物、还款时间轴和私人现金流视图；可选画像不用于判断人格或信用。" : "Use debt composition and progress to generate the anonymous person, chains, burden object, repayment timeline, and private cashflow view. Optional traits are not used to judge personality or credit."}</li><li>{zh ? "统计每日访问、页面打开和推广来源，判断注册与建档环节是否可用。" : "Count daily visits, page views, and campaign sources to understand whether signup and onboarding work."}</li><li>{zh ? "接收不公开的私测反馈，修复看不懂、不好用或令人不舒服的环节。" : "Receive private beta feedback to fix confusing, broken, or uncomfortable experiences."}</li><li>{zh ? "只有主动开启“帮助世界成长”后，才把可选 MBTI 放入至少 30 人、每组至少 5 人的匿名群体统计；不展示个人排行，也不声称因果。" : "Only after world-growth consent may optional MBTI enter anonymous aggregates requiring at least 30 people and 5 per group. Individuals are not ranked and no causal claim is made."}</li></ul></article>
        <article><h3>{zh ? "不收集或不做的事" : "What is not collected or done"}</h3><ul><li>{zh ? "不要求真实姓名、邮箱、具体城市、电话、社交账号、身份证件或银行密码。" : "No legal name, email, precise city, phone, social account, identity document, or bank password is requested."}</li><li>{zh ? "访问统计不保存 IP、设备指纹、浏览器标识、搜索词、完整来源页或完整浏览地址。" : "Traffic analytics do not store IP addresses, device fingerprints, browser identifiers, search terms, full referrers, or full browsing URLs."}</li><li>{zh ? "不售卖数据，不提供广告定向，不做个人欠债排行。" : "No data sale, ad targeting, or personal debt leaderboard."}</li><li>{zh ? "不接入银行，不自动认定某笔还款已发生。" : "No bank connection and no automatic claim that a payment occurred."}</li></ul></article>
        <article><h3>{zh ? "保留、共享与跨境" : "Retention, sharing, and hosting"}</h3><ul><li>{zh ? "账号数据保留到你主动删除账号；删除会一并清除债务、还款、故事、举报关联、反馈和规则确认。" : "Account data remains until you delete the account. Deletion also removes debts, payments, stories, related reports, feedback, and policy acceptances."}</li><li>{zh ? "匿名逐日访问记录最多保留 90 天；随机第一方访客标识可在浏览器中保留最多 180 天，清除浏览器站点数据即可移除。" : "Anonymous daily traffic records are retained for up to 90 days. The random first-party visitor identifier may remain in the browser for up to 180 days and can be removed by clearing site data."}</li><li>{zh ? "托管与数据库使用当前 Sites 与其云服务基础设施，扩大公开范围前还需完成具体地区的跨境数据复核。" : "Hosting and storage use the current Sites cloud infrastructure. Region-specific cross-border review remains required before wider release."}</li><li>{zh ? "唯一所有者管理员可看到用户名、匿名用户编号、国家、注册/活跃时间、债务项与还款次数、AI 使用次数、主动反馈，以及每日访问和渠道汇总；看不到密码、精确金额、收入、IP 或 AI 私密对话。" : "The sole owner admin can see usernames, pseudonymous user codes, country, registration/activity times, debt-item and payment counts, AI-use counts, submitted feedback, and aggregate daily traffic/channel counts—not passwords, exact amounts, income, IP addresses, or private AI chats."}</li></ul></article>
        <article><h3>{zh ? "你的控制权" : "Your controls"}</h3><ul><li>{zh ? "导出账号与角色的完整机器可读副本。" : "Export a complete machine-readable copy of the account and character."}</li><li>{zh ? "从“我的投稿”撤回并删除单篇故事。" : "Withdraw and delete one story from My submissions."}</li><li>{zh ? "在账号设置中确认永久删除，同时移除账号、角色和相关记录。" : "Confirm permanent deletion in account settings to remove the account, character, and related records."}</li></ul></article>
      </div>
    </section>

    <section className="safety-section" id="community">
      <div className="safety-section-title"><span>02</span><div><p>COMMUNITY</p><h2>{zh ? "社区规则与审核" : "Community rules and moderation"}</h2></div></div>
      <div className="rule-columns">
        <article className="rule-allowed"><h3>✓ {zh ? "欢迎" : "Welcome"}</h3><ul><li>{zh ? "真实但已匿名的压力、进展和亲身经验。" : "Real but anonymized pressure, progress, and lived experience."}</li><li>{zh ? "说清“这对我有用”，不把个人经验包装成万能方案。" : "Say what helped you without presenting it as a universal solution."}</li><li>{zh ? "使用固定的“送一点光”支持别人。" : "Support others through the fixed Send light interaction."}</li></ul></article>
        <article className="rule-blocked"><h3>× {zh ? "禁止" : "Not allowed"}</h3><ul><li>{zh ? "真实姓名、具体城市、电话、邮箱、社交账号、网址或精确金额。" : "Legal names, precise city, phone, email, social handles, URLs, or exact amounts."}</li><li>{zh ? "借钱、转账、众筹、收费咨询、贷款与催收引流。" : "Loans, transfers, crowdfunding, paid advice, lending, or collection solicitation."}</li><li>{zh ? "骚扰、羞辱、仇恨、威胁、鼓励伤害自己或他人的内容。" : "Harassment, shaming, hate, threats, or encouragement of harm to self or others."}</li><li>{zh ? "伪造专业资格、保证减债结果或要求别人停止还款。" : "Fake credentials, guaranteed debt relief, or instructions to stop paying creditors."}</li></ul></article>
      </div>
      <div className="moderation-flow"><article><b>1</b><span>{zh ? "系统自动隐藏联系方式、网址和精确数字。" : "Automatic filtering hides contact details, URLs, and exact numbers."}</span></article><article><b>2</b><span>{zh ? "故事进入人工审核，通过前不进入地图。" : "Stories enter human review and stay off the map until approval."}</span></article><article><b>3</b><span>{zh ? "身份暴露、诈骗、自伤或催收引流举报会先行下架。" : "Identity, scam, self-harm, or collection reports remove content pending review."}</span></article><article><b>4</b><span>{zh ? "用户可自行永久删除投稿；管理员也可拒绝、隐藏或恢复。" : "Users can permanently delete submissions; moderators may reject, hide, or restore."}</span></article></div>
    </section>

    <section className="safety-section" id="boundaries">
      <div className="safety-section-title"><span>03</span><div><p>BOUNDARIES</p><h2>{zh ? "财务、法律与紧急风险边界" : "Financial, legal, and urgent-risk boundaries"}</h2></div></div>
      <div className="boundary-panel"><h3>{zh ? "小岸能做的事" : "What Kian can do"}</h3><p>{zh ? "倾听、澄清、把多笔债务和现金流组织清楚、提醒你核对账单与截止日，并帮你准备向持牌专业人士提问。" : "Listen, clarify, organize multiple debts and cashflow, remind you to verify statements and deadlines, and help prepare questions for qualified professionals."}</p><h3>{zh ? "小岸不能做的事" : "What Kian cannot do"}</h3><p>{zh ? "不是财务顾问、律师、医生、信用评分机构或债务减免服务；不保证减债、谈判、诉讼或信用结果。合同费用、税务、破产、诉讼时效和催收权利因地区而异，必须向当地合格专业人士核实。" : "Kian is not a financial adviser, lawyer, doctor, credit bureau, or debt-relief service and cannot guarantee relief, negotiation, litigation, or credit outcomes. Contract fees, tax, bankruptcy, legal deadlines, and collection rights vary by location and require local qualified advice."}</p></div>
      <div className="urgent-panel"><b>18+</b><div><h3>{zh ? "社区参与限年满 18 岁的用户" : "Community participation is for adults aged 18+"}</h3><p>{zh ? "未满 18 岁不得创建公开故事。如果你或他人面临即时的人身危险、自伤风险或无法保证安全，请不要等待网站回复：立即联系当地紧急服务、危机支持机构或可信任的身边人。" : "People under 18 may not create public stories. If you or someone else faces immediate danger, self-harm risk, or cannot stay safe, do not wait for this website: contact local emergency services, a local crisis service, or a trusted person immediately."}</p></div></div>
    </section>

    <section className="safety-section" id="controls">
      <div className="safety-section-title"><span>04</span><div><p>YOUR CONTROLS</p><h2>{zh ? "怎样导出、撤回和删除" : "How to export, withdraw, and delete"}</h2></div></div>
      <ol className="control-steps"><li><b>1</b><div><strong>{zh ? "导出所有数据" : "Export everything"}</strong><span>{zh ? "打开账号设置，选择“导出我的全部数据”。导出包含角色、债务、还款、规则同意和你主动提交的反馈。" : "Open account settings and choose Export all my data. The export includes your character, debts, payments, policy acceptances, and submitted feedback."}</span></div></li><li><b>2</b><div><strong>{zh ? "删除单篇公开故事" : "Delete one public story"}</strong><span>{zh ? "打开“大世界 → 我的投稿”，点击“撤回并永久删除”，再次确认。" : "Open Shared world → My submissions, choose Withdraw and permanently delete, then confirm."}</span></div></li><li><b>3</b><div><strong>{zh ? "删除账号与角色" : "Delete account and character"}</strong><span>{zh ? "先导出需要保留的副本，再在账号设置中确认永久删除。债务、反馈与角色会一起删除，此操作无法恢复。" : "Export anything you want to keep, then confirm permanent deletion in account settings. Debts, feedback, and the character are deleted together and cannot be recovered."}</span></div></li></ol>
      <p className="anonymous-rights-note">{zh ? "账号不要求邮箱或真实姓名。注册后会自动进入共同大世界；精确个人数据保持私密，只有达到匿名阈值的汇总结果用于让世界成长。" : "Accounts do not require an email or legal name. Registration enters the shared world automatically. Exact personal data stays private; only aggregates meeting anonymity thresholds are used to grow the world."}</p>
    </section>

    <section className="safety-sources">
      <div><p>OFFICIAL REFERENCES</p><h2>{zh ? "用于产品设计的官方原则" : "Official principles used in product design"}</h2><span>{zh ? "这些链接用于隐私最小化、数据权利和债务支持边界的产品参考，不表示本公开测试站已完成所有地区的合规认证。" : "These links inform data minimization, user controls, and debt-support boundaries. They do not mean this public beta is certified for every jurisdiction."}</span></div>
      <nav><a href={safetySources.euPrivacyPrinciples} target="_blank" rel="noreferrer">EU · GDPR principles ↗</a><a href={safetySources.euDataRequests} target="_blank" rel="noreferrer">EU · Data requests ↗</a><a href={safetySources.californiaPrivacy} target="_blank" rel="noreferrer">California · Privacy rights ↗</a><a href={safetySources.usDebtCollection} target="_blank" rel="noreferrer">US CFPB · Debt collection ↗</a><a href={safetySources.usDebtReliefRisk} target="_blank" rel="noreferrer">US CFPB · Debt-relief risks ↗</a></nav>
    </section>

    <footer className="safety-footer"><strong>{zh ? "上岸星球" : "DEBT WORLD"}</strong><span>{zh ? `最后更新：2026 年 8 月 1 日 · 版本 ${SAFETY_POLICY_VERSION}` : `Last updated August 1, 2026 · Version ${SAFETY_POLICY_VERSION}`}</span><a href={zh ? "/" : "/en"}>{zh ? "返回世界 →" : "Return to the world →"}</a></footer>
  </main>;
}
