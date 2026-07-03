export interface Currency {
  code: string;
  symbol: string;
  name: string;
  /** 1 USD = `rate` units of this currency (indicative static rates) */
  rate: number;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar", rate: 1 },
  { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  { code: "GBP", symbol: "£", name: "British Pound", rate: 0.79 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", rate: 83.2 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", rate: 156 },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", rate: 1.36 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", rate: 1.51 },
  { code: "MXN", symbol: "Mex$", name: "Mexican Peso", rate: 17.1 },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", rate: 5.05 },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", rate: 1.35 },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc", rate: 0.9 },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", rate: 7.24 },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", rate: 3.67 },
  { code: "ZAR", symbol: "R", name: "South African Rand", rate: 18.6 },
];

const MAP: Record<string, Currency> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c]),
);

export function getCurrency(code: string): Currency {
  return MAP[code] ?? MAP.USD;
}

/** Convert an amount from one currency to another using indicative rates. */
export function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const f = getCurrency(from).rate;
  const t = getCurrency(to).rate;
  return (amount / f) * t;
}

/** Whole-unit currencies that don't use decimals. */
const ZERO_DECIMAL = new Set(["JPY", "CNY"]);

export function formatMoney(amount: number, code = "USD"): string {
  const cur = getCurrency(code);
  const decimals = ZERO_DECIMAL.has(cur.code) ? 0 : 2;
  const str = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = amount < 0 ? "-" : "";
  // currencies whose symbol reads better after the number
  if (cur.code === "AED" || cur.code === "ZAR") {
    return `${sign}${cur.symbol}${str}`;
  }
  return `${sign}${cur.symbol}${str}`;
}
