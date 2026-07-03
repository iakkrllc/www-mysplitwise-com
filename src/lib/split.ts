/** Distribute `amount` across n participants as evenly as possible, cent-accurate. */
export function splitEqual(amount: number, n: number): number[] {
  if (n <= 0) return [];
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / n);
  const rem = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < rem ? 1 : 0)) / 100);
}

/** Distribute `amount` by percentages (which should sum to 100), cent-accurate. */
export function splitByPercent(amount: number, percents: number[]): number[] {
  const cents = Math.round(amount * 100);
  const rounded = percents.map((p) => Math.round((cents * p) / 100));
  let diff = cents - rounded.reduce((a, b) => a + b, 0);
  let i = 0;
  while (diff !== 0 && rounded.length) {
    const idx = i % rounded.length;
    rounded[idx] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
    i++;
  }
  return rounded.map((c) => c / 100);
}

/** Distribute `amount` by integer/float shares. */
export function splitByShares(amount: number, shares: number[]): number[] {
  const total = shares.reduce((a, b) => a + b, 0);
  if (total <= 0) return shares.map(() => 0);
  return splitByPercent(
    amount,
    shares.map((s) => (s / total) * 100),
  );
}
