import type { Locale } from "./debt-world-types";

export type CountryOption = {
  code: string;
  currency: string;
  zh: string;
  en: string;
};

export const countryOptions: CountryOption[] = [
  { code: "CN", currency: "CNY", zh: "中国", en: "China" },
  { code: "US", currency: "USD", zh: "美国", en: "United States" },
  { code: "GB", currency: "GBP", zh: "英国", en: "United Kingdom" },
  { code: "JP", currency: "JPY", zh: "日本", en: "Japan" },
  { code: "KR", currency: "KRW", zh: "韩国", en: "South Korea" },
  { code: "IN", currency: "INR", zh: "印度", en: "India" },
  { code: "BR", currency: "BRL", zh: "巴西", en: "Brazil" },
  { code: "CA", currency: "CAD", zh: "加拿大", en: "Canada" },
  { code: "AU", currency: "AUD", zh: "澳大利亚", en: "Australia" },
  { code: "DE", currency: "EUR", zh: "德国", en: "Germany" },
  { code: "FR", currency: "EUR", zh: "法国", en: "France" },
  { code: "ES", currency: "EUR", zh: "西班牙", en: "Spain" },
  { code: "IT", currency: "EUR", zh: "意大利", en: "Italy" },
  { code: "NL", currency: "EUR", zh: "荷兰", en: "Netherlands" },
  { code: "PT", currency: "EUR", zh: "葡萄牙", en: "Portugal" },
  { code: "IE", currency: "EUR", zh: "爱尔兰", en: "Ireland" },
  { code: "GR", currency: "EUR", zh: "希腊", en: "Greece" },
  { code: "HK", currency: "HKD", zh: "中国香港", en: "Hong Kong" },
  { code: "TW", currency: "TWD", zh: "中国台湾", en: "Taiwan" },
  { code: "SG", currency: "SGD", zh: "新加坡", en: "Singapore" },
  { code: "MY", currency: "MYR", zh: "马来西亚", en: "Malaysia" },
  { code: "ID", currency: "IDR", zh: "印度尼西亚", en: "Indonesia" },
  { code: "TH", currency: "THB", zh: "泰国", en: "Thailand" },
  { code: "VN", currency: "VND", zh: "越南", en: "Vietnam" },
  { code: "PH", currency: "PHP", zh: "菲律宾", en: "Philippines" },
  { code: "PK", currency: "PKR", zh: "巴基斯坦", en: "Pakistan" },
  { code: "BD", currency: "BDT", zh: "孟加拉国", en: "Bangladesh" },
  { code: "AE", currency: "AED", zh: "阿联酋", en: "United Arab Emirates" },
  { code: "SA", currency: "SAR", zh: "沙特阿拉伯", en: "Saudi Arabia" },
  { code: "TR", currency: "TRY", zh: "土耳其", en: "Türkiye" },
  { code: "IL", currency: "ILS", zh: "以色列", en: "Israel" },
  { code: "EG", currency: "EGP", zh: "埃及", en: "Egypt" },
  { code: "ZA", currency: "ZAR", zh: "南非", en: "South Africa" },
  { code: "NG", currency: "NGN", zh: "尼日利亚", en: "Nigeria" },
  { code: "KE", currency: "KES", zh: "肯尼亚", en: "Kenya" },
  { code: "MA", currency: "MAD", zh: "摩洛哥", en: "Morocco" },
  { code: "MX", currency: "MXN", zh: "墨西哥", en: "Mexico" },
  { code: "AR", currency: "ARS", zh: "阿根廷", en: "Argentina" },
  { code: "CL", currency: "CLP", zh: "智利", en: "Chile" },
  { code: "CO", currency: "COP", zh: "哥伦比亚", en: "Colombia" },
  { code: "PE", currency: "PEN", zh: "秘鲁", en: "Peru" },
  { code: "NZ", currency: "NZD", zh: "新西兰", en: "New Zealand" },
  { code: "CH", currency: "CHF", zh: "瑞士", en: "Switzerland" },
  { code: "SE", currency: "SEK", zh: "瑞典", en: "Sweden" },
  { code: "NO", currency: "NOK", zh: "挪威", en: "Norway" },
  { code: "DK", currency: "DKK", zh: "丹麦", en: "Denmark" },
  { code: "PL", currency: "PLN", zh: "波兰", en: "Poland" },
  { code: "CZ", currency: "CZK", zh: "捷克", en: "Czechia" },
  { code: "HU", currency: "HUF", zh: "匈牙利", en: "Hungary" },
  { code: "RO", currency: "RON", zh: "罗马尼亚", en: "Romania" },
  { code: "RU", currency: "RUB", zh: "俄罗斯", en: "Russia" },
  { code: "UA", currency: "UAH", zh: "乌克兰", en: "Ukraine" },
  { code: "OTHER", currency: "USD", zh: "其他国家或地区", en: "Another country or region" },
];

export const currencyOptions = Array.from(new Set(countryOptions.map((country) => country.currency))).sort();

export function countryName(code: string | undefined, customName: string | undefined, locale: Locale) {
  const found = countryOptions.find((country) => country.code === code);
  if (found && found.code !== "OTHER") return found[locale];
  return customName?.trim() || (locale === "zh" ? "未选择" : "Not selected");
}

export function countryFlag(code: string | undefined) {
  if (!code || code.length !== 2) return "◎";
  return String.fromCodePoint(...code.toUpperCase().split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

