export type ExchangeRateMap = Record<string, number>;

// Display-only fallback values. The live endpoint replaces these whenever available.
export const fallbackUsdRates: ExchangeRateMap = {
  USD: 1,
  CNY: 7.2,
  EUR: 0.86,
  GBP: 0.75,
  JPY: 154,
  KRW: 1380,
  INR: 88,
  BRL: 5.5,
  AUD: 1.52,
  CAD: 1.37,
  HKD: 7.82,
  TWD: 31.5,
  SGD: 1.28,
  MYR: 4.3,
  IDR: 16300,
  THB: 32.5,
  VND: 26100,
  PHP: 58.5,
  PKR: 280,
  BDT: 122,
  AED: 3.6725,
  SAR: 3.75,
  TRY: 41,
  ILS: 3.35,
  EGP: 49,
  ZAR: 17.8,
  NGN: 1500,
  KES: 129,
  MAD: 9.7,
  MXN: 18.6,
  ARS: 1350,
  CLP: 950,
  COP: 4100,
  PEN: 3.55,
  NZD: 1.68,
  CHF: 0.8,
  SEK: 9.6,
  NOK: 10.1,
  DKK: 6.4,
  PLN: 3.7,
  CZK: 21,
  HUF: 340,
  RON: 4.35,
  RUB: 82,
  UAH: 41.5,
};

export function convertCurrency(value: number, from: string, to: string, rates: ExchangeRateMap) {
  if (!Number.isFinite(value)) return 0;
  const source = from.toUpperCase();
  const target = to.toUpperCase();
  if (source === target) return value;
  const sourceRate = rates[source];
  const targetRate = rates[target];
  if (!sourceRate || !targetRate) return value;
  return (value / sourceRate) * targetRate;
}

