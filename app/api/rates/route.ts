import { fallbackUsdRates } from "@/lib/exchange-rates";

export const dynamic = "force-dynamic";

type RateRow = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

export async function GET() {
  try {
    const response = await fetch("https://api.frankfurter.dev/v2/rates?base=USD", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Rate provider unavailable");
    const rows = await response.json() as RateRow[];
    const rates: Record<string, number> = { ...fallbackUsdRates, USD: 1 };
    let date = "";
    for (const row of rows) {
      if (row.base === "USD" && Number.isFinite(row.rate) && row.rate > 0) {
        rates[row.quote] = row.rate;
        if (row.date > date) date = row.date;
      }
    }
    return Response.json(
      { base: "USD", date, rates, source: "Frankfurter", fallback: false },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400" } },
    );
  } catch {
    return Response.json(
      { base: "USD", date: null, rates: fallbackUsdRates, source: "fallback", fallback: true },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  }
}
