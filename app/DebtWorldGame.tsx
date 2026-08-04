"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import CommunityPanel from "./CommunityPanel";
import AdminCommunityPanel from "./AdminCommunityPanel";
import FeedbackPanel from "./FeedbackPanel";
import BetaAdminPanel from "./BetaAdminPanel";
import AccountPanel from "./AccountPanel";
import type {
  AdvisorDebtDraft,
  AdvisorReadiness,
  AdvisorResult,
  CloudState,
  Debt,
  DebtKind,
  DebtPaymentStatus,
  Locale,
  Position,
  Profile,
  SharingMode,
  VaultPayload,
} from "@/lib/debt-world-types";
import { countryFlag, countryName, countryOptions, currencyOptions } from "@/lib/country-currency";
import { convertCurrency, fallbackUsdRates, type ExchangeRateMap } from "@/lib/exchange-rates";

const kindNames: Record<DebtKind, Record<Locale, string>> = {
  mortgage: { zh: "房贷", en: "Mortgage" },
  card: { zh: "信用卡", en: "Credit card" },
  education: { zh: "学贷", en: "Student loan" },
  medical: { zh: "医疗", en: "Medical" },
  car: { zh: "车贷", en: "Vehicle" },
  personal: { zh: "个人借款", en: "Personal loan" },
  business: { zh: "经营贷", en: "Business" },
  bnpl: { zh: "消费分期", en: "BNPL" },
  informal: { zh: "亲友借款", en: "Family & friends" },
  other: { zh: "其他", en: "Other" },
};

const repaymentApproachNames: Record<string, Record<Locale, string>> = {
  autopay: { zh: "自动扣款并定期加额", en: "Autopay with planned extras" },
  extra_income: { zh: "把额外收入用于还款", en: "Apply extra income" },
  negotiate: { zh: "与债权方协商方案", en: "Negotiate with creditor" },
  refinance: { zh: "重组或再融资", en: "Restructure or refinance" },
  snowball: { zh: "雪球法：先清最小余额", en: "Snowball: smallest balance first" },
  avalanche: { zh: "雪崩法：先处理高利率", en: "Avalanche: highest rate first" },
  family_plan: { zh: "家庭共同预算与分工", en: "Shared household plan" },
  other: { zh: "其他真实做法", en: "Another real approach" },
};

const ageBandOptions = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const mbtiOptions = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
const zodiacOptions = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const zodiacNames: Record<string, Record<Locale, string>> = {
  aries: { zh: "白羊座", en: "Aries" }, taurus: { zh: "金牛座", en: "Taurus" }, gemini: { zh: "双子座", en: "Gemini" }, cancer: { zh: "巨蟹座", en: "Cancer" },
  leo: { zh: "狮子座", en: "Leo" }, virgo: { zh: "处女座", en: "Virgo" }, libra: { zh: "天秤座", en: "Libra" }, scorpio: { zh: "天蝎座", en: "Scorpio" },
  sagittarius: { zh: "射手座", en: "Sagittarius" }, capricorn: { zh: "摩羯座", en: "Capricorn" }, aquarius: { zh: "水瓶座", en: "Aquarius" }, pisces: { zh: "双鱼座", en: "Pisces" },
};
const genderNames: Record<string, Record<Locale, string>> = {
  woman: { zh: "女性", en: "Woman" }, man: { zh: "男性", en: "Man" }, nonbinary: { zh: "非二元", en: "Non-binary" }, self_described: { zh: "自我描述", en: "Self-described" }, prefer_not_say: { zh: "不愿透露", en: "Prefer not to say" },
};
const outlookNames: Record<string, Record<Locale, string>> = {
  clear_plan: { zh: "已有明确计划", en: "I have a clear plan" }, trying: { zh: "正在摸索推进", en: "I am working it out" }, uncertain: { zh: "还不确定怎么还", en: "I am unsure how" }, no_current_way: { zh: "目前确实没有办法还", en: "I currently have no way to pay" },
};
const rotatingSlogans: Record<Locale, string[]> = {
  zh: ["看清债务，不等于被债务定义。", "把压力拆开，路才会出现。", "这里没有人均富豪，只有真实生活。", "每一次真实更新，都是向岸边移动。"],
  en: ["See the debt without becoming the debt.", "Break pressure into pieces; a route appears.", "No everyone-is-rich illusion—only real lives.", "Every honest update is movement toward shore."],
};
const debtBurdenIcons: Record<DebtKind, string> = { mortgage: "🏠", card: "💳", education: "📚", medical: "⚕", car: "🚗", personal: "🧾", business: "🧰", bnpl: "📦", informal: "🤝", other: "◈" };

const currencySymbols: Record<string, string> = { CNY: "¥", USD: "$", EUR: "€", GBP: "£", JPY: "¥", KRW: "₩", INR: "₹", BRL: "R$", AUD: "A$", CAD: "C$", HKD: "HK$", TWD: "NT$", SGD: "S$", MYR: "RM", IDR: "Rp", THB: "฿", VND: "₫", PHP: "₱", PKR: "₨", BDT: "৳", AED: "د.إ", SAR: "﷼", TRY: "₺", ILS: "₪", EGP: "E£", ZAR: "R", NGN: "₦", KES: "KSh", MAD: "د.م.", MXN: "MX$", ARS: "AR$", CLP: "CL$", COP: "COL$", PEN: "S/", NZD: "NZ$", CHF: "CHF", SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft", RON: "lei", RUB: "₽", UAH: "₴" };

const text = {
  zh: {
    brand: "上岸星球", world: "DEBT WORLD · 实时生活模拟", ai: "小岸 AI", aiMode: "本机引导模式", private: "只保存在这台设备", cloudOn: "匿名云端已同步", cloudSaving: "正在保存云端", cloudError: "有记录尚未同步", vault: "云端保险箱", total: "当前总负债", monthly: "每月固定还款", next: "最近还款", days: "天后", today: "今天", walk: "WASD / 方向键移动", talk: "空格查看角色 · Esc 关闭窗口", openAi: "继续和小岸聊", reset: "重新体验", edit: "债务档案", add: "添加一笔债务", noDebt: "先和小岸聊聊，你的标签会从这里长出来。", due: "每月还款日", payment: "每月还款", method: "还款方式", progress: "真实进度", paid: "已走过", confirm: "确认本期已实际还款", confirmed: "本期已经记录", selfReport: "只有你确认真实还款并填写最新本金余额后，进度才会变化。当前未连接银行。", latestBalance: "还款后最新本金余额", balanceHelp: "房贷月供含利息，不会把整笔月供直接当作本金减少。请按账单填写。", close: "关闭", explore: "进入世界", more: "我还有其他负债", done: "这些是目前全部", voice: "语音说", listening: "正在听…", speak: "朗读回答", localVoice: "当前语音由浏览器提供；正式 AI 实时语音待接入。", monthlyLane: "现实时间轴", cloudOff: "本机记录", demo: "用“房贷 400 万”示例进入", start: "从我的情况开始", save: "记录这笔债务", amount: "最初借了多少？", balance: "现在还剩多少？", pressure: "现在最压着你的是什么？", type: "这笔债务是什么类型？", schedule: "它怎样进入你的每个月？", alias: "给你的小人起个匿名昵称", region: "来自哪个大区？不用具体城市", send: "告诉小岸", addPayment: "记录还款", nextPayment: "下一次", editDebt: "编辑债务", saveChanges: "保存修改", deleteDebt: "删除这笔债务", deleteWarning: "再次确认后，这笔债务和还款历史将永久删除。", cancel: "取消", worldTruth: "这里没有人均富豪，只有正在生活的人。", howItWorks: "现实挂钩方式", rule1: "系统按真实日期生成还款任务", rule2: "你或未来的银行同步确认实际入账", rule3: "余额、标签和小人周围的道路随之更新", notAdvice: "这是压力梳理与记录工具，不构成财务、法律或医疗建议。",
  },
  en: {
    brand: "DEBT ATLAS", world: "DEBT WORLD · REAL-LIFE SIM", ai: "Kian AI", aiMode: "On-device guide", private: "Saved on this device", cloudOn: "Anonymous cloud synced", cloudSaving: "Saving to cloud", cloudError: "Some records are not synced", vault: "Cloud vault", total: "Current total debt", monthly: "Monthly repayments", next: "Next payment", days: "days", today: "today", walk: "Move with WASD / arrow keys", talk: "Space to inspect · Esc to close", openAi: "Talk to Kian", reset: "Reset experience", edit: "Debt file", add: "Add another debt", noDebt: "Talk to Kian first. Your labels will grow from here.", due: "Monthly due date", payment: "Monthly payment", method: "Payment method", progress: "Real progress", paid: "travelled", confirm: "Confirm payment actually happened", confirmed: "This cycle is recorded", selfReport: "Progress changes only after you confirm the real payment and enter the latest principal balance. No bank is connected yet.", latestBalance: "Latest principal balance after payment", balanceHelp: "Mortgage payments include interest, so the full monthly payment is never treated as principal reduction. Use your statement.", close: "Close", explore: "Enter the world", more: "I have another debt", done: "That is everything for now", voice: "Speak", listening: "Listening…", speak: "Read reply aloud", localVoice: "Voice currently uses your browser. Realtime AI voice is the next integration.", monthlyLane: "REAL-WORLD TIMELINE", cloudOff: "Device record", demo: "Try the ¥4,000,000 mortgage example", start: "Start with my situation", save: "Record this debt", amount: "How much did you borrow at first?", balance: "How much is left now?", pressure: "What feels heaviest right now?", type: "What kind of debt is this?", schedule: "How does it enter each month?", alias: "Give your person an anonymous name", region: "Which broad region? No city needed", send: "Tell Kian", addPayment: "Record payment", nextPayment: "Next", editDebt: "Edit debt", saveChanges: "Save changes", deleteDebt: "Delete this debt", deleteWarning: "Confirm again to permanently delete this debt and its payment history.", cancel: "Cancel", worldTruth: "No everyone-is-rich illusion. Just people living real lives.", howItWorks: "HOW REAL LIFE CONNECTS", rule1: "The system creates tasks on real calendar dates", rule2: "You—or future bank sync—confirms the payment landed", rule3: "Balance, labels, and the road around you then change", notAdvice: "A pressure-mapping and tracking tool, not financial, legal, or medical advice.",
  },
};

type NpcDebtPart = { kind: DebtKind; amount: number; monthly: number };

type WorldStory = {
  id: string;
  anonymousName: string;
  countryCode: string;
  debtKind: DebtKind;
  amountBand: string;
  currency: string;
  repaymentApproach: string;
  storyText: string;
  encouragementCount: number;
  encouraged: boolean;
  isMine: boolean;
  x: number;
  y: number;
  color: string;
  skin: string;
  hair: string;
};

type SharedWalker = {
  id: string;
  anonymousName: string;
  countryCode: string;
  debtCountBand: "none" | "single" | "multiple";
  primaryDebtKind: DebtKind;
  repaymentStage: "setting_up" | "mapped" | "started" | "moving" | "near_shore";
  isMine: boolean;
  x: number;
  y: number;
  color: string;
  skin: string;
  hair: string;
};

type ShoreProgress = {
  shoreValue: number;
  starlight: {
    available: number;
    lifetimeEarned: number;
    lifetimeSent: number;
    lifetimeReceived: number;
  };
};

type WorldPulse = {
  population: number;
  recordedDebts: number;
  confirmedPayments: number;
  countries: number;
  districts: Array<{ key: string; count: number | null; tier: number }>;
};

const storySpots = [
  { x: 12, y: 51 }, { x: 29, y: 18 }, { x: 46, y: 29 }, { x: 67, y: 42 },
  { x: 89, y: 38 }, { x: 16, y: 67 }, { x: 47, y: 78 }, { x: 70, y: 81 },
  { x: 91, y: 59 }, { x: 38, y: 46 }, { x: 61, y: 14 }, { x: 25, y: 84 },
  { x: 7, y: 20 }, { x: 18, y: 36 }, { x: 34, y: 8 }, { x: 43, y: 63 },
  { x: 56, y: 55 }, { x: 77, y: 11 }, { x: 94, y: 18 }, { x: 84, y: 52 },
  { x: 8, y: 88 }, { x: 31, y: 94 }, { x: 56, y: 92 }, { x: 81, y: 93 },
  { x: 96, y: 78 }, { x: 4, y: 43 }, { x: 23, y: 57 }, { x: 37, y: 72 },
  { x: 58, y: 36 }, { x: 72, y: 63 }, { x: 88, y: 27 }, { x: 50, y: 7 },
];

const storyLooks = [
  { color: "#ee8d66", skin: "#d99c73", hair: "#3c2922" },
  { color: "#79b7ca", skin: "#87533e", hair: "#1d1715" },
  { color: "#b7cc59", skin: "#e2b18e", hair: "#7a4d35" },
  { color: "#b9a7db", skin: "#ad6c4d", hair: "#2b1b19" },
];

const npcData: Array<{
  id: number; x: number; y: number; flag: string; amount: number; currency: string;
  monthly: number; income: number; expenses: number; repaid: number; burden: number;
  capacity: number; name: string; zh: string; en: string; color: string; skin: string;
  hair: string; lights: number; debts: NpcDebtPart[];
}> = [
  { id: 1, x: 18, y: 29, flag: "🇺🇸", amount: 48_700, currency: "USD", monthly: 620, income: 3_450, expenses: 2_180, repaid: 34, burden: 18, capacity: 19, name: "Maya_27", zh: "学贷让我觉得人生一直没有开始。今天我把自动还款提高了 3%。", en: "Student debt made life feel paused. Today I raised autopay by 3%.", color: "#db7959", skin: "#a96547", hair: "#2b1b19", lights: 4, debts: [{ kind: "education", amount: 38_100, monthly: 470 }, { kind: "card", amount: 10_600, monthly: 150 }] },
  { id: 2, x: 73, y: 23, flag: "🇮🇳", amount: 920_000, currency: "INR", monthly: 24_000, income: 58_500, expenses: 28_500, repaid: 22, burden: 41, capacity: 10, name: "Asha", zh: "家人的医疗债务很重，但我已经不再躲着亲友的消息。", en: "Family medical debt is heavy, but I no longer hide from messages.", color: "#7ab0c6", skin: "#bd7952", hair: "#1f1716", lights: 12, debts: [{ kind: "medical", amount: 650_000, monthly: 17_000 }, { kind: "personal", amount: 270_000, monthly: 7_000 }] },
  { id: 3, x: 83, y: 68, flag: "🇧🇷", amount: 72_000, currency: "BRL", monthly: 2_100, income: 7_200, expenses: 3_100, repaid: 16, burden: 29, capacity: 28, name: "Sol", zh: "小店停业后欠下信用卡。我刚完成第一次协商。", en: "My shop closed and card debt followed. I just finished my first negotiation.", color: "#d7ef5b", skin: "#8f5239", hair: "#36231d", lights: 58, debts: [{ kind: "business", amount: 42_000, monthly: 1_200 }, { kind: "card", amount: 30_000, monthly: 900 }] },
  { id: 4, x: 34, y: 76, flag: "🇰🇪", amount: 486_000, currency: "KES", monthly: 18_000, income: 42_000, expenses: 21_200, repaid: 29, burden: 43, capacity: 7, name: "Nia", zh: "金额换成美元不大，但相对收入很重。我每天只记三件事。", en: "It looks small in dollars, but not against my income. I track only three things.", color: "#c68c67", skin: "#70402f", hair: "#171313", lights: 27, debts: [{ kind: "personal", amount: 310_000, monthly: 11_000 }, { kind: "informal", amount: 176_000, monthly: 7_000 }] },
  { id: 5, x: 57, y: 47, flag: "🇩🇪", amount: 31_400, currency: "EUR", monthly: 740, income: 4_400, expenses: 2_550, repaid: 47, burden: 17, capacity: 25, name: "North Rain", zh: "离婚留下的共同债务不是我的人格，只是一段需要走完的路。", en: "Divorce debt is not my character. It is a stretch of road to finish.", color: "#b9a7db", skin: "#e2b18e", hair: "#7a4d35", lights: 108, debts: [{ kind: "personal", amount: 20_200, monthly: 480 }, { kind: "card", amount: 11_200, monthly: 260 }] },
];

function lightTier(count: number) {
  if (count >= 100) return 4;
  if (count >= 50) return 3;
  if (count >= 10) return 2;
  if (count >= 1) return 1;
  return 0;
}

function nextLightMilestone(count: number) {
  return [10, 50, 100].find((milestone) => count < milestone) ?? null;
}

function BurdenLift({ count }: { count: number }) {
  const tier = lightTier(count);
  if (!tier) return null;
  return (
    <span className={`burden-lift lift-tier-${tier}`} aria-hidden="true">
      <i/><i/><i/><i/><b/><span/>
    </span>
  );
}

function stableStoryNumber(value: string) {
  return [...value].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
}

const guideMessages = {
  zh: {
    intro: "你好，我是小岸。你已经进入大家共同生活的大世界。我们先把脑子里挤在一起的压力一笔一笔放到地上；精确内容只属于你，匿名汇总会让世界逐渐生长。",
    pressure: "先不谈数字。现在最压着你的是什么？可以打字，也可以按住语音说。",
    pressureReply: "我听到了。压力不是一个数字，它通常混着害怕、责任和不确定。接下来我们只做一件事：把它拆成可以看见的部分。",
    type: "先说第一笔。它是什么类型？以后可以继续添加，不需要一次想全。",
    amount: "这笔债务最初是多少，现在还剩多少？金额只用来生成你的私人世界。",
    schedule: "最后补上现实节奏：每月还多少、哪一天还、通过什么方式还？",
    saved: "它已经出现在你的小人身边了。进度不会自己假装前进；只有到了真实日期、你确认确实还款后，它才会变化。",
    more: "还有其他负债吗？房贷、信用卡、学贷、亲友借款可以同时存在，每一笔都会成为独立标签。",
    done: "轮廓已经出来了。现在去走一走吧。靠近别人，不是为了比较谁更惨，而是为了重新校准你看到的世界。",
  },
  en: {
    intro: "Hi, I’m Kian. You are already inside the shared world. We will place the pressure on the ground one debt at a time; exact details stay yours while anonymous aggregates help the world grow.",
    pressure: "Before numbers: what feels heaviest right now? Type it, or use the voice button.",
    pressureReply: "I hear you. Pressure is never just a number; it often mixes fear, duty, and uncertainty. We will do one thing next: make the pieces visible.",
    type: "Tell me about the first debt. What kind is it? You can add more later.",
    amount: "What was the original amount, and what is left now? These numbers only build your private world.",
    schedule: "Now the real rhythm: how much each month, which day, and by what method?",
    saved: "It now orbits your person. Progress will never pretend to move. It changes only when a real date arrives and you confirm a real payment.",
    more: "Any other debts? A mortgage, cards, student loans, and family loans can all exist together as separate labels.",
    done: "Your outline is here. Walk around. Getting close to others is not a misery contest—it recalibrates the world you see.",
  },
};

function money(value: number, currency: string) {
  const symbol = currencySymbols[currency] ?? `${currency} `;
  return `${symbol}${Math.round(value).toLocaleString("en-US")}`;
}

function fullMoney(value: number, currency: string) {
  return `${currencySymbols[currency] ?? currency} ${Math.round(value).toLocaleString()}`;
}

function debtDisplayName(debt: Pick<Debt, "kind" | "customLabel">, locale: Locale) {
  return debt.kind === "other" && debt.customLabel?.trim()
    ? debt.customLabel.trim()
    : kindNames[debt.kind][locale];
}

function paymentStatusName(status: DebtPaymentStatus | undefined, locale: Locale) {
  const labels: Record<DebtPaymentStatus, Record<Locale, string>> = {
    current: { zh: "正常还款", en: "Current" },
    late: { zh: "已经逾期", en: "Late" },
    collection: { zh: "催收 / 处置中", en: "In collection" },
    unknown: { zh: "状态待核对", en: "Status unknown" },
  };
  return labels[status ?? "unknown"][locale];
}

function nextDueDate(day: number, now: Date, lastPaidAt?: string) {
  const safeDay = Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
  let result = new Date(now.getFullYear(), now.getMonth(), safeDay);
  const last = lastPaidAt ? new Date(lastPaidAt) : null;
  const paidCycle = last && last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth();
  if (result < new Date(now.getFullYear(), now.getMonth(), now.getDate()) || paidCycle) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextSafe = Math.min(day, new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate());
    result = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextSafe);
  }
  return result;
}

function dayDiff(a: Date, b: Date) {
  return Math.max(0, Math.ceil((a.getTime() - b.getTime()) / 86_400_000));
}

function CharacterAvatar({
  badge,
  color,
  skin,
  hair,
  className = "",
  bodyShape = "steady",
  outfit = "steady",
  burdenIcon = "",
  chainLevel = 0,
}: {
  badge: string;
  color: string;
  skin: string;
  hair: string;
  className?: string;
  bodyShape?: "light" | "steady" | "burdened" | "rising";
  outfit?: "steady" | "heavy" | "near-shore";
  burdenIcon?: string;
  chainLevel?: number;
}) {
  return (
    <span
      className={`character-avatar ${className} body-${bodyShape} outfit-${outfit}`}
      style={{ "--character-color": color, "--character-skin": skin, "--character-hair": hair } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className="character-head">
        <i className="character-ear ear-left"/><i className="character-ear ear-right"/>
        <i className="character-hair"/><i className="character-fringe"/>
        <span className="character-eyes"><i/><i/></span>
        <i className="character-cheek cheek-left"/><i className="character-cheek cheek-right"/>
        <i className="character-smile"/>
      </span>
      <span className="character-torso"><i className="character-badge">{badge}</i><i className="character-arm arm-left"/><i className="character-arm arm-right"/></span>
      <span className="character-legs"><i/><i/></span>
      {burdenIcon && <span className="character-burden">{burdenIcon}</span>}
      {chainLevel > 0 && <span className={`character-chains chain-level-${chainLevel}`}><i/><i/><i/><i/></span>}
    </span>
  );
}

function defaultProfile(locale: Locale): Profile {
  return {
    alias: locale === "zh" ? "岸边的人" : "Shore Walker",
    region: locale === "zh" ? "未公开" : "Not shared",
    pressure: "",
    ageBand: "",
    gender: "",
    mbti: "",
    zodiac: "",
    selfDescription: "",
    repaymentPlan: "",
    repaymentOutlook: "",
    incomePlan: "",
    countryCode: "",
    countryName: "",
    displayCurrency: locale === "zh" ? "CNY" : "USD",
    monthlyIncome: 0,
    monthlyExpenses: 0,
  };
}

function normalizeProfile(profile: Partial<Profile> | undefined, locale: Locale): Profile {
  return { ...defaultProfile(locale), ...profile };
}

export default function DebtWorldGame({ locale, accountKey }: { locale: Locale; accountKey: string }) {
  const t = text[locale];
  const g = guideMessages[locale];
  const storageKey = `debt-world-v3:${accountKey}`;
  const rulesStorageKey = `debt-world-rules-v1:${accountKey}`;
  const [now, setNow] = useState<Date>(() => new Date());
  const [loaded, setLoaded] = useState(false);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [profile, setProfile] = useState<Profile>(() => defaultProfile(locale));
  const [position, setPosition] = useState<Position>({ x: 47, y: 63 });
  const [facing, setFacing] = useState("down");
  const [guideOpen, setGuideOpen] = useState(true);
  const [guideStep, setGuideStep] = useState<"intro" | "identity" | "pressure" | "type" | "amount" | "schedule" | "more" | "done">("intro");
  const [pressureInput, setPressureInput] = useState("");
  const [selfDescriptionInput, setSelfDescriptionInput] = useState("");
  const [repaymentPlanInput, setRepaymentPlanInput] = useState("");
  const [repaymentOutlookInput, setRepaymentOutlookInput] = useState("trying");
  const [incomePlanInput, setIncomePlanInput] = useState("");
  const [ageBandInput, setAgeBandInput] = useState("");
  const [genderInput, setGenderInput] = useState("");
  const [mbtiInput, setMbtiInput] = useState("");
  const [zodiacInput, setZodiacInput] = useState("");
  const [draftKind, setDraftKind] = useState<DebtKind>("mortgage");
  const [draftCustomLabel, setDraftCustomLabel] = useState("");
  const [draftCurrency, setDraftCurrency] = useState("CNY");
  const [draftOriginal, setDraftOriginal] = useState("4000000");
  const [draftBalance, setDraftBalance] = useState("4000000");
  const [draftMonthly, setDraftMonthly] = useState("13000");
  const [draftApr, setDraftApr] = useState("");
  const [draftMinimumPayment, setDraftMinimumPayment] = useState("");
  const [draftPaymentStatus, setDraftPaymentStatus] = useState<DebtPaymentStatus>("unknown");
  const [draftRemainingMonths, setDraftRemainingMonths] = useState("");
  const [draftDueDay, setDraftDueDay] = useState("15");
  const [draftMethod, setDraftMethod] = useState(locale === "zh" ? "银行卡自动扣款" : "Bank autopay");
  const [draftSharingMode, setDraftSharingMode] = useState<SharingMode>("private");
  const [aliasInput, setAliasInput] = useState(profile.alias);
  const [regionInput, setRegionInput] = useState(profile.region);
  const [messages, setMessages] = useState<{ role: "guide" | "user"; text: string }[]>([{ role: "guide", text: g.intro }]);
  const [selectedDebt, setSelectedDebt] = useState<string | null>(null);
  const [reportedBalance, setReportedBalance] = useState("");
  const [selectedNpc, setSelectedNpc] = useState<number | null>(null);
  const [sentNpcLights, setSentNpcLights] = useState<number[]>([]);
  const [lightFeedbackNpc, setLightFeedbackNpc] = useState<number | null>(null);
  const [worldStories, setWorldStories] = useState<WorldStory[]>([]);
  const [sharedWalkers, setSharedWalkers] = useState<SharedWalker[]>([]);
  const [worldPulse, setWorldPulse] = useState<WorldPulse>({ population: 0, recordedDebts: 0, confirmedPayments: 0, countries: 0, districts: [] });
  const [selectedWorldStory, setSelectedWorldStory] = useState<string | null>(null);
  const [selectedSharedWalker, setSelectedSharedWalker] = useState<string | null>(null);
  const [lightFeedbackStory, setLightFeedbackStory] = useState<string | null>(null);
  const [worldLightMessage, setWorldLightMessage] = useState("");
  const [selectedSelf, setSelectedSelf] = useState(false);
  const [listening, setListening] = useState(false);
  const [cloudState, setCloudState] = useState<CloudState>("checking");
  const [communityOpen, setCommunityOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminAvailable, setAdminAvailable] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [betaAdminOpen, setBetaAdminOpen] = useState(false);
  const [adminRefreshKey, setAdminRefreshKey] = useState(0);
  const [editingDebt, setEditingDebt] = useState(false);
  const [debtEdit, setDebtEdit] = useState<Debt | null>(null);
  const [deleteDebtArmed, setDeleteDebtArmed] = useState(false);
  const [discoveryConsent, setDiscoveryConsent] = useState(false);
  const [rates, setRates] = useState<ExchangeRateMap>(fallbackUsdRates);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [rateFallback, setRateFallback] = useState(true);
  const [countryGateOpen, setCountryGateOpen] = useState(false);
  const [draftCountryCode, setDraftCountryCode] = useState(locale === "zh" ? "CN" : "US");
  const [draftCountryName, setDraftCountryName] = useState("");
  const [draftDisplayCurrency, setDraftDisplayCurrency] = useState(locale === "zh" ? "CNY" : "USD");
  const [draftMonthlyIncome, setDraftMonthlyIncome] = useState("");
  const [draftMonthlyExpenses, setDraftMonthlyExpenses] = useState("");
  const [advisorInput, setAdvisorInput] = useState("");
  const [advisorConsent, setAdvisorConsent] = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState("");
  const [advisorResult, setAdvisorResult] = useState<AdvisorResult | null>(null);
  const [advisorReadiness, setAdvisorReadiness] = useState<AdvisorReadiness | null>(null);
  const [specialMode, setSpecialMode] = useState<"prepayment" | "lucky_income">("prepayment");
  const [prepaymentAmount, setPrepaymentAmount] = useState("");
  const [prepaymentBalance, setPrepaymentBalance] = useState("");
  const [luckyAmount, setLuckyAmount] = useState("");
  const [luckyBalance, setLuckyBalance] = useState("");
  const [luckyType, setLuckyType] = useState("bonus");
  const [paymentToolMessage, setPaymentToolMessage] = useState("");
  const [worldRulesOpen, setWorldRulesOpen] = useState(true);
  const [worldZoom, setWorldZoom] = useState(0.78);
  const [worldPan, setWorldPan] = useState({ x: 0, y: 0 });
  const [worldDragging, setWorldDragging] = useState(false);
  const [mobilePlannerOpen, setMobilePlannerOpen] = useState(false);
  const [sloganIndex, setSloganIndex] = useState(0);
  const [shoreProgress, setShoreProgress] = useState<ShoreProgress | null>(null);
  const panStartRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    let cancelled = false;
    const hydration = window.setTimeout(async () => {
      if (window.localStorage.getItem(rulesStorageKey) === "accepted") setWorldRulesOpen(false);
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { debts?: Debt[]; profile?: Partial<Profile>; position?: Position; discoveryConsent?: boolean; sentNpcLights?: number[] };
          if (parsed.debts) setDebts(parsed.debts);
          if (parsed.profile) {
            const nextProfile = normalizeProfile(parsed.profile, locale);
            setProfile(nextProfile);
            setAliasInput(nextProfile.alias);
            setRegionInput(nextProfile.region);
            setAgeBandInput(nextProfile.ageBand);
            setGenderInput(nextProfile.gender);
            setMbtiInput(nextProfile.mbti);
            setZodiacInput(nextProfile.zodiac);
            setSelfDescriptionInput(nextProfile.selfDescription);
            setRepaymentPlanInput(nextProfile.repaymentPlan);
            setRepaymentOutlookInput(nextProfile.repaymentOutlook || "trying");
            setIncomePlanInput(nextProfile.incomePlan);
          }
          if (parsed.position) setPosition(parsed.position);
          if (typeof parsed.discoveryConsent === "boolean") setDiscoveryConsent(parsed.discoveryConsent);
          if (Array.isArray(parsed.sentNpcLights)) setSentNpcLights(parsed.sentNpcLights.filter((id) => Number.isInteger(id)).slice(0, npcData.length));
          if (parsed.debts?.length) { setGuideOpen(false); setGuideStep("done"); }
        } catch { /* A broken local save should never block entry. */ }
      }
      try {
        const response = await fetch("/api/vault", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json() as { vault?: VaultPayload };
          if (!cancelled && data.vault) {
            setDebts(data.vault.debts);
            setProfile(normalizeProfile(data.vault.profile, locale));
            setAliasInput(data.vault.profile.alias);
            setRegionInput(data.vault.profile.region);
            setAgeBandInput(data.vault.profile.ageBand);
            setGenderInput(data.vault.profile.gender);
            setMbtiInput(data.vault.profile.mbti);
            setZodiacInput(data.vault.profile.zodiac);
            setSelfDescriptionInput(data.vault.profile.selfDescription);
            setRepaymentPlanInput(data.vault.profile.repaymentPlan);
            setRepaymentOutlookInput(data.vault.profile.repaymentOutlook || "trying");
            setIncomePlanInput(data.vault.profile.incomePlan);
            setPosition(data.vault.position);
            setDiscoveryConsent(data.vault.discoveryConsent);
            setCloudState("synced");
            if (data.vault.debts.length) {
              setGuideOpen(false);
              setGuideStep("done");
            }
          }
        } else if (!cancelled) {
          setCloudState(response.status === 401 ? "local" : "error");
        }
      } catch {
        if (!cancelled) setCloudState("error");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearTimeout(hydration);
    };
  }, [locale, rulesStorageKey, storageKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setSloganIndex((current) => (current + 1) % rotatingSlogans[locale].length), 8_000);
    return () => window.clearInterval(timer);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rates", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { rates?: ExchangeRateMap; date?: string | null; fallback?: boolean }) => {
        if (cancelled || !data.rates) return;
        setRates({ ...fallbackUsdRates, ...data.rates, USD: 1 });
        setRateDate(data.date ?? null);
        setRateFallback(Boolean(data.fallback));
      })
      .catch(() => setRateFallback(true));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/advisor", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((data: AdvisorReadiness) => {
        if (!cancelled && typeof data.configured === "boolean") setAdvisorReadiness(data);
      })
      .catch(() => {
        if (!cancelled) setAdvisorReadiness(null);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (cloudState !== "synced") return;
    let cancelled = false;
    void fetch("/api/progress", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((data: { progress?: ShoreProgress }) => {
        if (!cancelled && data.progress) setShoreProgress(data.progress);
      })
      .catch(() => { /* Reward display can recover on the next cloud sync. */ });
    return () => { cancelled = true; };
  }, [cloudState]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/community", { credentials: "same-origin", cache: "no-store" });
        const data = await response.json() as {
          stories?: Array<Omit<WorldStory, "isMine" | "x" | "y" | "color" | "skin" | "hair">>;
          sharedWalkers?: Array<Omit<SharedWalker, "x" | "y" | "color" | "skin" | "hair">>;
          mine?: Array<{ id: string }>;
          worldPulse?: WorldPulse;
        };
        if (!response.ok || cancelled) return;
        if (data.worldPulse) setWorldPulse(data.worldPulse);
        const mineIds = new Set((data.mine ?? []).map((story) => story.id));
        const usedSpots = new Set<number>();
        const people = (data.stories ?? []).slice(0, storySpots.length).map((story) => {
          const seed = stableStoryNumber(story.id);
          let spotIndex = seed % storySpots.length;
          while (usedSpots.has(spotIndex)) spotIndex = (spotIndex + 1) % storySpots.length;
          usedSpots.add(spotIndex);
          return { ...story, ...storySpots[spotIndex], ...storyLooks[seed % storyLooks.length], isMine: mineIds.has(story.id) };
        });
        setWorldStories(people);
        const usedWalkerSlots = new Set<number>();
        const walkers = (data.sharedWalkers ?? []).slice(0, 80).map((walker, index) => {
          const seed = stableStoryNumber(walker.id);
          let slot = (seed + (index * 17)) % 80;
          while (usedWalkerSlots.has(slot)) slot = (slot + 1) % 80;
          usedWalkerSlots.add(slot);
          const look = storyLooks[seed % storyLooks.length];
          return {
            ...walker,
            ...look,
            x: 6 + ((slot % 10) * 9.7),
            y: 10 + (Math.floor(slot / 10) * 11),
          };
        });
        setSharedWalkers(walkers);
      } catch { /* The demo world remains usable if the reviewed community is unavailable. */ }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [loaded, communityOpen, cloudState, adminRefreshKey]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" });
        const adminSession = await response.json().catch(() => ({})) as { registered?: boolean };
        if (!cancelled) setAdminAvailable(response.ok && adminSession.registered === true);
      } catch { if (!cancelled) setAdminAvailable(false); }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [loaded, adminRefreshKey]);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(storageKey, JSON.stringify({ debts, profile, position, discoveryConsent, sentNpcLights }));
  }, [debts, profile, position, discoveryConsent, sentNpcLights, loaded, storageKey]);

  useEffect(() => {
    if (!loaded || cloudState !== "synced") return;
    const saveTimer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/vault", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, position, locale, discoveryConsent }),
        });
        if (!response.ok) setCloudState("error");
      } catch {
        setCloudState("error");
      }
    }, 1200);
    return () => window.clearTimeout(saveTimer);
  }, [profile, position, locale, discoveryConsent, loaded, cloudState]);

  const move = (dx: number, dy: number, direction: string) => {
    setFacing(direction);
    setPosition((current) => ({ x: Math.min(94, Math.max(6, current.x + dx)), y: Math.min(88, Math.max(12, current.y + dy)) }));
  };

  const displayCurrency = profile.displayCurrency || (locale === "zh" ? "CNY" : "USD");
  const toDisplay = (value: number, currency: string) => convertCurrency(value, currency, displayCurrency, rates);
  const displayStoryAmountBand = (story: Pick<WorldStory, "amountBand" | "currency">) => {
    const boundaries = story.amountBand.match(/[\d,]+/g)?.map((value) => Number(value.replaceAll(",", ""))).filter(Number.isFinite) ?? [];
    const converted = boundaries.map((value) => Math.round(toDisplay(value, story.currency)).toLocaleString("en-US"));
    if (!converted.length) return `${displayCurrency} —`;
    if (story.amountBand.endsWith("+")) return `${displayCurrency} ${converted[0]}+`;
    if (converted.length > 1) return `${displayCurrency} ${converted[0]}–${converted[1]}`;
    return `${displayCurrency} ${converted[0]}`;
  };
  const totalBalance = debts.reduce((sum, debt) => sum + toDisplay(debt.balance, debt.currency), 0);
  const totalOriginal = debts.reduce((sum, debt) => sum + toDisplay(debt.original, debt.currency), 0);
  const totalMonthly = debts.reduce((sum, debt) => sum + toDisplay(debt.monthly, debt.currency), 0);
  const overallProgress = totalOriginal > 0 ? Math.max(0, Math.round((1 - totalBalance / totalOriginal) * 100)) : 0;
  const monthlyBurden = profile.monthlyIncome > 0 ? Math.min(100, Math.round((totalMonthly / profile.monthlyIncome) * 100)) : null;
  const monthlyCashflow = profile.monthlyIncome > 0 ? profile.monthlyIncome - profile.monthlyExpenses - totalMonthly : null;
  const cashflowLoad = profile.monthlyIncome > 0 ? Math.round(((profile.monthlyExpenses + totalMonthly) / profile.monthlyIncome) * 100) : null;
  const repaymentCapacity = monthlyCashflow === null ? null : Math.max(0, Math.round((monthlyCashflow / profile.monthlyIncome) * 100));
  const largestDebt = debts.reduce<Debt | null>((largest, debt) => {
    if (!largest) return debt;
    return toDisplay(debt.balance, debt.currency) > toDisplay(largest.balance, largest.currency) ? debt : largest;
  }, null);
  const largestDebtValue = largestDebt ? toDisplay(largestDebt.balance, largestDebt.currency) : 0;
  const largestDebtShare = totalBalance > 0 ? Math.round((largestDebtValue / totalBalance) * 100) : 0;
  const orbitDebts = largestDebt
    ? [largestDebt, ...debts.filter((debt) => debt.id !== largestDebt.id)].slice(0, 6)
    : debts.slice(0, 6);
  const cashflowScale = Math.max(profile.monthlyIncome, profile.monthlyExpenses + totalMonthly, 1);
  const livingSegment = Math.round((profile.monthlyExpenses / cashflowScale) * 100);
  const repaymentSegment = Math.round((totalMonthly / cashflowScale) * 100);
  const remainingSegment = monthlyCashflow !== null && monthlyCashflow > 0 ? Math.max(0, 100 - livingSegment - repaymentSegment) : 0;
  const openDebts = debts.filter((debt) => debt.balance > 0);
  const knownAprDebts = openDebts.filter((debt) => debt.apr !== null && debt.apr !== undefined);
  const knownMinimumDebts = openDebts.filter((debt) => debt.minimumPayment !== null && debt.minimumPayment !== undefined);
  const avalancheTarget = [...knownAprDebts].sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0) || toDisplay(b.balance, b.currency) - toDisplay(a.balance, a.currency))[0] ?? null;
  const snowballTarget = [...openDebts].sort((a, b) => toDisplay(a.balance, a.currency) - toDisplay(b.balance, b.currency))[0] ?? null;
  const urgentTarget = [...openDebts].sort((a, b) => {
    const urgency = (debt: Debt) => debt.paymentStatus === "collection" ? 2 : debt.paymentStatus === "late" ? 1 : 0;
    return urgency(b) - urgency(a) || a.dueDay - b.dueDay;
  }).find((debt) => debt.paymentStatus === "late" || debt.paymentStatus === "collection") ?? null;
  const cashflowTarget = urgentTarget ?? [...openDebts].sort((a, b) =>
    toDisplay(b.minimumPayment ?? b.monthly, b.currency) - toDisplay(a.minimumPayment ?? a.monthly, a.currency))[0] ?? null;
  const extraPaymentRoom = monthlyCashflow === null ? null : Math.max(0, monthlyCashflow);
  const nearNpc = npcData.find((npc) => Math.hypot(npc.x - position.x, npc.y - position.y) < 11);
  const nearWorldStory = worldStories
    .map((story) => ({ story, distance: Math.hypot(story.x - position.x, story.y - position.y) }))
    .filter((item) => item.distance < 11)
    .sort((a, b) => a.distance - b.distance)[0]?.story;
  const nearSharedWalker = sharedWalkers
    .filter((walker) => !walker.isMine)
    .map((walker) => ({ walker, distance: Math.hypot(walker.x - position.x, walker.y - position.y) }))
    .filter((item) => item.distance < 11)
    .sort((a, b) => a.distance - b.distance)[0]?.walker;
  const activeWorldStory = worldStories.find((story) => story.id === selectedWorldStory);
  const activeSharedWalker = sharedWalkers.find((walker) => walker.id === selectedSharedWalker);
  const totalBalanceUsd = debts.reduce((sum, debt) => sum + convertCurrency(debt.balance, debt.currency, "USD", rates), 0);
  const totalOriginalUsd = debts.reduce((sum, debt) => sum + convertCurrency(debt.original, debt.currency, "USD", rates), 0);
  const selfLightCount = worldStories.filter((story) => story.isMine).reduce((sum, story) => sum + story.encouragementCount, 0);
  const selfLightTier = lightTier(selfLightCount);
  const remainingShare = totalOriginal > 0 ? Math.min(1, totalBalance / totalOriginal) : 0;
  const absoluteWeight = Math.min(1, totalBalanceUsd / 100_000);
  const chainLevel = !openDebts.length ? 0 : totalBalanceUsd < 500 ? 1 : Math.max(1, Math.min(4, Math.ceil((absoluteWeight * 0.65 + remainingShare * 0.35) * 4)));
  const bodyShape: "light" | "steady" | "burdened" | "rising" = !openDebts.length ? "light" : overallProgress >= 65 ? "rising" : chainLevel >= 3 ? "burdened" : "steady";
  const outfit: "steady" | "heavy" | "near-shore" = overallProgress >= 80 ? "near-shore" : chainLevel >= 3 ? "heavy" : "steady";
  const avatarColor = largestDebt?.kind === "mortgage" ? "#6e9eb5" : largestDebt?.kind === "education" ? "#a590ca" : largestDebt?.kind === "medical" ? "#d99a62" : largestDebt?.kind === "business" ? "#b9786e" : "#e86e4e";
  const totalConfirmedPayments = debts.reduce((sum, debt) => sum + (debt.history?.length ?? debt.payments ?? 0), 0);
  const nearShore = overallProgress >= 80 && totalOriginalUsd >= 1_000 && totalConfirmedPayments >= 3;

  const changeWorldZoom = (delta: number) => setWorldZoom((current) => Math.min(1.6, Math.max(0.55, Math.round((current + delta) * 100) / 100)));
  const beginWorldPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;
    panStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: worldPan.x, panY: worldPan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setWorldDragging(true);
  };
  const moveWorldPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = panStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setWorldPan({ x: start.panX + event.clientX - start.x, y: start.panY + event.clientY - start.y });
  };
  const endWorldPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panStartRef.current?.pointerId !== event.pointerId) return;
    panStartRef.current = null;
    setWorldDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const acceptWorldRules = () => {
    window.localStorage.setItem(rulesStorageKey, "accepted");
    setWorldRulesOpen(false);
  };

  const saveProfileDetails = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setProfile((current) => ({
      ...current,
      ageBand: String(form.get("ageBand") ?? ""),
      gender: String(form.get("gender") ?? ""),
      mbti: String(form.get("mbti") ?? ""),
      zodiac: String(form.get("zodiac") ?? ""),
      selfDescription: String(form.get("selfDescription") ?? "").trim().slice(0, 1_200),
      repaymentPlan: String(form.get("repaymentPlan") ?? "").trim().slice(0, 1_200),
      repaymentOutlook: String(form.get("repaymentOutlook") ?? ""),
      incomePlan: String(form.get("incomePlan") ?? "").trim().slice(0, 800),
    }));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (worldRulesOpen) return;
        if (betaAdminOpen) setBetaAdminOpen(false);
        else if (feedbackOpen) setFeedbackOpen(false);
        else if (adminOpen) setAdminOpen(false);
        else if (communityOpen) setCommunityOpen(false);
        else if (accountOpen) setAccountOpen(false);
        else if (countryGateOpen) {
          if (!profile.countryCode) return;
          setCountryGateOpen(false);
        }
        else if (mobilePlannerOpen) setMobilePlannerOpen(false);
        else if (selectedDebt) setSelectedDebt(null);
        else if (selectedSharedWalker) setSelectedSharedWalker(null);
        else if (selectedWorldStory) setSelectedWorldStory(null);
        else if (selectedNpc) setSelectedNpc(null);
        else if (selectedSelf) setSelectedSelf(false);
        else if (guideOpen) setGuideOpen(false);
        else return;
        event.preventDefault();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) return;
      const hasOpenLayer = worldRulesOpen || guideOpen || communityOpen || accountOpen || adminOpen || feedbackOpen || betaAdminOpen || countryGateOpen || mobilePlannerOpen || Boolean(selectedDebt || selectedSharedWalker || selectedWorldStory || selectedNpc || selectedSelf);
      if (event.code === "Space" && (nearSharedWalker || nearWorldStory || nearNpc) && !hasOpenLayer) {
        event.preventDefault();
        const candidates = [
          nearSharedWalker ? { type: "walker" as const, id: nearSharedWalker.id, distance: Math.hypot(nearSharedWalker.x - position.x, nearSharedWalker.y - position.y) } : null,
          nearWorldStory ? { type: "story" as const, id: nearWorldStory.id, distance: Math.hypot(nearWorldStory.x - position.x, nearWorldStory.y - position.y) } : null,
          nearNpc ? { type: "npc" as const, id: String(nearNpc.id), distance: Math.hypot(nearNpc.x - position.x, nearNpc.y - position.y) } : null,
        ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate)).sort((left, right) => left.distance - right.distance);
        const nearest = candidates[0];
        if (nearest?.type === "walker") setSelectedSharedWalker(nearest.id);
        else if (nearest?.type === "story") setSelectedWorldStory(nearest.id);
        else if (nearest?.type === "npc") setSelectedNpc(Number(nearest.id));
        return;
      }
      if (hasOpenLayer) return;
      const key = event.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) { event.preventDefault(); move(0, -2.2, "up"); }
      if (["arrowdown", "s"].includes(key)) { event.preventDefault(); move(0, 2.2, "down"); }
      if (["arrowleft", "a"].includes(key)) { event.preventDefault(); move(-2.2, 0, "left"); }
      if (["arrowright", "d"].includes(key)) { event.preventDefault(); move(2.2, 0, "right"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const upcoming = useMemo(() => !now ? [] : debts.map((debt) => ({ debt, date: nextDueDate(debt.dueDay, now, debt.lastPaidAt) })).sort((a, b) => a.date.getTime() - b.date.getTime()), [debts, now]);
  const activeDebt = debts.find((debt) => debt.id === selectedDebt);

  useEffect(() => {
    const refresh = window.setTimeout(() => {
      if (activeDebt) {
        setReportedBalance(String(activeDebt.balance));
        setPrepaymentBalance(String(activeDebt.balance));
        setLuckyBalance(String(activeDebt.balance));
        setPrepaymentAmount("");
        setLuckyAmount("");
        setPaymentToolMessage("");
        setDebtEdit({ ...activeDebt });
        setEditingDebt(false);
        setDeleteDebtArmed(false);
      }
    }, 0);
    return () => window.clearTimeout(refresh);
  }, [activeDebt]);

  const addMessage = (role: "guide" | "user", message: string) => setMessages((current) => [...current, { role, text: message }]);

  const sendNpcLight = (npcId: number) => {
    if (sentNpcLights.includes(npcId)) {
      setSelectedNpc(null);
      return;
    }
    setSentNpcLights((current) => [...current, npcId]);
    setSelectedNpc(null);
    setLightFeedbackNpc(npcId);
    window.setTimeout(() => setLightFeedbackNpc((current) => current === npcId ? null : current), 1500);
  };

  const sendWorldStoryLight = async (storyId: string) => {
    const story = worldStories.find((item) => item.id === storyId);
    if (!story || story.encouraged || story.isMine) return;
    if (cloudState !== "synced") {
      setWorldLightMessage(locale === "zh" ? "大世界连接还没有完成，请刷新后再送光。" : "The shared-world connection is not ready. Refresh and try again.");
      return;
    }
    setWorldLightMessage("");
    try {
      const response = await fetch("/api/community", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "encourage", storyId }),
      });
      const data = await response.json() as { count?: number; error?: string };
      if (response.status === 429) throw new Error(locale === "zh" ? "今天送出的光已达到安全上限，请明天继续。" : "Today's light-giving safety limit has been reached.");
      if (!response.ok) throw new Error(data.error ?? "send");
      setWorldStories((current) => current.map((item) => item.id === storyId ? { ...item, encouraged: true, encouragementCount: data.count ?? item.encouragementCount + 1 } : item));
      setSelectedWorldStory(null);
      setLightFeedbackStory(storyId);
      window.setTimeout(() => setLightFeedbackStory((current) => current === storyId ? null : current), 1500);
    } catch (error) {
      setWorldLightMessage(error instanceof Error && error.message !== "send" ? error.message : (locale === "zh" ? "这道光暂时没有送达，请稍后再试。" : "The light did not arrive. Try again later."));
    }
  };

  const openCountryChooser = () => {
    const code = profile.countryCode || (locale === "zh" ? "CN" : "US");
    const option = countryOptions.find((country) => country.code === code);
    setDraftCountryCode(code);
    setDraftCountryName(profile.countryName || "");
    setDraftDisplayCurrency(profile.displayCurrency || option?.currency || (locale === "zh" ? "CNY" : "USD"));
    setDraftMonthlyIncome(profile.monthlyIncome > 0 ? String(Math.round(profile.monthlyIncome)) : "");
    setDraftMonthlyExpenses(profile.monthlyExpenses > 0 ? String(Math.round(profile.monthlyExpenses)) : "");
    setCountryGateOpen(true);
  };

  const changeCountry = (code: string) => {
    const option = countryOptions.find((country) => country.code === code);
    const nextCurrency = option?.currency ?? draftDisplayCurrency;
    if (nextCurrency !== draftDisplayCurrency) setDraftMonthlyIncome("");
    if (nextCurrency !== draftDisplayCurrency) setDraftMonthlyExpenses("");
    setDraftCountryCode(code);
    setDraftCountryName(code === "OTHER" ? draftCountryName : "");
    setDraftDisplayCurrency(nextCurrency);
  };

  const saveCountry = (event: FormEvent) => {
    event.preventDefault();
    const option = countryOptions.find((country) => country.code === draftCountryCode);
    const countryCode = option?.code ?? "OTHER";
    const customName = countryCode === "OTHER" ? draftCountryName.trim() : "";
    const currency = draftDisplayCurrency.trim().toUpperCase();
    if (countryCode === "OTHER" && !customName) return;
    if (!/^[A-Z]{3}$/.test(currency)) return;
    setProfile((current) => ({
      ...current,
      countryCode,
      countryName: customName,
      displayCurrency: currency,
      monthlyIncome: Math.max(0, Number(draftMonthlyIncome) || 0),
      monthlyExpenses: Math.max(0, Number(draftMonthlyExpenses) || 0),
    }));
    setDraftCurrency(currency);
    setCountryGateOpen(false);
  };

  const begin = () => { setGuideStep("identity"); addMessage("user", t.start); addMessage("guide", locale === "zh" ? `${t.alias}，${t.region}` : `${t.alias}. ${t.region}`); };
  const saveIdentity = (event: FormEvent) => { event.preventDefault(); setProfile((current) => ({ ...current, alias: aliasInput || current.alias, region: regionInput || current.region, ageBand: ageBandInput, gender: genderInput, mbti: mbtiInput, zodiac: zodiacInput })); addMessage("user", `${aliasInput} · ${regionInput}${mbtiInput ? ` · ${mbtiInput}` : ""}`); addMessage("guide", g.pressure); setGuideStep("pressure"); };
  const savePressure = () => {
    if (!pressureInput.trim() && !selfDescriptionInput.trim()) return;
    setProfile((current) => ({ ...current, pressure: pressureInput.trim(), selfDescription: selfDescriptionInput.trim(), repaymentPlan: repaymentPlanInput.trim(), repaymentOutlook: repaymentOutlookInput, incomePlan: incomePlanInput.trim() }));
    addMessage("user", [selfDescriptionInput.trim(), pressureInput.trim(), repaymentPlanInput.trim()].filter(Boolean).join(" · "));
    addMessage("guide", g.pressureReply);
    window.setTimeout(() => addMessage("guide", g.type), 200);
    setGuideStep("type");
  };
  const chooseKind = (kind: DebtKind) => { setDraftKind(kind); setDraftCustomLabel(""); addMessage("user", kindNames[kind][locale]); addMessage("guide", g.amount); setGuideStep("amount"); };
  const saveAmount = (event: FormEvent) => { event.preventDefault(); addMessage("user", `${fullMoney(Number(draftOriginal), draftCurrency)} → ${fullMoney(Number(draftBalance), draftCurrency)}`); addMessage("guide", g.schedule); setGuideStep("schedule"); };
  const saveDebt = async (event: FormEvent) => {
    event.preventDefault();
    const debt: Debt = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, kind: draftKind, customLabel: draftKind === "other" ? draftCustomLabel.trim() : undefined, currency: draftCurrency, original: Math.max(Number(draftOriginal), Number(draftBalance)), balance: Number(draftBalance), monthly: Number(draftMonthly), apr: draftApr.trim() ? Math.min(1_000, Math.max(0, Number(draftApr))) : null, minimumPayment: draftMinimumPayment.trim() ? Math.max(0, Number(draftMinimumPayment)) : null, paymentStatus: draftPaymentStatus, remainingMonths: draftRemainingMonths.trim() ? Math.min(1_200, Math.max(1, Math.round(Number(draftRemainingMonths)))) : null, dueDay: Math.min(31, Math.max(1, Number(draftDueDay))), method: draftMethod, sharingMode: draftSharingMode, payments: 0 };
    if (cloudState === "synced") {
      setCloudState("syncing");
      try {
        const response = await fetch("/api/debts", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(debt),
        });
        const data = await response.json() as { debt?: Debt; referralActivated?: boolean };
        if (!response.ok || !data.debt) throw new Error("Cloud save failed");
        setDebts((current) => [...current, data.debt!]);
        if (data.referralActivated) {
          void fetch("/api/progress", { credentials: "same-origin", cache: "no-store" })
            .then((progressResponse) => progressResponse.json())
            .then((data: { progress?: ShoreProgress }) => { if (data.progress) setShoreProgress(data.progress); })
            .catch(() => undefined);
          addMessage("guide", locale === "zh" ? "邀请已完成真实激活：你的新行者欢迎星光已经到账，邀请你的人也获得了星光。" : "Your invitation is now truly activated: welcome starlight has arrived, and your inviter has also been rewarded.");
        }
        setCloudState("synced");
      } catch {
        setCloudState("error");
        addMessage("guide", locale === "zh" ? "这笔债务还没有进入大世界，请检查连接后重试。" : "This debt has not reached the shared world yet. Check the connection and try again.");
        return;
      }
    } else {
      setDebts((current) => [...current, debt]);
    }
    addMessage("user", `${fullMoney(debt.monthly, debt.currency)} · ${locale === "zh" ? `每月 ${debt.dueDay} 日` : `day ${debt.dueDay} monthly`} · ${debt.method}`);
    addMessage("guide", g.saved); window.setTimeout(() => addMessage("guide", g.more), 200); setGuideStep("more");
  };
  const addAnother = () => { setGuideStep("type"); addMessage("user", t.more); addMessage("guide", g.type); setDraftCustomLabel(""); setDraftOriginal(""); setDraftBalance(""); setDraftMonthly(""); setDraftApr(""); setDraftMinimumPayment(""); setDraftPaymentStatus("unknown"); setDraftRemainingMonths(""); setDraftSharingMode("private"); };
  const finishGuide = () => { setGuideStep("done"); addMessage("user", t.done); addMessage("guide", g.done); window.setTimeout(() => setGuideOpen(false), 550); };

  const loadDemo = () => {
    const demoDebts: Debt[] = [
      { id: "demo-mortgage", kind: "mortgage", currency: "CNY", original: 4_000_000, balance: 4_000_000, monthly: 13_000, apr: 3.85, minimumPayment: 13_000, paymentStatus: "current", remainingMonths: 312, dueDay: 15, method: locale === "zh" ? "银行卡自动扣款" : "Bank autopay", payments: 0 },
      { id: "demo-card", kind: "card", currency: "CNY", original: 82_000, balance: 68_000, monthly: 6_000, apr: 18.25, minimumPayment: 3_000, paymentStatus: "current", remainingMonths: 14, dueDay: 3, method: locale === "zh" ? "主动还款" : "Manual payment", payments: 2 },
    ];
    setDebts(demoDebts); setProfile((current) => ({ ...current, alias: locale === "zh" ? "岸边的人" : "Shore Walker", region: locale === "zh" ? "中国 · 华东" : "China · East", pressure: locale === "zh" ? "害怕每个月现金流不够，也不知道别人是不是都比我轻松。" : "I worry cash will run short each month, and everyone else seems better off.", ageBand: "25-34", gender: "prefer_not_say", mbti: "INFP", zodiac: "pisces", selfDescription: locale === "zh" ? "房贷和信用卡同时压在每个月，先想把现金流稳定下来。" : "A mortgage and card balance hit every month; I want to stabilize cash flow first.", repaymentPlan: locale === "zh" ? "先守住最低还款，再把额外收入放到高利率债务。" : "Protect minimums, then send extra income to the highest APR.", repaymentOutlook: "trying", incomePlan: locale === "zh" ? "尝试增加自由职业收入。" : "Trying to add freelance income.", monthlyIncome: 32_000, monthlyExpenses: 9_500 })); setGuideStep("done"); setMessages([{ role: "guide", text: g.done }]); setGuideOpen(false);
  };

  const confirmPayment = async (debtId: string) => {
    const target = debts.find((debt) => debt.id === debtId);
    if (!target) return;
    const nextBalance = Math.max(0, Math.min(target.balance, Number(reportedBalance)));
    let timestamp = new Date().toISOString();
    if (cloudState === "synced") {
      setCloudState("syncing");
      try {
        const response = await fetch("/api/payments", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            debtId,
            cashPayment: target.monthly,
            newBalance: nextBalance,
            source: "self_report",
            timezoneOffset: new Date().getTimezoneOffset(),
            scheduledDate: nextDueDate(target.dueDay, now, target.lastPaidAt).toISOString().slice(0, 10),
          }),
        });
        const data = await response.json() as { payment?: { confirmedAt: string } };
        if (!response.ok || !data.payment) throw new Error("Cloud payment save failed");
        timestamp = data.payment.confirmedAt;
        setCloudState("synced");
      } catch {
        setCloudState("error");
        return;
      }
    }
    setDebts((current) => current.map((debt) => {
      if (debt.id !== debtId) return debt;
      return { ...debt, balance: nextBalance, lastPaidAt: timestamp, payments: debt.payments + 1, history: [...(debt.history ?? []), { confirmedAt: timestamp, eventDate: new Date().toLocaleDateString("en-CA"), cashPayment: debt.monthly, newBalance: nextBalance, source: "self_report" as const }] };
    }));
  };

  const localDate = new Date().toLocaleDateString("en-CA");
  const luckyUsedToday = debts.some((debt) => debt.history?.some((entry) => entry.source === "lucky_income" && (entry.eventDate ?? entry.confirmedAt.slice(0, 10)) === localDate));

  const recordSpecialPayment = async (source: "prepayment" | "lucky_income") => {
    if (!activeDebt) return;
    const amount = Number(source === "prepayment" ? prepaymentAmount : luckyAmount);
    const nextBalance = Number(source === "prepayment" ? prepaymentBalance : luckyBalance);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(nextBalance) || nextBalance < 0 || nextBalance > activeDebt.balance) {
      setPaymentToolMessage(locale === "zh" ? "请填写真实到账金额，以及付款后账单显示的最新本金余额。" : "Enter the real cash amount and the latest principal balance shown after payment.");
      return;
    }
    if (source === "lucky_income" && cloudState !== "synced") {
      setPaymentToolMessage(locale === "zh" ? "每日一次需要大世界校验。连接恢复后即可继续。" : "The once-daily rule needs the shared-world connection. Try again after it recovers.");
      return;
    }
    if (source === "lucky_income" && luckyUsedToday) {
      setPaymentToolMessage(locale === "zh" ? "今天的幸运收入机会已经记录，明天再来。" : "Today's lucky-income entry is already used. Come back tomorrow.");
      return;
    }
    let timestamp = new Date().toISOString();
    let eventDate = localDate;
    if (cloudState === "synced") {
      setCloudState("syncing");
      try {
        const response = await fetch("/api/payments", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            debtId: activeDebt.id,
            cashPayment: amount,
            newBalance: nextBalance,
            source,
            incomeType: source === "lucky_income" ? luckyType : undefined,
            timezoneOffset: new Date().getTimezoneOffset(),
          }),
        });
        const data = await response.json() as { payment?: { confirmedAt: string; eventDate: string }; error?: string };
        if (!response.ok || !data.payment) throw new Error(data.error ?? "save");
        timestamp = data.payment.confirmedAt;
        eventDate = data.payment.eventDate;
        setCloudState("synced");
      } catch (error) {
        setCloudState("error");
        setPaymentToolMessage(error instanceof Error && error.message !== "save" ? error.message : (locale === "zh" ? "记录没有保存成功，请检查连接后重试。" : "The record was not saved. Check the connection and try again."));
        return;
      }
    }
    const incomeType = source === "lucky_income" ? luckyType : undefined;
    setDebts((current) => current.map((debt) => debt.id === activeDebt.id ? {
      ...debt,
      balance: nextBalance,
      payments: debt.payments + 1,
      history: [...(debt.history ?? []), { confirmedAt: timestamp, eventDate, cashPayment: amount, newBalance: nextBalance, source, incomeType }],
    } : debt));
    setPaymentToolMessage(source === "prepayment"
      ? (locale === "zh" ? "提前还款已按最新账单本金记录；原定还款日没有被自动取消。" : "Prepayment recorded from the latest statement; the scheduled due date was not automatically cancelled.")
      : (locale === "zh" ? "今天的真实额外收入已经用于这笔债务，进度已更新。" : "Today's real extra income was applied to this debt and progress is updated."));
    if (source === "prepayment") setPrepaymentAmount(""); else setLuckyAmount("");
  };

  const localAdvisorAnswer = (question: string) => {
    const lower = question.toLowerCase();
    const smallestDebt = [...debts].sort((a, b) => toDisplay(a.balance, a.currency) - toDisplay(b.balance, b.currency))[0];
    const legalIntent = /(律师|法律|催收|起诉|法院|仲裁|破产|征信|lawyer|legal|collector|lawsuit|court|bankrupt)/i.test(lower);
    const prepayIntent = /(提前还|提前还款|多还|prepay|extra payment)/i.test(lower);
    const priorityIntent = /(先还|优先|顺序|snowball|avalanche|which.*first)/i.test(lower);
    const stressIntent = /(压力|害怕|焦虑|睡不着|撑不住|stress|anxi|afraid|sleep)/i.test(lower);
    const worldIntent = /(别人|世界|数据|最多|还款方式|world|others|data|most)/i.test(lower);
    let answer: string;
    if (legalIntent) {
      answer = locale === "zh"
        ? "我可以帮你整理材料和问题，但不能替律师下法律结论。先做四件事：保存合同、账单和全部通知；核验联系方身份；不要因电话施压立即转账或透露验证码；记录期限并向你所在地的监管机构、法律援助或持牌律师核对。把国家/地区和你收到的文件类型告诉我，我可以继续生成一份不含法律结论的核对清单。"
        : "I can organize documents and questions, but cannot make a lawyer's legal conclusion. Preserve contracts, statements, and notices; verify who is contacting you; never transfer money or reveal codes under phone pressure; record deadlines and check with local regulators, legal aid, or a qualified lawyer. Tell me the country and document type and I can build a non-legal checklist.";
    } else if (prepayIntent) {
      answer = locale === "zh"
        ? `提前还款前先核对：合同是否有违约金或次数限制、付款如何在利息与本金间分配、是否保留了必要生活缓冲、付款后银行出具的最新本金。当前月底余量是 ${monthlyCashflow === null ? "尚未填写" : fullMoney(monthlyCashflow, displayCurrency)}。完成真实付款后，到债务档案里的“提前还款”窗口记录，系统不会把整笔现金自动当作本金减少。`
        : `Before prepaying, check contract fees or limits, how cash splits between interest and principal, whether an essential buffer remains, and the lender's new principal statement. Current month-left is ${monthlyCashflow === null ? "not entered" : fullMoney(monthlyCashflow, displayCurrency)}. Record the real payment in the Prepayment window; the system never assumes all cash reduced principal.`;
    } else if (priorityIntent) {
      answer = locale === "zh"
        ? `三种看法会给出不同答案：①高利率优先${avalancheTarget ? `指向${debtDisplayName(avalancheTarget, locale)}（年利率 ${avalancheTarget.apr}%）` : "还缺年利率，暂时无法判断"}；②最小余额优先指向${smallestDebt ? debtDisplayName(smallestDebt, locale) : "—"}；③现金流安全优先${urgentTarget ? `先处理${debtDisplayName(urgentTarget, locale)}的“${paymentStatusName(urgentTarget.paymentStatus, locale)}”状态` : cashflowTarget ? `先看${debtDisplayName(cashflowTarget, locale)}，但要先保证最低还款和生活开销` : "暂无可比较债务"}。${monthlyCashflow === null ? "你还没补齐月收入与日常开销，所以不能计算安全加还金额。" : monthlyCashflow <= 0 ? "当前月度余量不为正，不建议安排额外还款，先稳定现金流。" : `当前测算月余 ${fullMoney(monthlyCashflow, displayCurrency)}，它只是上限参考，不等于应全部拿去还款。`} 合同费用仍需从账单或债权方核实。`
        : `Three lenses give different answers: (1) highest APR ${avalancheTarget ? `points to ${debtDisplayName(avalancheTarget, locale)} at ${avalancheTarget.apr}%` : "cannot be compared until APRs are added"}; (2) smallest balance points to ${smallestDebt ? debtDisplayName(smallestDebt, locale) : "—"}; (3) cash-flow safety ${urgentTarget ? `first flags ${debtDisplayName(urgentTarget, locale)} as ${paymentStatusName(urgentTarget.paymentStatus, locale)}` : cashflowTarget ? `looks first at ${debtDisplayName(cashflowTarget, locale)}, after essential costs and minimums` : "has no open debt to compare"}. ${monthlyCashflow === null ? "Income and living costs are incomplete, so no safe extra amount can be calculated." : monthlyCashflow <= 0 ? "Month-left is not positive, so stabilize cash flow before planning extras." : `Estimated month-left is ${fullMoney(monthlyCashflow, displayCurrency)}; it is a ceiling reference, not an instruction to spend it all.`} Verify contract fees with the statement or creditor.`;
    } else if (stressIntent) {
      answer = locale === "zh"
        ? `先不用一次解决全部。你已经把 ${debts.length} 笔债务从脑子里搬到了可见的地图上。今天只选一个最小动作：核对最近还款日、补一张账单，或联系一个可信任的人陪你看材料。如果你觉得自己可能伤害自己或无法保证安全，请立即联系当地紧急服务或可信任的人；债务问题可以延后，安全不能。`
        : `You do not need to solve everything at once. You have moved ${debts.length} debts from your head onto a visible map. Pick one small action today: verify the nearest due date, collect one statement, or ask a trusted person to sit with you. If you may harm yourself or cannot stay safe, contact local emergency help or someone you trust now; debt can wait, safety cannot.`;
    } else if (worldIntent) {
      answer = locale === "zh"
        ? "世界数据页目前只会显示明确标注的 5 个演示角色。真实故事至少达到 30 个审核样本后，才公布债务类型和还款方式的聚合；永远不公开“某个人欠得最多”的羞辱榜。打开顶部“真实世界”可以查看当前门槛。"
        : "World Data currently shows only five clearly labeled demo characters. Real debt-type and repayment-method aggregates unlock after 30 reviewed stories. There is never a shaming leaderboard for an individual who owes the most. Open Real World in the top bar to see the threshold.";
    } else {
      answer = locale === "zh"
        ? `我看到你的总负债约为 ${fullMoney(totalBalance, displayCurrency)}，固定月还约 ${fullMoney(totalMonthly, displayCurrency)}${largestDebt ? `，最大来源是${debtDisplayName(largestDebt, locale)}（${largestDebtShare}%）` : ""}。建议下一步：①核对最近一笔账单的最新本金；②确认本月基本生活开销已留出；③只为最紧迫的一笔写下一个可执行动作。你可以继续问我“先还哪笔”“提前还款前查什么”或“收到催收通知怎么办”。`
        : `I see about ${fullMoney(totalBalance, displayCurrency)} total debt and ${fullMoney(totalMonthly, displayCurrency)} in fixed monthly payments${largestDebt ? `; the largest source is ${debtDisplayName(largestDebt, locale)} (${largestDebtShare}%)` : ""}. Next: verify one latest principal statement, protect essential living costs, and write one action for the most urgent debt. Ask “which first,” “what to check before prepaying,” or “what do I do with a collection notice?”`;
    }
    return answer;
  };

  const applyAdvisorDraft = (draft: AdvisorDebtDraft) => {
    setDraftKind(draft.kind ?? "other");
    setDraftCustomLabel(draft.customLabel ?? "");
    setDraftCurrency(draft.currency ?? displayCurrency);
    setDraftOriginal(draft.original === null ? "" : String(Math.round(draft.original)));
    setDraftBalance(draft.balance === null ? "" : String(Math.round(draft.balance)));
    setDraftMonthly(draft.monthly === null ? "" : String(Math.round(draft.monthly)));
    setDraftApr(draft.apr === null ? "" : String(draft.apr));
    setDraftMinimumPayment(draft.minimumPayment === null ? "" : String(Math.round(draft.minimumPayment)));
    setDraftPaymentStatus(draft.paymentStatus);
    setDraftRemainingMonths(draft.remainingMonths === null ? "" : String(Math.round(draft.remainingMonths)));
    setDraftDueDay(draft.dueDay === null ? "" : String(Math.round(draft.dueDay)));
    setDraftMethod(draft.method ?? "");
    setDraftSharingMode("private");
    addMessage(
      "guide",
      locale === "zh"
        ? "我已把这笔内容带入录入表单，但尚未保存。请逐项核对，确认后才会进入你的债务档案。"
        : "I moved this draft into the entry form, but nothing is saved yet. Review every field before confirming it.",
    );
    setGuideStep(draft.kind ? "amount" : "type");
    setAdvisorResult(null);
    setGuideOpen(true);
  };

  const askKian = async (event: FormEvent) => {
    event.preventDefault();
    const question = advisorInput.trim();
    if (!question || advisorLoading) return;
    if (cloudState === "synced" && !advisorConsent) {
      setAdvisorError(locale === "zh"
        ? "请先确认下方的 AI 隐私说明，再发送问题。"
        : "Confirm the AI privacy notice below before sending.");
      return;
    }
    addMessage("user", question);
    setAdvisorInput("");
    setAdvisorError("");
    setAdvisorResult(null);
    if (cloudState !== "synced") {
      window.setTimeout(() => addMessage("guide", localAdvisorAnswer(question)), 180);
      setAdvisorError(locale === "zh"
        ? "当前大世界连接尚未完成，暂时使用本机规则分析。刷新后可再次连接真实 AI。"
        : "The shared-world connection is not ready, so the on-device guide is active. Refresh to reconnect real AI.");
      return;
    }
    setAdvisorLoading(true);
    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, locale }),
      });
      const data = await response.json() as AdvisorResult & { error?: string };
      if (!response.ok || !data.reply) {
        throw new Error(data.error ?? (locale === "zh" ? "AI 暂时无法回答。" : "AI is temporarily unavailable."));
      }
      const actionText = data.actions.length
        ? `\n${data.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}`
        : "";
      const nextText = data.nextQuestion
        ? `\n\n${locale === "zh" ? "只补充这一项：" : "One thing to add:"} ${data.nextQuestion}`
        : "";
      addMessage("guide", `${data.reply}${actionText}${nextText}`);
      setAdvisorResult(data);
    } catch (error) {
      addMessage("guide", localAdvisorAnswer(question));
      setAdvisorError(
        `${error instanceof Error ? error.message : (locale === "zh" ? "AI 连接失败。" : "AI connection failed.")} ${
          locale === "zh" ? "已切换为本机规则分析，系统不会自动重试联网请求。" : "Switched to on-device rules; the system will not automatically retry the network request."
        }`,
      );
    } finally {
      setAdvisorLoading(false);
    }
  };

  const saveDebtChanges = async (event: FormEvent) => {
    event.preventDefault();
    if (!debtEdit) return;
    const nextDebt: Debt = {
      ...debtEdit,
      original: Math.max(Number(debtEdit.original), Number(debtEdit.balance)),
      balance: Math.max(0, Number(debtEdit.balance)),
      monthly: Math.max(0, Number(debtEdit.monthly)),
      apr: debtEdit.apr === null || debtEdit.apr === undefined ? null : Math.min(1_000, Math.max(0, Number(debtEdit.apr))),
      minimumPayment: debtEdit.minimumPayment === null || debtEdit.minimumPayment === undefined ? null : Math.max(0, Number(debtEdit.minimumPayment)),
      paymentStatus: debtEdit.paymentStatus ?? "unknown",
      remainingMonths: debtEdit.remainingMonths === null || debtEdit.remainingMonths === undefined ? null : Math.min(1_200, Math.max(1, Math.round(Number(debtEdit.remainingMonths)))),
      dueDay: Math.min(31, Math.max(1, Number(debtEdit.dueDay))),
      method: debtEdit.method.trim().slice(0, 80),
      customLabel: debtEdit.kind === "other" ? debtEdit.customLabel?.trim().slice(0, 80) : undefined,
    };
    if (cloudState === "synced") {
      setCloudState("syncing");
      try {
        const response = await fetch("/api/debts", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextDebt),
        });
        if (!response.ok) throw new Error("Cloud debt update failed");
        setCloudState("synced");
      } catch {
        setCloudState("error");
        return;
      }
    }
    setDebts((current) => current.map((debt) => debt.id === nextDebt.id ? nextDebt : debt));
    setEditingDebt(false);
  };

  const deleteDebt = async (debtId: string) => {
    if (cloudState === "synced") {
      setCloudState("syncing");
      try {
        const response = await fetch(`/api/debts?id=${encodeURIComponent(debtId)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error("Cloud debt delete failed");
        setCloudState("synced");
      } catch {
        setCloudState("error");
        return;
      }
    }
    setDebts((current) => current.filter((debt) => debt.id !== debtId));
    setSelectedDebt(null);
  };

  const resetExperience = () => {
    if (cloudState === "synced" || cloudState === "syncing") {
      setGuideStep("intro");
      setMessages([{ role: "guide", text: g.intro }]);
      setGuideOpen(true);
      return;
    }
    window.localStorage.removeItem(storageKey); setDebts([]); setProfile(defaultProfile(locale)); setPosition({ x: 47, y: 63 }); setDiscoveryConsent(false); setSentNpcLights([]); setCountryGateOpen(true); setGuideStep("intro"); setMessages([{ role: "guide", text: g.intro }]); setGuideOpen(true);
  };

  const startListening = (target: "pressure" | "advisor" = "pressure") => {
    type Recognition = { lang: string; interimResults: boolean; start: () => void; onresult: null | ((event: { results: { 0: { transcript: string } }[] }) => void); onend: null | (() => void); onerror: null | (() => void) };
    const SpeechCtor = (window as typeof window & { webkitSpeechRecognition?: new () => Recognition; SpeechRecognition?: new () => Recognition }).SpeechRecognition ?? (window as typeof window & { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!SpeechCtor) {
      const note = locale === "zh" ? "当前浏览器不支持语音输入，请先打字。" : "Voice input is not supported here. Please type.";
      if (target === "advisor") setAdvisorInput((current) => current || note); else setPressureInput((current) => current || note);
      return;
    }
    const recognition = new SpeechCtor(); recognition.lang = locale === "zh" ? "zh-CN" : "en-US"; recognition.interimResults = false; recognition.onresult = (event) => target === "advisor" ? setAdvisorInput(event.results[0][0].transcript) : setPressureInput(event.results[0][0].transcript); recognition.onend = () => setListening(false); recognition.onerror = () => setListening(false); setListening(true); recognition.start();
  };

  const speakLatest = () => {
    const latest = [...messages].reverse().find((message) => message.role === "guide");
    if (!latest || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(latest.text); utterance.lang = locale === "zh" ? "zh-CN" : "en-US"; window.speechSynthesis.speak(utterance);
  };

  const dateLabel = now ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric", weekday: "short" }).format(now) : "—";
  const storageLabel = cloudState === "synced"
    ? (locale === "zh" ? "已进入成长中的大世界" : "Inside the growing shared world")
    : cloudState === "syncing" || cloudState === "checking"
      ? (locale === "zh" ? "正在更新大世界" : "Updating the shared world")
      : (locale === "zh" ? "大世界连接需要重试" : "Shared-world connection needs a retry");
  const advisorProviderName = advisorReadiness?.provider === "minimax"
    ? "MiniMax"
    : advisorReadiness?.provider === "openai"
      ? "OpenAI"
      : (locale === "zh" ? "当前配置的 AI 服务商" : "the configured AI provider");
  const advisorModeLabel = cloudState === "synced"
    ? advisorReadiness?.configured
      ? (locale === "zh" ? `真实 AI · ${advisorProviderName}` : `Real AI · ${advisorProviderName}`)
      : advisorReadiness
        ? (locale === "zh" ? "真实 AI · 待连接" : "Real AI · setup needed")
        : (locale === "zh" ? "真实 AI · 检查中" : "Real AI · checking")
    : t.aiMode;

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <div className="game-brand"><span className="planet-mark">◒</span><div><strong>{t.brand}</strong><small className="rotating-slogan" key={sloganIndex}>{rotatingSlogans[locale][sloganIndex]}</small></div></div>
        <div className="world-date"><span className="live-dot" />{dateLabel}</div>
        <div className="top-actions"><button className="country-switch" title={countryName(profile.countryCode, profile.countryName, locale)} onClick={openCountryChooser}>{countryFlag(profile.countryCode)} {displayCurrency}</button><button className="planner-open" onClick={() => setMobilePlannerOpen(true)}>◷ {locale === "zh" ? "还款计划" : "Planner"}</button><button className="community-open" onClick={() => setCommunityOpen(true)}>◎ {locale === "zh" ? "大世界" : "Shared world"}</button><button className="invite-open" onClick={() => setAccountOpen(true)}>✦ {locale === "zh" ? "邀请" : "Invite"}</button><a className="builder-open" href={locale === "zh" ? "/contribute" : "/en/contribute"}>▦ {locale === "zh" ? "共建" : "Build"}</a><button className="feedback-open" onClick={() => setFeedbackOpen(true)}>✎ {locale === "zh" ? "反馈" : "Feedback"}</button>{adminAvailable && <a className="admin-open admin-page-link" href="/admin">⌁ {locale === "zh" ? "管理后台" : "Admin"}</a>}<button className="account-open" onClick={() => setAccountOpen(true)}>♙ {locale === "zh" ? "账号" : "Account"}</button><span className={`vault-status vault-${cloudState}`}>◉ {storageLabel}</span><a className="safety-link" href={locale === "zh" ? "/safety" : "/en/safety"}>◇ {locale === "zh" ? "安全" : "Safety"}</a><a className="locale-link" href={locale === "zh" ? "/en" : "/"}>{locale === "zh" ? "EN" : "中文"}</a><button className="kian-pet-button" onClick={() => { if (debts.length) setGuideStep("done"); setGuideOpen(true); }}><span className="golden-dog">🐕<i>▰</i></span><b>{locale === "zh" ? "小岸" : "Kian"}</b><small>{shoreProgress ? `✦ ${locale === "zh" ? "上岸值" : "Shore"} ${shoreProgress.shoreValue} · ✧ ${shoreProgress.starlight.available}` : (locale === "zh" ? "聊聊创建角色" : "Talk and build")}</small></button></div>
      </header>

      <section className="game-layout">
        <aside className="debt-hud">
          <p className="hud-kicker">MY REALITY · {t.edit}</p>
          <div className="hud-total"><small>{t.total} · {displayCurrency}</small><strong>{debts.length ? money(totalBalance, displayCurrency) : "—"}</strong><span>{debts.length} {locale === "zh" ? "笔债务" : debts.length === 1 ? "debt" : "debts"}</span></div>
          <div className="shore-reward-meter">
            <div><span>✦ {locale === "zh" ? "上岸值" : "SHORE VALUE"}</span><strong>{shoreProgress?.shoreValue ?? 0}</strong></div>
            <div><span>✧ {locale === "zh" ? "可赠星光" : "STARLIGHT"}</span><strong>{shoreProgress?.starlight.available ?? 0}</strong></div>
            <small>{locale === "zh" ? "每次真实还款确认：+5 上岸值、+1 星光" : "Each verified payment: +5 shore value and +1 starlight"}</small>
          </div>
          <div className="hud-metrics"><div><small>{t.monthly}</small><strong>{debts.length ? money(totalMonthly, displayCurrency) : "—"}</strong></div><div><small>{t.next}</small><strong>{upcoming[0] && now ? (dayDiff(upcoming[0].date, now) === 0 ? t.today : `${dayDiff(upcoming[0].date, now)} ${t.days}`) : "—"}</strong></div></div>
          <button className="hud-focus-card" onClick={() => setSelectedSelf(true)}>
            <span>{locale === "zh" ? "最大欠款来源" : "LARGEST DEBT SOURCE"}</span>
            <strong>{largestDebt ? debtDisplayName(largestDebt, locale) : "—"}</strong>
            <em>{largestDebt ? `${money(largestDebtValue, displayCurrency)} · ${largestDebtShare}%` : (locale === "zh" ? "录入后自动识别" : "Identified after entry")}</em>
          </button>
          <button className={`hud-cashflow ${monthlyCashflow !== null && monthlyCashflow < 0 ? "cashflow-negative" : ""}`} onClick={() => setSelectedSelf(true)}>
            <span>{locale === "zh" ? "每月现金流" : "MONTHLY CASHFLOW"}</span>
            {profile.monthlyIncome > 0 ? (
              <><strong>{monthlyCashflow! >= 0 ? "+" : "−"}{money(Math.abs(monthlyCashflow!), displayCurrency)}</strong><small>{locale === "zh" ? `收入 ${money(profile.monthlyIncome, displayCurrency)} − 日常 ${money(profile.monthlyExpenses, displayCurrency)} − 还款 ${money(totalMonthly, displayCurrency)}` : `Income ${money(profile.monthlyIncome, displayCurrency)} − living ${money(profile.monthlyExpenses, displayCurrency)} − debt ${money(totalMonthly, displayCurrency)}`}</small></>
            ) : (
              <><strong>—</strong><small>{locale === "zh" ? "补充收入与日常开销后显示" : "Add income and living costs to see this"}</small></>
            )}
          </button>
          <div className="debt-stack">
            {debts.map((debt) => {
              const progress = debt.original > 0 ? Math.round((1 - debt.balance / debt.original) * 100) : 0;
              return <button key={debt.id} className={`debt-mini-card ${largestDebt?.id === debt.id ? "debt-mini-primary" : ""}`} onClick={() => setSelectedDebt(debt.id)} title={`${fullMoney(debt.balance, debt.currency)} → ${fullMoney(toDisplay(debt.balance, debt.currency), displayCurrency)}`}><span className={`kind-dot kind-${debt.kind}`} /><div><strong>{debtDisplayName(debt, locale)} {largestDebt?.id === debt.id && <b>{locale === "zh" ? "最大" : "TOP"}</b>}</strong><small>≈ {fullMoney(toDisplay(debt.balance, debt.currency), displayCurrency)}</small></div><i>{progress}%</i></button>;
            })}
            {!debts.length && <p className="empty-debts">{t.noDebt}</p>}
          </div>
          <button className="add-debt-button" onClick={() => { setGuideOpen(true); setGuideStep(debts.length ? "type" : "intro"); }}>＋ {t.add}</button>
          <small className="add-debt-note">{locale === "zh" ? "每笔债务单独添加、单独改余额 / 利率 / 月还款。也可以直接点角色旁的标签调整。" : "Add and edit each debt separately—balance, APR, and monthly payment. You can also open any orbiting label."}</small>
          <button className="community-hud-button" onClick={() => setCommunityOpen(true)}>◎ {locale === "zh" ? "真实世界 · 故事与数据" : "REAL WORLD · STORIES & DATA"}</button>
          <a className="safety-hud-link" href={locale === "zh" ? "/safety" : "/en/safety"}>◇ {locale === "zh" ? "安全中心 · 隐私、规则与删除" : "SAFETY CENTER · PRIVACY, RULES & DELETION"}</a>
          <div className="hud-tip"><span>⌨</span><p><strong>{t.walk}</strong>{t.talk}</p></div>
        </aside>

        <div className="world-wrap">
          <div className="world-stage" aria-label={locale === "zh" ? "可移动、缩放和拖动的债务世界" : "Walkable, zoomable, pannable debt world"}>
            <div className="world-growth-status"><b>◉ {locale === "zh" ? "共同大世界正在生长" : "THE SHARED WORLD IS GROWING"}</b><span>{worldPulse.population} {locale === "zh" ? "位行者" : "walkers"} · {worldPulse.recordedDebts} {locale === "zh" ? "笔债务" : "debts"} · {worldPulse.confirmedPayments} {locale === "zh" ? "次真实还款" : "confirmed payments"} · {worldPulse.countries} {locale === "zh" ? "个国家/地区" : "countries/regions"}</span></div>
            <div className={`world-canvas ${worldDragging ? "is-dragging" : ""}`} style={{ transform: `translate(${worldPan.x}px, ${worldPan.y}px) scale(${worldZoom})` }} onPointerDown={beginWorldPan} onPointerMove={moveWorldPan} onPointerUp={endWorldPan} onPointerCancel={endWorldPan}>
            <div className="world-noise" /><div className="road road-a" /><div className="road road-b" /><div className="road road-c" />
            <div className={`district district-home growth-tier-${worldPulse.districts.find((item) => item.key === "mortgage")?.tier ?? 0}`}><span>⌂</span><strong>{locale === "zh" ? "住房山丘" : "HOUSING HILL"}</strong><small>{worldPulse.districts.find((item) => item.key === "mortgage")?.count ?? (locale === "zh" ? "成长中" : "GROWING")}</small></div>
            <div className={`district district-card growth-tier-${worldPulse.districts.find((item) => item.key === "card")?.tier ?? 0}`}><span>▤</span><strong>{locale === "zh" ? "循环信贷街" : "REVOLVING ROW"}</strong><small>{worldPulse.districts.find((item) => item.key === "card")?.count ?? (locale === "zh" ? "成长中" : "GROWING")}</small></div>
            <div className={`district district-study growth-tier-${worldPulse.districts.find((item) => item.key === "education")?.tier ?? 0}`}><span>◒</span><strong>{locale === "zh" ? "教育港" : "EDUCATION HARBOR"}</strong><small>{worldPulse.districts.find((item) => item.key === "education")?.count ?? (locale === "zh" ? "成长中" : "GROWING")}</small></div>
            <div className="district district-calm"><span>≈</span><strong>{locale === "zh" ? "缓冲花园" : "BREATHING GARDEN"}</strong></div>
            <div className="district district-real"><span>✦</span><strong>{locale === "zh" ? "真实灯塔" : "REAL STORY LIGHTHOUSE"}</strong></div>

            {npcData.map((npc) => {
              const primary = npc.debts[0];
              const share = Math.round((primary.amount / npc.amount) * 100);
              const leftover = npc.income - npc.expenses - npc.monthly;
              const lightCount = npc.lights + (sentNpcLights.includes(npc.id) ? 1 : 0);
              const tier = lightTier(lightCount);
              return (
                <button key={npc.id} className={`npc ${nearNpc?.id === npc.id ? "npc-near" : ""} ${lightFeedbackNpc === npc.id ? "npc-light-burst" : ""}`} style={{ left: `${npc.x}%`, top: `${npc.y}%` }} onClick={() => setSelectedNpc(npc.id)}>
                  <span className="npc-tag">
                    <span className="npc-tag-label">{locale === "zh" ? "总欠款" : "TOTAL DEBT"}</span>
                    <strong>{money(toDisplay(npc.amount, npc.currency), displayCurrency)}</strong>
                    <b>{locale === "zh" ? "最大" : "TOP"} · {kindNames[primary.kind][locale]} {share}%</b>
                    <i className={leftover < 0 ? "negative" : ""}>{locale === "zh" ? "月余" : "LEFT"} {leftover >= 0 ? "+" : "−"}{money(Math.abs(toDisplay(leftover, npc.currency)), displayCurrency)}</i>
                  </span>
                  <span className={`npc-light-ground light-tier-${tier}`} aria-hidden="true"><i/><i/><i/><i/><i/><i/></span>
                  <BurdenLift count={lightCount}/>
                  <CharacterAvatar className="npc-character" badge={npc.flag} color={npc.color} skin={npc.skin} hair={npc.hair} bodyShape={npc.burden >= 35 ? "burdened" : npc.repaid >= 40 ? "rising" : "steady"} outfit={npc.repaid >= 40 ? "near-shore" : npc.burden >= 35 ? "heavy" : "steady"} burdenIcon={debtBurdenIcons[primary.kind]} chainLevel={npc.burden >= 40 ? 4 : npc.burden >= 28 ? 3 : npc.burden >= 18 ? 2 : 1}/>
                  <small className="npc-name">{npc.name}<b>✦ {lightCount}</b></small>
                  {nearNpc?.id === npc.id && <em>{locale === "zh" ? "空格查看" : "SPACE"}</em>}
                </button>
              );
            })}

            {sharedWalkers.filter((walker) => !walker.isMine).map((walker) => {
              const stageNames: Record<SharedWalker["repaymentStage"], Record<Locale, string>> = {
                setting_up: { zh: "正在创建计划", en: "SETTING UP" },
                mapped: { zh: "已看清全貌", en: "MAPPED" },
                started: { zh: "已经开始", en: "STARTED" },
                moving: { zh: "持续前进", en: "MOVING" },
                near_shore: { zh: "接近上岸", en: "NEAR SHORE" },
              };
              const debtBandNames: Record<SharedWalker["debtCountBand"], Record<Locale, string>> = {
                none: { zh: "尚未录入债务", en: "NO DEBT ADDED" },
                single: { zh: "一类压力", en: "ONE DEBT PATH" },
                multiple: { zh: "多笔债务", en: "MULTIPLE DEBTS" },
              };
              return <button key={walker.id} className={`npc shared-walker-npc ${nearSharedWalker?.id === walker.id ? "npc-near" : ""}`} style={{ left: `${walker.x}%`, top: `${walker.y}%` }} onClick={() => setSelectedSharedWalker(walker.id)}>
                <span className="npc-tag shared-walker-tag"><span className="npc-tag-label">◉ {locale === "zh" ? "真实共享角色" : "REAL SHARED WALKER"}</span><strong>{walker.debtCountBand === "none" ? (locale === "zh" ? "正在整理" : "SETTING UP") : kindNames[walker.primaryDebtKind]?.[locale] ?? kindNames.other[locale]}</strong><b>{debtBandNames[walker.debtCountBand][locale]}</b><i>{stageNames[walker.repaymentStage][locale]}</i></span>
                <CharacterAvatar className="npc-character" badge={countryFlag(walker.countryCode)} color={walker.color} skin={walker.skin} hair={walker.hair} bodyShape={walker.repaymentStage === "near_shore" ? "rising" : walker.debtCountBand === "multiple" ? "burdened" : "steady"} outfit={walker.repaymentStage === "near_shore" ? "near-shore" : walker.debtCountBand === "multiple" ? "heavy" : "steady"} burdenIcon={walker.debtCountBand === "none" ? "" : debtBurdenIcons[walker.primaryDebtKind]}/>
                <small className="npc-name"><span>{walker.anonymousName}</span><b>◉</b></small>
                {nearSharedWalker?.id === walker.id && <em>{locale === "zh" ? "空格查看" : "SPACE"}</em>}
              </button>;
            })}

            {worldStories.map((story) => {
              const tier = lightTier(story.encouragementCount);
              return <button key={story.id} className={`npc community-npc ${nearWorldStory?.id === story.id ? "npc-near" : ""} ${lightFeedbackStory === story.id ? "npc-light-burst" : ""}`} style={{ left: `${story.x}%`, top: `${story.y}%` }} onClick={() => { setWorldLightMessage(""); setSelectedWorldStory(story.id); }}>
                <span className="npc-tag real-story-tag"><span className="npc-tag-label">✓ {locale === "zh" ? "审核通过的真实故事" : "REVIEWED REAL STORY"}</span><strong>≈ {displayStoryAmountBand(story)}</strong><b>{kindNames[story.debtKind]?.[locale] ?? kindNames.other[locale]}</b><i>✦ {story.encouragementCount}</i></span>
                <span className={`npc-light-ground light-tier-${tier}`} aria-hidden="true"><i/><i/><i/><i/><i/><i/></span>
                <BurdenLift count={story.encouragementCount}/>
                <CharacterAvatar className="npc-character" badge={countryFlag(story.countryCode)} color={story.color} skin={story.skin} hair={story.hair} burdenIcon={debtBurdenIcons[story.debtKind]}/>
                <small className="npc-name"><span>{story.anonymousName}</span><b>✦ {story.encouragementCount}</b></small>
                {nearWorldStory?.id === story.id && <em>{locale === "zh" ? "空格查看" : "SPACE"}</em>}
              </button>;
            })}

            {!sharedWalkers.filter((walker) => !walker.isMine).length && !worldStories.length && <button className="real-world-empty" onClick={() => setCommunityOpen(true)}><b>✦</b><span>{locale === "zh" ? "等待下一位真实行者" : "Waiting for the next real walker"}</span><small>{locale === "zh" ? "注册角色会先以隐私安全的轮廓进入世界" : "New roles enter first as privacy-safe silhouettes"} →</small></button>}

            <div className={`player facing-${facing}`} style={{ left: `${position.x}%`, top: `${position.y}%` }}>
              <span className="player-self-marker">✦ {locale === "zh" ? "我的角色" : "YOU"}{nearShore ? ` · ${locale === "zh" ? "快上岸" : "NEAR SHORE"}` : ""}</span>
              {orbitDebts.map((debt, index) => {
                const side = index % 2 === 0 ? 1 : -1;
                const row = Math.floor(index / 2);
                const orbitX = side * 150;
                const orbitY = -24 + row * 74;
                const progress = debt.original ? Math.max(0, Math.round((1 - debt.balance / debt.original) * 100)) : 0;
                return <button key={debt.id} className={`orbit-label ${largestDebt?.id === debt.id ? "orbit-primary" : ""}`} style={{ "--orbit-x": `${orbitX}px`, "--orbit-y": `${orbitY}px`, "--debt-progress": `${progress * 3.6}deg` } as React.CSSProperties} onClick={() => setSelectedDebt(debt.id)}><span>{largestDebt?.id === debt.id ? `${locale === "zh" ? "最大来源" : "TOP SOURCE"} · ` : ""}{debtDisplayName(debt, locale)}</span><strong>{money(toDisplay(debt.balance, debt.currency), displayCurrency)}</strong><i>{progress}%</i></button>;
              })}
              {debts.length > orbitDebts.length && <button className="orbit-more-label" onClick={() => setSelectedSelf(true)}>+{debts.length - orbitDebts.length} {locale === "zh" ? "笔 · 打开全貌" : "MORE · OPEN PROFILE"}</button>}
              <button className="player-total-debt" onClick={() => setSelectedSelf(true)}>
                <small>{locale === "zh" ? "我的总负债 · 点击看全貌" : "MY TOTAL DEBT · OPEN PROFILE"}</small>
                <strong>{debts.length ? money(totalBalance, displayCurrency) : fullMoney(0, displayCurrency)}</strong>
                <span>{largestDebt ? `${locale === "zh" ? "最大" : "TOP"} ${debtDisplayName(largestDebt, locale)} ${largestDebtShare}%` : (locale === "zh" ? "暂无债务" : "NO DEBT")}</span>
                {monthlyCashflow !== null && <i className={monthlyCashflow < 0 ? "negative" : ""}>{locale === "zh" ? "月余" : "MONTH LEFT"} {monthlyCashflow >= 0 ? "+" : "−"}{money(Math.abs(monthlyCashflow), displayCurrency)}</i>}
              </button>
              <span className={`npc-light-ground player-light-ground light-tier-${selfLightTier}`} aria-hidden="true"><i/><i/><i/><i/><i/><i/></span>
              <BurdenLift count={selfLightCount}/>
              <div className="player-shadow"/><button className="player-avatar" onClick={() => setSelectedSelf(true)} aria-label={locale === "zh" ? "查看我的完整财务画像" : "Open my full financial profile"}><CharacterAvatar className="player-character" badge="✦" color={avatarColor} skin="#d99c73" hair="#2d211c" bodyShape={bodyShape} outfit={outfit} burdenIcon={largestDebt ? debtBurdenIcons[largestDebt.kind] : ""} chainLevel={chainLevel}/></button><strong className="player-name"><span>{profile.alias || (locale === "zh" ? "岸边的人" : "Shore Walker")}</span><b>✦ LV.{selfLightTier} · {selfLightCount}</b></strong>
              {nearNpc && <div className="proximity-line"/>}
            </div>

            <div className="world-message"><span>“</span><p>{t.worldTruth}</p></div>
            </div>
            <div className="world-zoom-controls" aria-label={locale === "zh" ? "地图缩放控制" : "Map zoom controls"}><button onClick={() => changeWorldZoom(-0.12)} aria-label={locale === "zh" ? "缩小地图" : "Zoom out"}>−</button><span>{Math.round(worldZoom * 100)}%</span><button onClick={() => changeWorldZoom(0.12)} aria-label={locale === "zh" ? "放大地图" : "Zoom in"}>＋</button><button onClick={() => { setWorldZoom(0.78); setWorldPan({ x: 0, y: 0 }); }}>{locale === "zh" ? "复位" : "Reset"}</button></div>
            {lightFeedbackNpc && <div className="light-feedback-toast" role="status" aria-live="polite"><b>✦ +1</b><span>{locale === "zh" ? `光已送达 ${npcData.find((npc) => npc.id === lightFeedbackNpc)?.name ?? ""}` : `Light reached ${npcData.find((npc) => npc.id === lightFeedbackNpc)?.name ?? ""}`}</span></div>}
            {lightFeedbackStory && <div className="light-feedback-toast real-light-toast" role="status" aria-live="polite"><b>✦ +1</b><span>{locale === "zh" ? `真实的一道光已送达 ${worldStories.find((story) => story.id === lightFeedbackStory)?.anonymousName ?? ""}` : `A real light reached ${worldStories.find((story) => story.id === lightFeedbackStory)?.anonymousName ?? ""}`}</span></div>}
            <div className="mobile-controls" aria-label={locale === "zh" ? "移动控制" : "Movement controls"}><button onClick={() => move(0,-3,"up")}>↑</button><button onClick={() => move(-3,0,"left")}>←</button><button onClick={() => move(3,0,"right")}>→</button><button onClick={() => move(0,3,"down")}>↓</button></div>
          </div>

          <div className="timeline-bar">
            <div className="timeline-title"><span>◷</span><div><strong>{t.monthlyLane}</strong><small>{cloudState === "synced" ? (locale === "zh" ? "共同世界已更新" : "Shared world updated") : (locale === "zh" ? "等待重新连接" : "Waiting to reconnect")}</small></div></div>
            <div className="timeline-items">{upcoming.slice(0,4).map(({ debt, date }) => <button key={debt.id} onClick={() => setSelectedDebt(debt.id)}><span>{date.getDate()}</span><div><strong>{debtDisplayName(debt, locale)}</strong><small>≈ {fullMoney(toDisplay(debt.monthly, debt.currency), displayCurrency)} · {debt.method}</small></div></button>)}{!upcoming.length && <p>{locale === "zh" ? "录入债务后，这里会按真实日期生成还款节点。" : "Real payment dates appear here after you add a debt."}</p>}</div>
          </div>
        </div>
      </section>

      {worldRulesOpen && <div className="world-rules-shade">
        <section className="world-rules-card">
          <p>DEBT WORLD · BEFORE YOU ENTER</p>
          <h2>{locale === "zh" ? "这里不是负债羞辱榜，是一张共同寻找出口的地图。" : "This is not a debt-shaming leaderboard. It is a shared map for finding routes out."}</h2>
          <div className="world-rule-grid">
            <article><b>01</b><strong>{locale === "zh" ? "只写真实情况" : "Use real circumstances"}</strong><span>{locale === "zh" ? "债务、收入与还款都由本人更新；系统不会假装进度前进。" : "Debt, income, and payments are self-updated; progress never moves by pretending."}</span></article>
            <article><b>02</b><strong>{locale === "zh" ? "债务不是人格" : "Debt is not identity"}</strong><span>{locale === "zh" ? "比较是为了找到相似处境的方法，不排名谁更惨或谁欠得最多。" : "Comparison is for finding peers and methods—not ranking misery or individuals."}</span></article>
            <article><b>03</b><strong>{locale === "zh" ? "隐私默认在你手里" : "Privacy stays in your hands"}</strong><span>{locale === "zh" ? "精确金额、收入和 AI 对话默认私密；公开故事要单独授权并审核。" : "Exact amounts, income, and AI chats stay private; public stories require separate permission and review."}</span></article>
            <article><b>04</b><strong>{locale === "zh" ? "小岸负责帮你拆开" : "Kian helps break it down"}</strong><span>{locale === "zh" ? "可以说“我不知道怎么还”。小岸会先整理事实、现金流和下一步问题，不保证结果。" : "You may say, ‘I do not know how to pay.’ Kian organizes facts, cash flow, and next questions without guaranteeing outcomes."}</span></article>
          </div>
          <button onClick={acceptWorldRules}>{locale === "zh" ? "我明白了，跟小岸聊聊创建角色" : "I understand—talk to Kian and build my person"} <span>→</span></button>
          <small>{locale === "zh" ? "进入后可拖动和缩放地图；所有画像问题都可以选择不回答。" : "Inside, drag and zoom the map. Every personal-profile question is optional."}</small>
        </section>
      </div>}

      {loaded && (countryGateOpen || !profile.countryCode) && (
        <div className="country-gate-shade">
          <section className="country-gate">
            {profile.countryCode && <button className="modal-close" onClick={() => setCountryGateOpen(false)} aria-label={t.close}>×</button>}
            <p className="detail-kicker">WORLD ENTRY · LOCAL CURRENCY</p>
            <h2>{locale === "zh" ? "先选择你所在的国家或地区" : "Choose your country or region first"}</h2>
            <p className="country-intro">{locale === "zh" ? "世界中的债务会统一换算成你熟悉的货币，方便理解不同国家普通人承受的真实重量。这里只需要国家，不需要城市或精确位置。" : "Debt across the world will be converted into a currency you understand. We need only a country—not a city or precise location."}</p>
            <form onSubmit={saveCountry}>
              <label>{locale === "zh" ? "国家或地区" : "Country or region"}
                <select value={draftCountryCode} onChange={(event) => changeCountry(event.target.value)}>
                  {countryOptions.map((country) => <option key={country.code} value={country.code}>{countryFlag(country.code)} {country[locale]}</option>)}
                </select>
              </label>
              {draftCountryCode === "OTHER" && <label>{locale === "zh" ? "输入国家或地区名称" : "Enter country or region"}<input required maxLength={80} value={draftCountryName} onChange={(event) => setDraftCountryName(event.target.value)}/></label>}
              <div className="country-budget-grid">
                <label>{locale === "zh" ? "用于理解金额的货币" : "Display currency"}
                  {draftCountryCode === "OTHER"
                    ? <input required minLength={3} maxLength={3} value={draftDisplayCurrency} onChange={(event) => setDraftDisplayCurrency(event.target.value.toUpperCase())}/>
                    : <input readOnly value={draftDisplayCurrency}/>}
                </label>
                <label>{locale === "zh" ? `每月到手收入（可选，${draftDisplayCurrency}）` : `Monthly take-home income (optional, ${draftDisplayCurrency})`}<input type="number" min="0" value={draftMonthlyIncome} onChange={(event) => setDraftMonthlyIncome(event.target.value)} placeholder={locale === "zh" ? "例如 32000" : "For example 32000"}/></label>
                <label>{locale === "zh" ? `每月日常生活开销（可选，${draftDisplayCurrency}）` : `Monthly living costs (optional, ${draftDisplayCurrency})`}<input type="number" min="0" value={draftMonthlyExpenses} onChange={(event) => setDraftMonthlyExpenses(event.target.value)} placeholder={locale === "zh" ? "房租、吃饭、交通等" : "Housing, food, transport, etc."}/></label>
              </div>
              <p className="budget-privacy-note">{locale === "zh" ? "收支默认只用于你自己的现金流视图；以后公开给其他人时会单独征求授权，并默认显示比例或区间。" : "Income and costs are used only in your own cashflow view. Any future public sharing will require separate consent and default to ranges or ratios."}</p>
              <p className="rate-note">{rateFallback
                ? (locale === "zh" ? "当前使用备用近似汇率；恢复联网后会自动更新。换算仅用于理解，不能用于结算。" : "Using approximate fallback rates until live rates return. Conversion is for understanding, not settlement.")
                : (locale === "zh" ? `参考汇率日期：${rateDate ?? "最近工作日"}。换算仅用于理解，不能用于结算。` : `Reference rate date: ${rateDate ?? "latest working day"}. Conversion is for understanding, not settlement.`)}</p>
              <button className="guide-primary" type="submit">{profile.countryCode ? (locale === "zh" ? "保存国家设置" : "Save country settings") : (locale === "zh" ? "进入负债世界" : "Enter the debt world")} <span>→</span></button>
            </form>
          </section>
        </div>
      )}

      {guideOpen && <div className="guide-panel">
        <div className="guide-header"><div className="guide-orb">✦</div><div><strong>{t.ai}</strong><small><span/> {advisorModeLabel}</small></div><button onClick={speakLatest} title={t.speak}>◖))</button><button onClick={() => setGuideOpen(false)} aria-label={t.close}>×</button></div>
        <div className="chat-stream">{messages.map((message,index) => <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}><span>{message.role === "guide" ? "✦" : profile.alias.slice(0,1)}</span><p>{message.text}</p></div>)}</div>
        <div className="guide-controls">
          {guideStep === "intro" && <><button className="guide-primary" onClick={begin}>{t.start} <span>→</span></button><button className="guide-demo" onClick={loadDemo}>{t.demo}</button></>}
          {guideStep === "identity" && <form onSubmit={saveIdentity} className="identity-form"><label>{t.alias}<input required value={aliasInput} onChange={(event) => setAliasInput(event.target.value)} maxLength={20}/></label><label>{t.region}<input required value={regionInput} onChange={(event) => setRegionInput(event.target.value)} maxLength={30}/></label><fieldset><legend>{locale === "zh" ? "可选画像 · 都可以不回答" : "Optional profile · skip any item"}</legend><div className="form-pair"><label>{locale === "zh" ? "年龄段" : "Age range"}<select value={ageBandInput} onChange={(event) => setAgeBandInput(event.target.value)}><option value="">{locale === "zh" ? "暂不填写" : "Skip"}</option>{ageBandOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label>{locale === "zh" ? "性别" : "Gender"}<select value={genderInput} onChange={(event) => setGenderInput(event.target.value)}><option value="">{locale === "zh" ? "暂不填写" : "Skip"}</option>{Object.entries(genderNames).map(([key, label]) => <option value={key} key={key}>{label[locale]}</option>)}</select></label></div><div className="form-pair"><label>MBTI<select value={mbtiInput} onChange={(event) => setMbtiInput(event.target.value)}><option value="">{locale === "zh" ? "不知道 / 暂不填写" : "Unknown / skip"}</option>{mbtiOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label>{locale === "zh" ? "星座" : "Zodiac"}<select value={zodiacInput} onChange={(event) => setZodiacInput(event.target.value)}><option value="">{locale === "zh" ? "不知道 / 暂不填写" : "Unknown / skip"}</option>{zodiacOptions.map((value) => <option value={value} key={value}>{zodiacNames[value][locale]}</option>)}</select></label></div><small>{locale === "zh" ? "它们不会改变财务建议，只用于个性化角色和达到隐私门槛后的匿名群体观察。" : "These do not change financial guidance; they personalize the character and may enter privacy-thresholded aggregates."}</small></fieldset><button className="guide-primary" type="submit">{t.send} <span>→</span></button></form>}
          {guideStep === "pressure" && <div className="diy-situation"><label className="pressure-box">{locale === "zh" ? "先自由描述你的情况" : "Describe your situation in your own words"}<textarea value={selfDescriptionInput} onChange={(event) => setSelfDescriptionInput(event.target.value)} maxLength={1200} placeholder={locale === "zh" ? "欠了多少、欠在哪里、发生了什么；不知道从哪里开始也可以照实写。" : "What you owe, where it sits, what happened—or simply say you do not know where to start."}/></label><label className="pressure-box">{t.pressure}<textarea value={pressureInput} onChange={(event) => setPressureInput(event.target.value)} maxLength={800}/></label><label>{locale === "zh" ? "你现在打算怎么还？没有办法也可以直接写" : "How do you plan to pay? It is okay to say there is no current way"}<textarea value={repaymentPlanInput} onChange={(event) => setRepaymentPlanInput(event.target.value)} maxLength={1200}/></label><label>{locale === "zh" ? "当前把握" : "Current outlook"}<select value={repaymentOutlookInput} onChange={(event) => setRepaymentOutlookInput(event.target.value)}>{Object.entries(outlookNames).map(([key, label]) => <option value={key} key={key}>{label[locale]}</option>)}</select></label><label>{locale === "zh" ? "有没有想尝试的增收或其他办法？" : "Any income changes or other routes you may try?"}<textarea value={incomePlanInput} onChange={(event) => setIncomePlanInput(event.target.value)} maxLength={800}/></label><div className="pressure-actions"><button className={`voice-button ${listening ? "listening" : ""}`} onClick={() => startListening("pressure")}>● {listening ? t.listening : t.voice}</button><button className="guide-primary" onClick={savePressure}>{t.send} <span>→</span></button></div><small className="voice-note">{t.localVoice}</small></div>}
          {guideStep === "type" && <div className="kind-picker">{(Object.keys(kindNames) as DebtKind[]).map((kind) => <button key={kind} onClick={() => chooseKind(kind)}><span className={`kind-dot kind-${kind}`}/>{kindNames[kind][locale]}</button>)}</div>}
          {guideStep === "amount" && <form onSubmit={saveAmount}>{draftKind === "other" && <label>{locale === "zh" ? "现有分类之外，你会怎么称呼它？" : "What would you call this debt?"}<input required maxLength={80} value={draftCustomLabel} onChange={(event) => setDraftCustomLabel(event.target.value)} placeholder={locale === "zh" ? "例如：欠朋友的钱、宠物医疗、签证借款" : "For example: money owed to a friend, pet care, visa loan"}/><small className="voice-note">{locale === "zh" ? "这个名称默认只属于你；是否匿名参与世界成长由你另行决定。" : "This label stays yours by default. You separately decide whether it can help the world grow."}</small></label>}<label>{locale === "zh" ? "币种" : "Currency"}<select value={draftCurrency} onChange={(event) => setDraftCurrency(event.target.value)}>{currencyOptions.map((currency) => <option key={currency}>{currency}</option>)}</select></label><div className="form-pair"><label>{t.amount}<input type="number" min="0" required value={draftOriginal} onChange={(event) => setDraftOriginal(event.target.value)}/></label><label>{t.balance}<input type="number" min="0" required value={draftBalance} onChange={(event) => setDraftBalance(event.target.value)}/></label></div><button className="guide-primary" type="submit">{t.send} <span>→</span></button></form>}
          {guideStep === "schedule" && <form onSubmit={saveDebt}>
            <div className="form-pair"><label>{t.payment}<input type="number" min="0" required value={draftMonthly} onChange={(event) => setDraftMonthly(event.target.value)}/></label><label>{t.due}<input type="number" min="1" max="31" required value={draftDueDay} onChange={(event) => setDraftDueDay(event.target.value)}/></label></div>
            <label>{t.method}<input required value={draftMethod} onChange={(event) => setDraftMethod(event.target.value)}/></label>
            <fieldset className="strategy-fields">
              <legend>{locale === "zh" ? "让还款路线更准确（不知道可留空）" : "Make the route more accurate (optional)"}</legend>
              <div className="form-pair"><label>{locale === "zh" ? "年利率 APR（%）" : "APR (%)"}<input type="number" min="0" max="1000" step="0.01" value={draftApr} onChange={(event) => setDraftApr(event.target.value)} placeholder={locale === "zh" ? "照账单填写" : "From statement"}/></label><label>{locale === "zh" ? `最低还款（${draftCurrency}）` : `Minimum payment (${draftCurrency})`}<input type="number" min="0" value={draftMinimumPayment} onChange={(event) => setDraftMinimumPayment(event.target.value)} placeholder={locale === "zh" ? "债权方要求的最低额" : "Required minimum"}/></label></div>
              <div className="form-pair"><label>{locale === "zh" ? "当前状态" : "Payment status"}<select value={draftPaymentStatus} onChange={(event) => setDraftPaymentStatus(event.target.value as DebtPaymentStatus)}><option value="unknown">{paymentStatusName("unknown", locale)}</option><option value="current">{paymentStatusName("current", locale)}</option><option value="late">{paymentStatusName("late", locale)}</option><option value="collection">{paymentStatusName("collection", locale)}</option></select></label><label>{locale === "zh" ? "合同剩余期数（月）" : "Remaining term (months)"}<input type="number" min="1" max="1200" step="1" value={draftRemainingMonths} onChange={(event) => setDraftRemainingMonths(event.target.value)} placeholder={locale === "zh" ? "不是系统估算" : "Stated term only"}/></label></div>
              <small>{locale === "zh" ? "月还款是你实际计划还多少；最低还款是债权方要求至少还多少。系统不会猜利率或结清时间。" : "Monthly payment is what you plan to pay; minimum payment is what the creditor requires. The system never guesses rates or payoff dates."}</small>
            </fieldset>
            <label>{locale === "zh" ? "这笔债务将来如何出现在匿名世界？" : "How may this debt appear in the future anonymous world?"}
              <select value={draftSharingMode} onChange={(event) => setDraftSharingMode(event.target.value as SharingMode)}>
                <option value="private">{locale === "zh" ? "🔒 仅自己可见（默认）" : "🔒 Only me (default)"}</option>
                <option value="range">{locale === "zh" ? "◫ 匿名金额区间，不公开精确数字" : "◫ Anonymous amount range, never exact"}</option>
              </select>
              <small className="sharing-note">{locale === "zh" ? "选择匿名金额区间只代表公开意愿；只有另行投稿并通过人工审核后，故事和金额区间才会进入世界。" : "Anonymous range sharing records your permission only. A story and its amount range enter the world only after a separate submission passes human review."}</small>
            </label>
            <button className="guide-primary" type="submit">{t.save} <span>＋</span></button>
          </form>}
          {guideStep === "more" && <div className="more-actions"><button className="guide-primary" onClick={addAnother}>{t.more} <span>＋</span></button><button className="guide-demo" onClick={finishGuide}>{t.done} →</button></div>}
          {guideStep === "done" && <div className="advisor-controls">
            <div className="advisor-snapshot"><strong>{locale === "zh" ? "小岸读到的当前轮廓" : "What Kian sees now"}</strong><span>{fullMoney(totalBalance, displayCurrency)} · {debts.length} {locale === "zh" ? "笔债务" : "debts"} · {monthlyCashflow === null ? (locale === "zh" ? "收支待补充" : "cashflow incomplete") : `${locale === "zh" ? "月余" : "month left"} ${fullMoney(monthlyCashflow, displayCurrency)}`}</span></div>
            <div className="advisor-prompts"><button onClick={() => setAdvisorInput(locale === "zh" ? "我应该先还哪一笔？" : "Which debt should I pay first?")}>{locale === "zh" ? "先还哪笔" : "Which first"}</button><button onClick={() => setAdvisorInput(locale === "zh" ? "提前还款前要检查什么？" : "What should I check before prepaying?")}>{locale === "zh" ? "提前还款" : "Prepayment"}</button><button onClick={() => setAdvisorInput(locale === "zh" ? "给我看看这个世界的数据" : "Show me the world data")}>{locale === "zh" ? "世界数据" : "World data"}</button></div>
            <form className="advisor-form" onSubmit={askKian}><label>{locale === "zh" ? "继续告诉小岸你的问题" : "Keep talking to Kian"}<textarea maxLength={1000} value={advisorInput} onChange={(event) => setAdvisorInput(event.target.value)} placeholder={locale === "zh" ? "也可以一次说出多笔：房贷还剩 400 万，每月 15 日还 13000；信用卡还剩……" : "You can describe several at once: mortgage balance…, card balance…, monthly payment…"}/></label><div><button type="button" className={`voice-button ${listening ? "listening" : ""}`} onClick={() => startListening("advisor")}>● {listening ? t.listening : t.voice}</button><button className="guide-primary" type="submit" disabled={!advisorInput.trim() || advisorLoading || (cloudState === "synced" && !advisorConsent)}>{advisorLoading ? (locale === "zh" ? "正在拆解…" : "Analyzing…") : (locale === "zh" ? "分析下一步" : "Analyze next step")} <span>→</span></button></div></form>
            {cloudState === "synced" && advisorReadiness && !advisorReadiness.configured && <p className="advisor-error">⌁ {locale === "zh" ? "服务器还没有读到可用的 AI 密钥；保存新密钥并发布环境更新后刷新本页。" : "The server cannot read an AI key yet. Save a new key, publish the environment update, then refresh."}</p>}
            {cloudState === "synced" ? <label className="advisor-consent"><input type="checkbox" checked={advisorConsent} onChange={(event) => { setAdvisorConsent(event.target.checked); setAdvisorError(""); }}/><span>{locale === "zh" ? `我知道：发送时，当前问题、必要的债务/收支摘要，以及我自愿填写的情况、还款/增收计划和可选画像会交给 ${advisorProviderName} 生成个性化回答；不会发送登录凭证、匿名昵称、精确城市或历史聊天，本站也不保存 AI 对话原文。` : `I understand that sending shares this question, the necessary debt/cashflow summary, and my optional situation, plans, and profile traits with ${advisorProviderName} for a personalized answer. Login credentials, aliases, precise cities, and chat history are excluded, and this site does not store AI conversation text.`}</span></label> : <button type="button" className="advisor-vault-needed" onClick={() => window.location.reload()}>{locale === "zh" ? "重新连接大世界与真实 AI" : "Reconnect the shared world and real AI"} →</button>}
            {advisorError && <p className="advisor-error">⌁ {advisorError}</p>}
            {advisorResult && <section className={`advisor-result advisor-risk-${advisorResult.risk}`}>
              <div className="advisor-result-head"><strong>{advisorResult.risk === "none" ? "✦" : "!"} {locale === "zh" ? "本次 AI 结果" : "AI result"}</strong><span>{advisorResult.provider === "minimax" ? "MiniMax" : "OpenAI"} · {locale === "zh" ? `今日还可用 ${advisorResult.remainingToday} 次` : `${advisorResult.remainingToday} left today`}</span></div>
              {!!advisorResult.drafts.length && <div className="advisor-drafts">
                <b>{locale === "zh" ? `识别到 ${advisorResult.drafts.length} 笔待确认债务` : `${advisorResult.drafts.length} unconfirmed debt draft(s)`}</b>
                {advisorResult.drafts.map((draft, index) => <article key={`${draft.kind ?? "unknown"}-${index}`}>
                  <div><strong>{draft.kind ? kindNames[draft.kind][locale] : (locale === "zh" ? "类型待补充" : "Type needed")}{draft.customLabel ? ` · ${draft.customLabel}` : ""}</strong><span>{draft.balance === null ? (locale === "zh" ? "余额待补充" : "Balance needed") : fullMoney(draft.balance, draft.currency ?? displayCurrency)}</span></div>
                  <p>{draft.monthly === null ? (locale === "zh" ? "月还待补充" : "Monthly payment needed") : `${locale === "zh" ? "月还" : "Monthly"} ${fullMoney(draft.monthly, draft.currency ?? displayCurrency)}`} · {draft.dueDay === null ? (locale === "zh" ? "日期待补充" : "Due date needed") : `${locale === "zh" ? "每月" : "day"} ${draft.dueDay} ${locale === "zh" ? "日" : ""}`} · {draft.method ?? (locale === "zh" ? "方式待补充" : "Method needed")}</p>
                  <p>{locale === "zh" ? "APR" : "APR"} {draft.apr === null ? "—" : `${draft.apr}%`} · {locale === "zh" ? "最低还款" : "minimum"} {draft.minimumPayment === null ? "—" : fullMoney(draft.minimumPayment, draft.currency ?? displayCurrency)} · {paymentStatusName(draft.paymentStatus, locale)} · {draft.remainingMonths === null ? (locale === "zh" ? "期数待补" : "term needed") : `${draft.remainingMonths} ${locale === "zh" ? "个月" : "months"}`}</p>
                  {!!draft.missingFields.length && <small>{locale === "zh" ? "仍需核对：" : "Still needed: "}{draft.missingFields.join(" · ")}</small>}
                  <button type="button" onClick={() => applyAdvisorDraft(draft)}>{locale === "zh" ? "带入表单并逐项确认" : "Review in the debt form"} →</button>
                </article>)}
              </div>}
            </section>}
            <small className="advisor-boundary">{cloudState === "synced" ? (locale === "zh" ? "真实 AI 只做压力梳理、信息拆解与教育性支持，不替代持牌财务顾问、律师或医生。涉及当地法律、合同费用和诉讼期限必须另行核实。" : "Real AI provides pressure mapping, fact organization, and educational support. It does not replace a qualified financial adviser, lawyer, or doctor. Verify local law, contract fees, and legal deadlines separately.") : (locale === "zh" ? "当前为本机规则分析；不会联网，也不会读取你的云端债务。" : "Currently using on-device rules. It does not call the network or read cloud debt data.")}</small>
            <button className="guide-demo" onClick={() => setGuideOpen(false)}>{t.explore} →</button>
          </div>}
        </div>
        <footer className="guide-footer"><span>▣ {storageLabel}</span><span>{t.notAdvice}</span></footer>
      </div>}

      <CommunityPanel
        open={communityOpen}
        locale={locale}
        debts={debts}
        cloudState={cloudState}
        onClose={() => setCommunityOpen(false)}
        onOpenVault={() => { setCommunityOpen(false); window.location.reload(); }}
        onSelectDebt={(id) => { setCommunityOpen(false); setSelectedDebt(id); }}
      />

      <AdminCommunityPanel
        open={adminOpen}
        locale={locale}
        onClose={() => setAdminOpen(false)}
        onChanged={() => setAdminRefreshKey((current) => current + 1)}
      />

      <FeedbackPanel
        open={feedbackOpen}
        locale={locale}
        cloudState={cloudState}
        onClose={() => setFeedbackOpen(false)}
        onOpenVault={() => { setFeedbackOpen(false); window.location.reload(); }}
      />

      <AccountPanel
        open={accountOpen}
        locale={locale}
        discoveryConsent={discoveryConsent}
        onClose={() => setAccountOpen(false)}
        onDiscoveryConsentChange={setDiscoveryConsent}
      />

      <BetaAdminPanel open={betaAdminOpen} locale={locale} onClose={() => setBetaAdminOpen(false)}/>

      {selectedSelf && (
        <div className="modal-shade" onMouseDown={() => setSelectedSelf(false)}>
          <section className="person-detail" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedSelf(false)}>×</button>
            <div className="person-detail-head">
              <div className="self-portrait"><CharacterAvatar className="self-portrait-character" badge="✦" color={avatarColor} skin="#d99c73" hair="#2d211c" bodyShape={bodyShape} outfit={outfit} burdenIcon={largestDebt ? debtBurdenIcons[largestDebt.kind] : ""} chainLevel={chainLevel}/><span>✦ {locale === "zh" ? `脚下光效 LV.${selfLightTier}` : `GROUND LIGHT LV.${selfLightTier}`}</span></div>
              <div>
                <p className="detail-kicker">{countryFlag(profile.countryCode)} {profile.alias} · {profile.region}</p>
                <h2>{locale === "zh" ? "我的现实全貌" : "MY REALITY AT A GLANCE"}</h2>
                <p>{locale === "zh" ? "世界里先显示结论；这里展开构成与每月现金流。" : "The world shows the headline. This profile opens the composition and monthly cashflow."}</p>
              </div>
            </div>

            <div className="profile-headline-grid">
              <div className="profile-total-card"><span>{locale === "zh" ? "总负债" : "TOTAL DEBT"}</span><strong>{fullMoney(totalBalance, displayCurrency)}</strong><small>{debts.length} {locale === "zh" ? "笔债务 · 已偿还" : "debts · repaid"} {overallProgress}%</small></div>
              <div className="profile-source-card"><span>{locale === "zh" ? "最大欠款来源" : "LARGEST SOURCE"}</span><strong>{largestDebt ? debtDisplayName(largestDebt, locale) : "—"}</strong><small>{largestDebt ? `${fullMoney(largestDebtValue, displayCurrency)} · ${largestDebtShare}%` : (locale === "zh" ? "暂无债务" : "No debt yet")}</small></div>
            </div>

            <section className="personal-profile-panel">
              <div className="section-title"><div><span>◌</span><strong>{locale === "zh" ? "我的个体画像" : "MY PERSONAL PROFILE"}</strong></div><em>{locale === "zh" ? "可随现实变化更新" : "Update as life changes"}</em></div>
              <div className="profile-trait-pills"><span>{profile.ageBand || (locale === "zh" ? "年龄段未填" : "Age not set")}</span><span>{profile.gender ? genderNames[profile.gender]?.[locale] : (locale === "zh" ? "性别未填" : "Gender not set")}</span><span>{profile.mbti || "MBTI —"}</span><span>{profile.zodiac ? zodiacNames[profile.zodiac]?.[locale] : (locale === "zh" ? "星座未填" : "Zodiac not set")}</span><span>{profile.repaymentOutlook ? outlookNames[profile.repaymentOutlook]?.[locale] : (locale === "zh" ? "还款把握未填" : "Outlook not set")}</span></div>
              <details><summary>{locale === "zh" ? "编辑画像与现实计划" : "Edit profile and real-life plan"}</summary><form className="personal-profile-form" onSubmit={saveProfileDetails}><div className="form-pair"><label>{locale === "zh" ? "年龄段" : "Age range"}<select name="ageBand" defaultValue={profile.ageBand}><option value="">{locale === "zh" ? "暂不填写" : "Skip"}</option>{ageBandOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label>{locale === "zh" ? "性别" : "Gender"}<select name="gender" defaultValue={profile.gender}><option value="">{locale === "zh" ? "暂不填写" : "Skip"}</option>{Object.entries(genderNames).map(([key, label]) => <option value={key} key={key}>{label[locale]}</option>)}</select></label></div><div className="form-pair"><label>MBTI<select name="mbti" defaultValue={profile.mbti}><option value="">{locale === "zh" ? "不知道 / 暂不填写" : "Unknown / skip"}</option>{mbtiOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label>{locale === "zh" ? "星座" : "Zodiac"}<select name="zodiac" defaultValue={profile.zodiac}><option value="">{locale === "zh" ? "不知道 / 暂不填写" : "Unknown / skip"}</option>{zodiacOptions.map((value) => <option value={value} key={value}>{zodiacNames[value][locale]}</option>)}</select></label></div><label>{locale === "zh" ? "我的整体情况" : "My situation"}<textarea name="selfDescription" maxLength={1200} defaultValue={profile.selfDescription}/></label><label>{locale === "zh" ? "现在打算怎么还" : "Current repayment plan"}<textarea name="repaymentPlan" maxLength={1200} defaultValue={profile.repaymentPlan}/></label><label>{locale === "zh" ? "当前把握" : "Current outlook"}<select name="repaymentOutlook" defaultValue={profile.repaymentOutlook}><option value="">{locale === "zh" ? "暂不填写" : "Skip"}</option>{Object.entries(outlookNames).map(([key, label]) => <option value={key} key={key}>{label[locale]}</option>)}</select></label><label>{locale === "zh" ? "增收或其他办法" : "Income or other routes"}<textarea name="incomePlan" maxLength={800} defaultValue={profile.incomePlan}/></label><button type="submit">{locale === "zh" ? "保存更新" : "Save update"}</button></form></details>
              <p>{locale === "zh" ? "角色体型、衣着、背负物与铁链由债务构成和真实进度生成，不用于羞辱或判断人格。铁链会随已确认的余额下降而减少。" : "Body, outfit, burden object, and chains reflect debt composition and verified progress—not personality or worth. Chains reduce as confirmed balances fall."}</p>
            </section>

            <section className={`cashflow-panel ${monthlyCashflow !== null && monthlyCashflow < 0 ? "cashflow-negative" : ""}`}>
              <div className="section-title">
                <div><span>↔</span><strong>{locale === "zh" ? "每月现金流" : "MONTHLY CASHFLOW"}</strong></div>
                <em>{cashflowLoad === null ? (locale === "zh" ? "待补充收支" : "Income needed") : `${cashflowLoad}% ${locale === "zh" ? "已被占用" : "committed"}`}</em>
              </div>
              <div className="cashflow-equation">
                <div><small>{locale === "zh" ? "到手收入" : "TAKE-HOME"}</small><strong>{profile.monthlyIncome > 0 ? fullMoney(profile.monthlyIncome, displayCurrency) : "—"}</strong></div>
                <b>−</b>
                <div><small>{locale === "zh" ? "日常生活" : "LIVING"}</small><strong>{fullMoney(profile.monthlyExpenses, displayCurrency)}</strong></div>
                <b>−</b>
                <div><small>{locale === "zh" ? "债务还款" : "DEBT"}</small><strong>{fullMoney(totalMonthly, displayCurrency)}</strong></div>
                <b>=</b>
                <div className="cashflow-result"><small>{locale === "zh" ? "月底余量" : "MONTH LEFT"}</small><strong>{monthlyCashflow === null ? "—" : `${monthlyCashflow >= 0 ? "+" : "−"}${fullMoney(Math.abs(monthlyCashflow), displayCurrency)}`}</strong></div>
              </div>
              {profile.monthlyIncome > 0 ? (
                <>
                  <div className="cashflow-track" aria-label={locale === "zh" ? "收入分配条" : "Income allocation bar"}>
                    <i className="living-segment" style={{ width: `${livingSegment}%` }}/>
                    <i className="repayment-segment" style={{ width: `${repaymentSegment}%` }}/>
                    <i className="remaining-segment" style={{ width: `${remainingSegment}%` }}/>
                  </div>
                  <div className="cashflow-legend"><span><i className="living-segment"/> {locale === "zh" ? "日常" : "Living"}</span><span><i className="repayment-segment"/> {locale === "zh" ? "还债" : "Debt"}</span><span><i className="remaining-segment"/> {locale === "zh" ? "余量" : "Left"}</span></div>
                </>
              ) : <p className="cashflow-empty">{locale === "zh" ? "在国家设置中补充每月到手收入与日常开销，世界中的小人就会长出真实现金流标签。" : "Add take-home income and living costs in country settings to grow a real cashflow label around your person."}</p>}
              <button className="cashflow-edit" onClick={() => { setSelectedSelf(false); openCountryChooser(); }}>{locale === "zh" ? "修改收入与日常开销" : "Edit income and living costs"} →</button>
            </section>

            <section className="repayment-strategy-panel">
              <div className="section-title"><div><span>⌁</span><strong>{locale === "zh" ? "还款路线比较" : "REPAYMENT ROUTE COMPARISON"}</strong></div><em>{locale === "zh" ? "三个视角，不替你自动执行" : "Three lenses, never auto-executed"}</em></div>
              <div className="strategy-readiness"><span>APR {knownAprDebts.length}/{openDebts.length}</span><span>{locale === "zh" ? "最低还款" : "MINIMUMS"} {knownMinimumDebts.length}/{openDebts.length}</span><span>{locale === "zh" ? "月度安全余量" : "SAFE MONTH-LEFT"} {extraPaymentRoom === null ? "—" : fullMoney(extraPaymentRoom, displayCurrency)}</span></div>
              <div className="strategy-card-grid">
                <article className={avalancheTarget ? "strategy-ready" : "strategy-incomplete"}>
                  <header><span>01</span><div><strong>{locale === "zh" ? "高利率优先" : "HIGHEST APR FIRST"}</strong><small>{locale === "zh" ? "雪崩法视角" : "Avalanche lens"}</small></div></header>
                  <h3>{avalancheTarget ? debtDisplayName(avalancheTarget, locale) : (locale === "zh" ? "先补充年利率" : "Add APRs first")}</h3>
                  <p>{avalancheTarget ? `${locale === "zh" ? "当前已知最高年利率" : "Highest known APR"} ${avalancheTarget.apr}% · ${fullMoney(toDisplay(avalancheTarget.balance, avalancheTarget.currency), displayCurrency)}` : (locale === "zh" ? "没有任何一笔录入 APR，不能诚实判断利息成本顺序。" : "No APR is recorded, so the interest-cost order cannot be compared honestly.")}</p>
                  {openDebts.length > knownAprDebts.length && <small>{locale === "zh" ? `仍有 ${openDebts.length - knownAprDebts.length} 笔缺 APR，补齐后目标可能改变。` : `${openDebts.length - knownAprDebts.length} debt(s) still lack APR; the target may change.`}</small>}
                  {avalancheTarget && <button onClick={() => { setSelectedSelf(false); setSelectedDebt(avalancheTarget.id); }}>{locale === "zh" ? "查看这笔" : "Open debt"} →</button>}
                </article>
                <article className={snowballTarget ? "strategy-ready" : "strategy-incomplete"}>
                  <header><span>02</span><div><strong>{locale === "zh" ? "最小余额优先" : "SMALLEST BALANCE FIRST"}</strong><small>{locale === "zh" ? "雪球法视角" : "Snowball lens"}</small></div></header>
                  <h3>{snowballTarget ? debtDisplayName(snowballTarget, locale) : (locale === "zh" ? "暂无未结清债务" : "No open debt")}</h3>
                  <p>{snowballTarget ? `${locale === "zh" ? "当前最小余额" : "Current smallest balance"} ${fullMoney(toDisplay(snowballTarget.balance, snowballTarget.currency), displayCurrency)}。${locale === "zh" ? "更强调尽快完成一笔带来的反馈。" : "This lens favors the momentum of closing one account."}` : (locale === "zh" ? "录入债务后才能比较。" : "Add a debt to compare routes.")}</p>
                  {snowballTarget && <button onClick={() => { setSelectedSelf(false); setSelectedDebt(snowballTarget.id); }}>{locale === "zh" ? "查看这笔" : "Open debt"} →</button>}
                </article>
                <article className={cashflowTarget ? "strategy-ready strategy-safety" : "strategy-incomplete"}>
                  <header><span>03</span><div><strong>{locale === "zh" ? "现金流安全优先" : "CASH-FLOW SAFETY FIRST"}</strong><small>{locale === "zh" ? "先保生活与最低还款" : "Protect essentials and minimums"}</small></div></header>
                  <h3>{cashflowTarget ? debtDisplayName(cashflowTarget, locale) : (locale === "zh" ? "资料还不完整" : "More facts needed")}</h3>
                  <p>{urgentTarget ? `${paymentStatusName(urgentTarget.paymentStatus, locale)} · ${locale === "zh" ? "先核实期限、费用与可行处理方式。" : "Verify deadlines, fees, and available options first."}` : monthlyCashflow === null ? (locale === "zh" ? "补充收入与日常开销后，才能判断是否存在安全的额外还款空间。" : "Add income and living costs before estimating safe room for extra payments.") : monthlyCashflow <= 0 ? (locale === "zh" ? "当前月余不为正：不生成额外还款额，先稳定现金流并守住必要开销。" : "Month-left is not positive: no extra amount is proposed; stabilize cash flow and essential costs first.") : `${locale === "zh" ? "当前测算月余" : "Estimated month-left"} ${fullMoney(monthlyCashflow, displayCurrency)}。${locale === "zh" ? "这只是上限参考，不等于应该全部还债。" : "This is a ceiling reference, not an instruction to use it all."}`}</p>
                  {cashflowTarget && <button onClick={() => { setSelectedSelf(false); setSelectedDebt(cashflowTarget.id); }}>{locale === "zh" ? "查看这笔" : "Open debt"} →</button>}
                </article>
              </div>
              <p className="strategy-boundary">{locale === "zh" ? "路线只根据你填写的数据做教育性比较；逾期、诉讼、担保、税务或合同违约金会改变优先级，需要向当地合格专业人士或官方渠道核实。" : "Routes are educational comparisons based only on your entries. Arrears, litigation, security, tax, or contract penalties can change priorities and require local qualified or official review."}</p>
            </section>

            <section className="debt-composition">
              <div className="section-title"><div><span>▤</span><strong>{locale === "zh" ? "欠款构成" : "DEBT COMPOSITION"}</strong></div><em>{locale === "zh" ? "点击一项看还款细节" : "Open a row for payment details"}</em></div>
              <div className="composition-list">
                {[...debts].sort((a, b) => toDisplay(b.balance, b.currency) - toDisplay(a.balance, a.currency)).map((debt, index) => {
                  const value = toDisplay(debt.balance, debt.currency);
                  const share = totalBalance > 0 ? Math.round((value / totalBalance) * 100) : 0;
                  const progress = debt.original > 0 ? Math.max(0, Math.round((1 - debt.balance / debt.original) * 100)) : 0;
                  return (
                    <button key={debt.id} className={index === 0 ? "composition-primary" : ""} onClick={() => { setSelectedSelf(false); setSelectedDebt(debt.id); }}>
                      <span className={`kind-dot kind-${debt.kind}`}/>
                      <div><strong>{debtDisplayName(debt, locale)} {index === 0 && <b>{locale === "zh" ? "最大来源" : "TOP SOURCE"}</b>}<u>{debt.sharingMode === "range" ? (locale === "zh" ? "◫ 匿名区间" : "◫ Range") : (locale === "zh" ? "🔒 仅自己" : "🔒 Private")}</u></strong><i><em style={{ width: `${share}%` }}/></i><small>{locale === "zh" ? `占总欠款 ${share}% · 已偿还 ${progress}%` : `${share}% of total · ${progress}% repaid`}</small></div>
                      <div className="composition-money"><strong>{fullMoney(value, displayCurrency)}</strong><small>{locale === "zh" ? `月还 ${money(toDisplay(debt.monthly, debt.currency), displayCurrency)}` : `${money(toDisplay(debt.monthly, debt.currency), displayCurrency)}/mo`}</small></div>
                    </button>
                  );
                })}
                {!debts.length && <p>{locale === "zh" ? "还没有录入债务。与小岸聊聊后，构成会在这里出现。" : "No debts recorded yet. Talk to Kian and the composition will appear here."}</p>}
              </div>
            </section>

            {profile.pressure && <blockquote className="profile-pressure">“{profile.pressure}”</blockquote>}
            <p className="profile-privacy">⌁ {locale === "zh" ? "这是你自己的完整视图。公开角色时会默认隐藏精确收入与开销，只显示经本人授权的比例或区间。" : "This is your private complete view. Public profiles will hide exact income and costs by default and show only consented ratios or ranges."}</p>
          </section>
        </div>
      )}

      {activeDebt && now && (
        <div className="modal-shade" onMouseDown={() => setSelectedDebt(null)}>
          <section className="debt-detail" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedDebt(null)}>×</button>
            <p className="detail-kicker">{debtDisplayName(activeDebt, locale)} · {activeDebt.currency} → {displayCurrency}</p>
            <h2>≈ {fullMoney(toDisplay(activeDebt.balance, activeDebt.currency), displayCurrency)}</h2>
            {activeDebt.currency !== displayCurrency && <p className="original-money">{locale === "zh" ? "原币余额" : "Original balance"}：{fullMoney(activeDebt.balance, activeDebt.currency)}</p>}
            <div className="big-progress">
              <span style={{ width: `${Math.max(0,(1-activeDebt.balance/activeDebt.original)*100)}%` }}/>
            </div>
            <p className="progress-copy">
              {t.paid} <strong>{Math.max(0,Math.round((1-activeDebt.balance/activeDebt.original)*100))}%</strong> · {t.progress}
            </p>
            <div className="ability-meters">
              <div><p><span>{locale === "zh" ? "全部债务偿还进度" : "All-debt repayment progress"}</span><strong>{overallProgress}%</strong></p><i><b style={{ width: `${overallProgress}%` }}/></i></div>
              <div><p><span>{locale === "zh" ? "月供占可支配收入" : "Payments / disposable income"}</span><strong>{monthlyBurden === null ? "—" : `${monthlyBurden}%`}</strong></p><i className="burden"><b style={{ width: `${monthlyBurden ?? 0}%` }}/></i></div>
              <div><p><span>{locale === "zh" ? "月度还款余量" : "Monthly repayment capacity"}</span><strong>{repaymentCapacity === null ? "—" : `${repaymentCapacity}%`}</strong></p><i className="capacity"><b style={{ width: `${repaymentCapacity ?? 0}%` }}/></i></div>
              {monthlyBurden === null && <small>{locale === "zh" ? "在国家设置中自愿填写每月可支配收入后，才会计算压力和余量；这不是信用评分。" : "Add optional monthly disposable income in country settings to calculate pressure and capacity. This is not a credit score."}</small>}
            </div>
            <div className="detail-grid">
              <div><small>{t.payment}</small><strong>≈ {fullMoney(toDisplay(activeDebt.monthly, activeDebt.currency), displayCurrency)}</strong></div>
              <div><small>{locale === "zh" ? "年利率 APR" : "APR"}</small><strong>{activeDebt.apr === null || activeDebt.apr === undefined ? (locale === "zh" ? "待补充" : "Not entered") : `${activeDebt.apr}%`}</strong></div>
              <div><small>{locale === "zh" ? "按当前余额估算月利息" : "EST. MONTHLY INTEREST"}</small><strong>{activeDebt.apr === null || activeDebt.apr === undefined ? "—" : `≈ ${fullMoney(toDisplay(activeDebt.balance * activeDebt.apr / 1_200, activeDebt.currency), displayCurrency)}`}</strong></div>
              <div><small>{locale === "zh" ? "最低还款" : "MINIMUM PAYMENT"}</small><strong>{activeDebt.minimumPayment === null || activeDebt.minimumPayment === undefined ? (locale === "zh" ? "待补充" : "Not entered") : `≈ ${fullMoney(toDisplay(activeDebt.minimumPayment, activeDebt.currency), displayCurrency)}`}</strong></div>
              <div><small>{locale === "zh" ? "还款状态" : "PAYMENT STATUS"}</small><strong>{paymentStatusName(activeDebt.paymentStatus, locale)}</strong></div>
              <div><small>{locale === "zh" ? "合同剩余期数" : "REMAINING TERM"}</small><strong>{activeDebt.remainingMonths === null || activeDebt.remainingMonths === undefined ? (locale === "zh" ? "待补充" : "Not entered") : `${activeDebt.remainingMonths} ${locale === "zh" ? "个月" : "months"}`}</strong></div>
              <div><small>{t.due}</small><strong>{locale === "zh" ? `每月 ${activeDebt.dueDay} 日` : `Day ${activeDebt.dueDay}`}</strong></div>
              <div><small>{t.method}</small><strong>{activeDebt.method}</strong></div>
              <div><small>{t.nextPayment}</small><strong>{nextDueDate(activeDebt.dueDay,now,activeDebt.lastPaidAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}</strong></div>
              <div className="sharing-cell"><small>{locale === "zh" ? "匿名世界权限" : "ANONYMOUS WORLD"}</small><strong>{activeDebt.sharingMode === "range" ? (locale === "zh" ? "◫ 仅金额区间" : "◫ Range only") : (locale === "zh" ? "🔒 仅自己" : "🔒 Only me")}</strong></div>
            </div>
            {activeDebt.apr !== null && activeDebt.apr !== undefined && <p className="interest-estimate-note">{locale === "zh" ? "月利息仅按“当前本金 × APR ÷ 12”做简单估算，不包含复利、费用、罚息、计息天数或合同规则；以账单为准。" : "Monthly interest is a simple current-principal × APR ÷ 12 estimate. It excludes compounding, fees, penalties, day-count rules, and contract terms; verify the statement."}</p>}

            {editingDebt && debtEdit ? (
              <form className="debt-edit-form" onSubmit={saveDebtChanges}>
                <div className="form-pair">
                  <label>{t.type}
                    <select value={debtEdit.kind} onChange={(event) => setDebtEdit({ ...debtEdit, kind: event.target.value as DebtKind })}>
                      {(Object.keys(kindNames) as DebtKind[]).map((kind) => <option value={kind} key={kind}>{kindNames[kind][locale]}</option>)}
                    </select>
                  </label>
                  <label>{locale === "zh" ? "币种" : "Currency"}
                    <select value={debtEdit.currency} onChange={(event) => setDebtEdit({ ...debtEdit, currency: event.target.value })}>
                      {currencyOptions.map((currency) => <option key={currency}>{currency}</option>)}
                    </select>
                  </label>
                </div>
                {debtEdit.kind === "other" && <label>{locale === "zh" ? "这笔负债的真实称呼" : "Your name for this debt"}<input required maxLength={80} value={debtEdit.customLabel ?? ""} onChange={(event) => setDebtEdit({ ...debtEdit, customLabel: event.target.value })}/></label>}
                <div className="form-pair">
                  <label>{t.amount}<input type="number" min="0" required value={debtEdit.original} onChange={(event) => setDebtEdit({ ...debtEdit, original: Number(event.target.value) })}/></label>
                  <label>{t.balance}<input type="number" min="0" required value={debtEdit.balance} onChange={(event) => setDebtEdit({ ...debtEdit, balance: Number(event.target.value) })}/></label>
                </div>
                <div className="form-pair">
                  <label>{t.payment}<input type="number" min="0" required value={debtEdit.monthly} onChange={(event) => setDebtEdit({ ...debtEdit, monthly: Number(event.target.value) })}/></label>
                  <label>{t.due}<input type="number" min="1" max="31" required value={debtEdit.dueDay} onChange={(event) => setDebtEdit({ ...debtEdit, dueDay: Number(event.target.value) })}/></label>
                </div>
                <fieldset className="strategy-fields">
                  <legend>{locale === "zh" ? "还款策略资料" : "Repayment strategy facts"}</legend>
                  <div className="form-pair"><label>{locale === "zh" ? "年利率 APR（%）" : "APR (%)"}<input type="number" min="0" max="1000" step="0.01" value={debtEdit.apr ?? ""} onChange={(event) => setDebtEdit({ ...debtEdit, apr: event.target.value === "" ? null : Number(event.target.value) })}/></label><label>{locale === "zh" ? `最低还款（${debtEdit.currency}）` : `Minimum payment (${debtEdit.currency})`}<input type="number" min="0" value={debtEdit.minimumPayment ?? ""} onChange={(event) => setDebtEdit({ ...debtEdit, minimumPayment: event.target.value === "" ? null : Number(event.target.value) })}/></label></div>
                  <div className="form-pair"><label>{locale === "zh" ? "当前状态" : "Payment status"}<select value={debtEdit.paymentStatus ?? "unknown"} onChange={(event) => setDebtEdit({ ...debtEdit, paymentStatus: event.target.value as DebtPaymentStatus })}><option value="unknown">{paymentStatusName("unknown", locale)}</option><option value="current">{paymentStatusName("current", locale)}</option><option value="late">{paymentStatusName("late", locale)}</option><option value="collection">{paymentStatusName("collection", locale)}</option></select></label><label>{locale === "zh" ? "合同剩余期数（月）" : "Remaining term (months)"}<input type="number" min="1" max="1200" value={debtEdit.remainingMonths ?? ""} onChange={(event) => setDebtEdit({ ...debtEdit, remainingMonths: event.target.value === "" ? null : Number(event.target.value) })}/></label></div>
                  <small>{locale === "zh" ? "不知道就留空；不要用系统估算替代账单或合同。" : "Leave unknown facts blank; do not replace statements or contracts with an estimate."}</small>
                </fieldset>
                <label>{t.method}<input required value={debtEdit.method} onChange={(event) => setDebtEdit({ ...debtEdit, method: event.target.value })}/></label>
                <label>{locale === "zh" ? "匿名世界权限" : "Anonymous world permission"}
                  <select value={debtEdit.sharingMode ?? "private"} onChange={(event) => setDebtEdit({ ...debtEdit, sharingMode: event.target.value as SharingMode })}>
                    <option value="private">{locale === "zh" ? "🔒 仅自己可见" : "🔒 Only me"}</option>
                    <option value="range">{locale === "zh" ? "◫ 未来只公开匿名金额区间" : "◫ Future anonymous range only"}</option>
                  </select>
                  <small className="sharing-note">{locale === "zh" ? "不会公开精确金额；当前私测阶段不会发布任何真实用户债务。" : "Exact amounts are never shared. No real-user debt is published during private testing."}</small>
                </label>
                <div className="detail-actions">
                  <button type="button" onClick={() => setEditingDebt(false)}>{t.cancel}</button>
                  <button className="primary" type="submit">{t.saveChanges}</button>
                </div>
              </form>
            ) : (
              <>
                <p className="reality-note">⌁ {t.selfReport}</p>
                <label className="reported-balance">
                  {t.latestBalance}
                  <input type="number" min="0" max={activeDebt.balance} value={reportedBalance} onChange={(event) => setReportedBalance(event.target.value)}/>
                  <small>{t.balanceHelp}</small>
                </label>
                <button
                  className="payment-button"
                  onClick={() => confirmPayment(activeDebt.id)}
                  disabled={Boolean(
                    cloudState === "syncing" ||
                    !reportedBalance ||
                    Number(reportedBalance) > activeDebt.balance ||
                    Number(reportedBalance) < 0 ||
                    (activeDebt.lastPaidAt && new Date(activeDebt.lastPaidAt).getFullYear()===now.getFullYear() && new Date(activeDebt.lastPaidAt).getMonth()===now.getMonth())
                  )}
                >
                  {activeDebt.lastPaidAt && new Date(activeDebt.lastPaidAt).getFullYear()===now.getFullYear() && new Date(activeDebt.lastPaidAt).getMonth()===now.getMonth()
                    ? `✓ ${t.confirmed}`
                    : `${t.confirm} · ${fullMoney(toDisplay(activeDebt.monthly, activeDebt.currency), displayCurrency)}`}
                </button>

                <section className="special-payment-tools">
                  <div className="section-title"><div><span>↗</span><strong>{locale === "zh" ? "额外还款工具" : "EXTRA PAYMENT TOOLS"}</strong></div><em>{locale === "zh" ? "只记录真实发生" : "Real events only"}</em></div>
                  <div className="special-tabs"><button className={specialMode === "prepayment" ? "active" : ""} onClick={() => setSpecialMode("prepayment")}>{locale === "zh" ? "提前还款" : "Prepayment"}</button><button className={specialMode === "lucky_income" ? "active" : ""} onClick={() => setSpecialMode("lucky_income")}>✦ {locale === "zh" ? "今日幸运收入" : "Today's lucky income"}</button></div>
                  {specialMode === "prepayment" ? <div className="special-form">
                    <p>{locale === "zh" ? "记录已经实际支付的额外款项。系统不会假定现金全部冲减本金，也不会取消原定还款日。" : "Record an extra payment that actually happened. The system does not assume all cash reduced principal or cancel the scheduled due date."}</p>
                    <div className="form-pair"><label>{locale === "zh" ? `实际支付（${activeDebt.currency}）` : `Cash actually paid (${activeDebt.currency})`}<input type="number" min="0" value={prepaymentAmount} onChange={(event) => setPrepaymentAmount(event.target.value)}/></label><label>{locale === "zh" ? "付款后最新本金余额" : "Latest principal after payment"}<input type="number" min="0" max={activeDebt.balance} value={prepaymentBalance} onChange={(event) => setPrepaymentBalance(event.target.value)}/></label></div>
                    <small>{locale === "zh" ? "付款前先核对合同中的违约金、次数限制和计息方式，并保留必要生活缓冲。" : "Before paying, check contract penalties, frequency limits, interest treatment, and protect an essential living buffer."}</small>
                    <button className="special-submit" disabled={cloudState === "syncing" || !prepaymentAmount || !prepaymentBalance} onClick={() => recordSpecialPayment("prepayment")}>{locale === "zh" ? "确认真实提前还款" : "Confirm real prepayment"} →</button>
                  </div> : <div className="special-form lucky-form">
                    <p>{locale === "zh" ? "不是抽奖，也不会凭空减债：只登记今天真实收到的一笔奖金、兼职、退款等，并用于一项债务。每天一次。" : "Not a game of chance and never fake debt reduction: record one real bonus, freelance payment, refund, or similar income and apply it to one debt. Once daily."}</p>
                    <label>{locale === "zh" ? "真实收入类型" : "Real income type"}<select value={luckyType} onChange={(event) => setLuckyType(event.target.value)}><option value="bonus">{locale === "zh" ? "奖金 / 绩效" : "Bonus"}</option><option value="freelance">{locale === "zh" ? "兼职 / 自由职业" : "Freelance"}</option><option value="refund">{locale === "zh" ? "退款 / 退税" : "Refund"}</option><option value="gift">{locale === "zh" ? "礼金 / 赠与" : "Gift"}</option><option value="sale">{locale === "zh" ? "出售闲置" : "Item sale"}</option><option value="other">{locale === "zh" ? "其他真实收入" : "Other real income"}</option></select></label>
                    <div className="form-pair"><label>{locale === "zh" ? `用于还款的金额（${activeDebt.currency}）` : `Amount applied (${activeDebt.currency})`}<input type="number" min="0" value={luckyAmount} onChange={(event) => setLuckyAmount(event.target.value)}/></label><label>{locale === "zh" ? "付款后最新本金余额" : "Latest principal after payment"}<input type="number" min="0" max={activeDebt.balance} value={luckyBalance} onChange={(event) => setLuckyBalance(event.target.value)}/></label></div>
                    <div className={`daily-chance ${luckyUsedToday ? "used" : ""}`}><b>{luckyUsedToday ? "✓" : "1"}</b><span>{luckyUsedToday ? (locale === "zh" ? "今天已经记录，明天恢复" : "Used today; resets tomorrow") : (locale === "zh" ? "今天还剩 1 次真实登记机会" : "1 real entry remains today")}</span></div>
                    {cloudState !== "synced" && <button className="vault-text-button" onClick={() => window.location.reload()}>{locale === "zh" ? "重新连接大世界" : "Reconnect the shared world"}</button>}
                    <button className="special-submit lucky-submit" disabled={cloudState !== "synced" || luckyUsedToday || !luckyAmount || !luckyBalance} onClick={() => recordSpecialPayment("lucky_income")}>✦ {locale === "zh" ? "把真实收入用于这笔债务" : "Apply real income to this debt"}</button>
                  </div>}
                  {paymentToolMessage && <p className="payment-tool-message">{paymentToolMessage}</p>}
                </section>

                {!!activeDebt.history?.length && <section className="payment-history"><div className="section-title"><div><span>◷</span><strong>{locale === "zh" ? "最近真实记录" : "RECENT REAL RECORDS"}</strong></div><em>{activeDebt.history.length}</em></div>{[...activeDebt.history].reverse().slice(0, 4).map((entry, index) => <div key={`${entry.confirmedAt}-${index}`}><span>{entry.source === "prepayment" ? (locale === "zh" ? "提前还款" : "Prepayment") : entry.source === "lucky_income" ? (locale === "zh" ? "幸运收入" : "Lucky income") : (locale === "zh" ? "本期还款" : "Scheduled payment")}</span><strong>{fullMoney(entry.cashPayment, activeDebt.currency)}</strong><small>{new Date(entry.confirmedAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")} · {locale === "zh" ? "本金余" : "principal"} {fullMoney(entry.newBalance, activeDebt.currency)}</small></div>)}</section>}
                <div className="detail-actions">
                  <button onClick={() => setEditingDebt(true)}>{t.editDebt}</button>
                  <button className={deleteDebtArmed ? "danger" : ""} onClick={() => deleteDebtArmed ? deleteDebt(activeDebt.id) : setDeleteDebtArmed(true)}>
                    {deleteDebtArmed ? t.deleteWarning : t.deleteDebt}
                  </button>
                </div>
                {deleteDebtArmed && <button className="vault-text-button" onClick={() => setDeleteDebtArmed(false)}>{t.cancel}</button>}
              </>
            )}
          </section>
        </div>
      )}

      {activeSharedWalker && <div className="modal-shade" onMouseDown={() => setSelectedSharedWalker(null)}>
        <section className="npc-story person-detail shared-walker-detail" onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setSelectedSharedWalker(null)}>×</button>
          <div className="person-detail-head npc-detail-head"><div className="npc-portrait shared-walker-portrait"><CharacterAvatar className="portrait-character" badge={countryFlag(activeSharedWalker.countryCode)} color={activeSharedWalker.color} skin={activeSharedWalker.skin} hair={activeSharedWalker.hair} bodyShape={activeSharedWalker.repaymentStage === "near_shore" ? "rising" : activeSharedWalker.debtCountBand === "multiple" ? "burdened" : "steady"} outfit={activeSharedWalker.repaymentStage === "near_shore" ? "near-shore" : activeSharedWalker.debtCountBand === "multiple" ? "heavy" : "steady"}/><span>◉ {locale === "zh" ? "共享角色" : "SHARED WALKER"}</span></div><div><p className="detail-kicker">{countryFlag(activeSharedWalker.countryCode)} {activeSharedWalker.anonymousName}</p><h2>{activeSharedWalker.debtCountBand === "none" ? (locale === "zh" ? "正在创建自己的计划" : "Building a personal plan") : kindNames[activeSharedWalker.primaryDebtKind]?.[locale] ?? kindNames.other[locale]}</h2><p className="original-money">{activeSharedWalker.debtCountBand === "multiple" ? (locale === "zh" ? "多笔债务 · 最大来源只显示类型" : "Multiple debts · largest source shown only as a category") : activeSharedWalker.debtCountBand === "single" ? (locale === "zh" ? "一类债务压力" : "One debt path") : (locale === "zh" ? "还没有公开债务轮廓" : "No debt outline yet")}</p></div></div>
          <div className="shared-walker-stage"><span>{locale === "zh" ? "当前阶段" : "CURRENT STAGE"}</span><strong>{activeSharedWalker.repaymentStage === "near_shore" ? (locale === "zh" ? "接近上岸" : "Near shore") : activeSharedWalker.repaymentStage === "moving" ? (locale === "zh" ? "持续前进" : "Moving") : activeSharedWalker.repaymentStage === "started" ? (locale === "zh" ? "已经开始" : "Started") : activeSharedWalker.repaymentStage === "mapped" ? (locale === "zh" ? "已看清全貌" : "Mapped") : (locale === "zh" ? "正在设置" : "Setting up")}</strong></div>
          <p className="shared-walker-copy">{locale === "zh" ? "这是一个真实注册角色的隐私安全轮廓。创建角色后，所有登录用户都能在共同大世界里彼此看见；只有匿名代号、国家/地区、最大债务类型和粗略阶段会出现。" : "This is a privacy-safe silhouette of a real registered role. Once created, roles can be seen by everyone in the shared world; only a pseudonym, country/region, largest debt category, and coarse stage appear."}</p>
          <p className="profile-privacy">⌁ {locale === "zh" ? "精确金额、收入、开销、还款日、账号信息和私人小岸对话永远不会从这个角色卡公开。" : "Exact amounts, income, costs, due dates, account information, and private Kian conversations are never exposed by this card."}</p>
          <div className="real-story-actions"><button onClick={() => { setSelectedSharedWalker(null); setCommunityOpen(true); }}>{locale === "zh" ? "去共同世界看看" : "Open shared world"}</button><button className="npc-light-button" onClick={() => setSelectedSharedWalker(null)}>{locale === "zh" ? "继续行走" : "Keep walking"}</button></div>
        </section>
      </div>}

      {mobilePlannerOpen && <div className="mobile-planner-shade" onMouseDown={() => setMobilePlannerOpen(false)}>
        <section className="mobile-planner-sheet" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><p>◷ {locale === "zh" ? "手机还款计划" : "MOBILE REPAYMENT PLANNER"}</p><h2>{locale === "zh" ? "这个月，只看真实要发生的事" : "This month, focus on what will really happen"}</h2></div><button onClick={() => setMobilePlannerOpen(false)} aria-label={t.close}>×</button></header>
          <div className="mobile-planner-summary"><article><span>{locale === "zh" ? "本月固定还款" : "MONTHLY PAYMENTS"}</span><strong>{debts.length ? money(totalMonthly, displayCurrency) : "—"}</strong></article><article className={monthlyCashflow !== null && monthlyCashflow < 0 ? "negative" : ""}><span>{locale === "zh" ? "收入减日常与还款" : "AFTER LIVING + DEBT"}</span><strong>{monthlyCashflow === null ? "—" : `${monthlyCashflow >= 0 ? "+" : "−"}${money(Math.abs(monthlyCashflow), displayCurrency)}`}</strong></article></div>
          <div className="mobile-plan-progress"><div><span>{locale === "zh" ? "总本金真实进度" : "REAL PRINCIPAL PROGRESS"}</span><strong>{overallProgress}%</strong></div><i><b style={{ width: `${overallProgress}%` }}/></i><small>{locale === "zh" ? "只根据你确认后的最新本金余额变化" : "Changes only from the latest principal you confirm"}</small></div>
          <div className="mobile-plan-list"><div className="section-title"><div><span>◫</span><strong>{locale === "zh" ? "接下来要处理" : "COMING UP"}</strong></div><em>{upcoming.length}</em></div>{upcoming.slice(0, 6).map(({ debt, date }) => <button key={debt.id} onClick={() => { setMobilePlannerOpen(false); setSelectedDebt(debt.id); }}><time><b>{date.getDate()}</b><small>{date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { month: "short" })}</small></time><div><strong>{debtDisplayName(debt, locale)}</strong><span>{money(toDisplay(debt.monthly, debt.currency), displayCurrency)} · {debt.method}</span></div><em>{locale === "zh" ? "查看 / 记录" : "OPEN"} →</em></button>)}{!upcoming.length && <p>{locale === "zh" ? "先和小岸添加第一笔债务，还款日会自动进入这里。" : "Add your first debt with Kian and its real due date will appear here."}</p>}</div>
          <div className="mobile-planner-actions"><button onClick={() => { setMobilePlannerOpen(false); setGuideStep(debts.length ? "type" : "intro"); setGuideOpen(true); }}>＋ {t.add}</button><button onClick={() => { setMobilePlannerOpen(false); setCommunityOpen(true); }}>◎ {locale === "zh" ? "去共同世界" : "Shared world"}</button><button onClick={() => { setMobilePlannerOpen(false); if (debts.length) setGuideStep("done"); setGuideOpen(true); }}>🐕 {locale === "zh" ? "问小岸" : "Ask Kian"}</button></div>
          <p className="mobile-planner-note">{locale === "zh" ? "规划层：债务台账 + 现金流 + 真实还款日；世界层：角色成长 + 同伴故事 + 论坛互动。两层共享同一份真实记录。" : "Planner layer: debts, cashflow, and real due dates. World layer: character growth, peer stories, and community. Both use the same real record."}</p>
        </section>
      </div>}

      {activeWorldStory && (() => {
        const nextMilestone = nextLightMilestone(activeWorldStory.encouragementCount);
        return <div className="modal-shade" onMouseDown={() => setSelectedWorldStory(null)}>
          <section className="npc-story person-detail community-person-detail" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedWorldStory(null)}>×</button>
            <div className="person-detail-head npc-detail-head"><div className="npc-portrait real-story-portrait"><CharacterAvatar className="portrait-character" badge={countryFlag(activeWorldStory.countryCode)} color={activeWorldStory.color} skin={activeWorldStory.skin} hair={activeWorldStory.hair}/><span>✓ {locale === "zh" ? "真实故事" : "REAL STORY"}</span></div><div><p className="detail-kicker">{countryFlag(activeWorldStory.countryCode)} {activeWorldStory.anonymousName} · {locale === "zh" ? "审核通过并已匿名处理" : "REVIEWED & ANONYMIZED"}</p><h2>≈ {displayStoryAmountBand(activeWorldStory)}</h2><p className="original-money">{kindNames[activeWorldStory.debtKind]?.[locale] ?? kindNames.other[locale]} · {locale === "zh" ? `只公开金额区间 · 原币 ${activeWorldStory.currency} ${activeWorldStory.amountBand}` : `amount range only · original ${activeWorldStory.currency} ${activeWorldStory.amountBand}`}</p></div></div>
            <div className="real-story-approach"><span>{locale === "zh" ? "正在尝试的方式" : "APPROACH BEING TRIED"}</span><strong>{repaymentApproachNames[activeWorldStory.repaymentApproach]?.[locale] ?? repaymentApproachNames.other[locale]}</strong></div>
            <blockquote>“{activeWorldStory.storyText}”</blockquote>
            <div className="real-light-milestones"><div><strong>✦ {activeWorldStory.encouragementCount}</strong><span>{locale === "zh" ? `当前脚下光效：等级 ${lightTier(activeWorldStory.encouragementCount)}` : `Current ground light: level ${lightTier(activeWorldStory.encouragementCount)}`}</span></div><div className="milestone-dots">{[10, 50, 100].map((milestone) => <span className={activeWorldStory.encouragementCount >= milestone ? "reached" : ""} key={milestone}><b>✦</b>{milestone}</span>)}</div><small>{nextMilestone ? (locale === "zh" ? `再收到 ${nextMilestone - activeWorldStory.encouragementCount} 道光，解锁下一层脚下特效。` : `${nextMilestone - activeWorldStory.encouragementCount} more lights unlock the next ground effect.`) : (locale === "zh" ? "已点亮当前最高层脚下特效。" : "The highest current ground effect is unlocked.")}</small><small>{locale === "zh" ? "收到的光会变成气球与云朵，在画面中托起背负物；它不会修改真实欠款、还款进度或信用信息。" : "Received light becomes balloons and clouds that visually lift the burden. It never changes real debt, repayment progress, or credit information."}</small></div>
            <p className="profile-privacy">⌁ {locale === "zh" ? "这名行者只公开了经审核的故事、国家、债务类型、金额区间和鼓励总数；精确债务与私人现金流不会从这里公开。" : "This walker shares only a reviewed story, country, debt type, amount range, and light count. Exact debt and private cashflow are not exposed here."}</p>
            {worldLightMessage && <p className="payment-tool-message">{worldLightMessage}</p>}
            <div className="real-story-actions"><button onClick={() => { setSelectedWorldStory(null); setCommunityOpen(true); }}>{locale === "zh" ? "在社区查看 / 举报" : "Open in community / report"}</button><button className="npc-light-button" disabled={activeWorldStory.isMine || activeWorldStory.encouraged || cloudState !== "synced"} onClick={() => void sendWorldStoryLight(activeWorldStory.id)}>{activeWorldStory.isMine ? (locale === "zh" ? "这是我的故事" : "This is my story") : activeWorldStory.encouraged ? (locale === "zh" ? "✓ 光已送达" : "✓ Light sent") : cloudState !== "synced" ? (locale === "zh" ? "大世界连接中" : "Shared world connecting") : (locale === "zh" ? "送一道真实的光 +1" : "Send one real light +1")}</button></div>
          </section>
        </div>;
      })()}

      {selectedNpc && (() => {
        const npc = npcData.find((item) => item.id === selectedNpc)!;
        const convertedAmount = toDisplay(npc.amount, npc.currency);
        const convertedMonthly = toDisplay(npc.monthly, npc.currency);
        const convertedIncome = toDisplay(npc.income, npc.currency);
        const convertedExpenses = toDisplay(npc.expenses, npc.currency);
        const convertedLeftover = convertedIncome - convertedExpenses - convertedMonthly;
        const primary = npc.debts[0];
        const primaryShare = Math.round((primary.amount / npc.amount) * 100);
        const npcLoad = Math.round(((npc.expenses + npc.monthly) / npc.income) * 100);
        const hasSentLight = sentNpcLights.includes(npc.id);
        const lightCount = npc.lights + (hasSentLight ? 1 : 0);
        return (
          <div className="modal-shade" onMouseDown={() => setSelectedNpc(null)}>
            <section className="npc-story person-detail" onMouseDown={(event) => event.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedNpc(null)}>×</button>
              <div className="person-detail-head npc-detail-head">
                <div className="npc-portrait"><CharacterAvatar className="portrait-character" badge={npc.flag} color={npc.color} skin={npc.skin} hair={npc.hair}/></div>
                <div><p className="detail-kicker">{npc.flag} {npc.name} · {locale === "zh" ? "匿名自报" : "ANONYMOUS SELF-REPORT"}</p><h2>≈ {fullMoney(convertedAmount, displayCurrency)}</h2>{npc.currency !== displayCurrency && <p className="original-money">{locale === "zh" ? "原币总额" : "Original total"}：{fullMoney(npc.amount, npc.currency)}</p>}</div>
              </div>
              <div className="npc-source-hero"><span>{locale === "zh" ? "最大欠款来源" : "LARGEST DEBT SOURCE"}</span><strong>{kindNames[primary.kind][locale]}</strong><em>{fullMoney(toDisplay(primary.amount, npc.currency), displayCurrency)} · {primaryShare}%</em></div>
              <blockquote>“{locale === "zh" ? npc.zh : npc.en}”</blockquote>

              <section className={`cashflow-panel npc-cashflow ${convertedLeftover < 0 ? "cashflow-negative" : ""}`}>
                <div className="section-title"><div><span>↔</span><strong>{locale === "zh" ? "每月收支对比" : "MONTHLY CASHFLOW"}</strong></div><em>{npcLoad}% {locale === "zh" ? "已被占用" : "committed"}</em></div>
                <div className="cashflow-equation">
                  <div><small>{locale === "zh" ? "收入" : "INCOME"}</small><strong>{fullMoney(convertedIncome, displayCurrency)}</strong></div><b>−</b>
                  <div><small>{locale === "zh" ? "日常" : "LIVING"}</small><strong>{fullMoney(convertedExpenses, displayCurrency)}</strong></div><b>−</b>
                  <div><small>{locale === "zh" ? "还款" : "DEBT"}</small><strong>{fullMoney(convertedMonthly, displayCurrency)}</strong></div><b>=</b>
                  <div className="cashflow-result"><small>{locale === "zh" ? "月余" : "LEFT"}</small><strong>{convertedLeftover >= 0 ? "+" : "−"}{fullMoney(Math.abs(convertedLeftover), displayCurrency)}</strong></div>
                </div>
              </section>

              <section className="debt-composition">
                <div className="section-title"><div><span>▤</span><strong>{locale === "zh" ? "欠款构成" : "DEBT COMPOSITION"}</strong></div><em>{npc.debts.length} {locale === "zh" ? "类债务" : "debt types"}</em></div>
                <div className="composition-list npc-composition">
                  {npc.debts.map((debt, index) => {
                    const share = Math.round((debt.amount / npc.amount) * 100);
                    return <div key={debt.kind} className={index === 0 ? "composition-primary" : ""}><span className={`kind-dot kind-${debt.kind}`}/><div><strong>{kindNames[debt.kind][locale]} {index === 0 && <b>{locale === "zh" ? "最大来源" : "TOP SOURCE"}</b>}</strong><i><em style={{ width: `${share}%` }}/></i><small>{locale === "zh" ? `占总欠款 ${share}%` : `${share}% of total debt`}</small></div><div className="composition-money"><strong>{fullMoney(toDisplay(debt.amount, npc.currency), displayCurrency)}</strong><small>{locale === "zh" ? `月还 ${money(toDisplay(debt.monthly, npc.currency), displayCurrency)}` : `${money(toDisplay(debt.monthly, npc.currency), displayCurrency)}/mo`}</small></div></div>;
                  })}
                </div>
              </section>

              <div className="ability-meters npc-meters"><div><p><span>{locale === "zh" ? "本金偿还进度" : "Principal repaid"}</span><strong>{npc.repaid}%</strong></p><i><b style={{ width: `${npc.repaid}%` }}/></i></div><div><p><span>{locale === "zh" ? "月供占收入" : "Payments / income"}</span><strong>{npc.burden}%</strong></p><i className="burden"><b style={{ width: `${npc.burden}%` }}/></i></div><div><p><span>{locale === "zh" ? "月底余量占收入" : "Month-left / income"}</span><strong>{npc.capacity}%</strong></p><i className="capacity"><b style={{ width: `${npc.capacity}%` }}/></i></div><small>{locale === "zh" ? "金额、收入和开销均为匿名自报，并已换算为你的展示货币；这是理解压力的生活画像，不是信用评分。" : "Debt, income, and costs are anonymous self-reports converted to your display currency. This is a life-pressure profile, not a credit score."}</small></div>
              <div className="npc-light-summary"><strong>✦ {lightCount}</strong><div><b>{locale === "zh" ? "脚下光效等级" : "GROUND LIGHT LEVEL"} {lightTier(lightCount)}</b><span>{locale === "zh" ? "这是演示人物的演示光点；你在本设备只能送一次。真实人物上线后将使用经过审核的社区鼓励总数。" : "These are demo lights on a demo person; this device can send once. Real people will use reviewed community encouragement totals."}</span></div></div>
              <button className={`npc-light-button ${hasSentLight ? "light-sent" : ""}`} onClick={() => hasSentLight ? setSelectedNpc(null) : sendNpcLight(npc.id)}>{hasSentLight ? (locale === "zh" ? "✓ 光已送达，继续走" : "✓ Light sent — keep walking") : (locale === "zh" ? "送一点光 +1" : "Send a little light +1")} ✦</button>
            </section>
          </div>
        );
      })()}

      <button className="reset-button" onClick={resetExperience}>↺ {t.reset}</button>
      <aside className="reality-rules"><p>{t.howItWorks}</p><ol><li><span>1</span>{t.rule1}</li><li><span>2</span>{t.rule2}</li><li><span>3</span>{t.rule3}</li></ol></aside>
    </main>
  );
}
