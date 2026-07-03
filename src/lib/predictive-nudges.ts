import type { Expense } from "./types";
import { parseLocalDate, todayISO } from "./dates";

export interface PredictedNudge {
  key: string;
  description: string;
  category: string;
  currency: string;
  avgAmount: number;
  intervalDays: number;
  daysSinceLast: number;
  lastDate: string;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Finds expenses with a similar description that recur on a rough interval
 * (e.g. groceries every ~7 days) and flags ones that look overdue — no AI call,
 * pure pattern-matching over local expense history.
 */
export function predictedNudges(expenses: Expense[]): PredictedNudge[] {
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    if (e.isSettlement || e.recurringId) continue;
    const key = e.description.trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const today = parseLocalDate(todayISO()).getTime();
  const nudges: PredictedNudge[] = [];

  for (const [key, group] of groups) {
    if (group.length < 3) continue;
    const sorted = [...group].sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
    );
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const days =
        (parseLocalDate(sorted[i].date).getTime() -
          parseLocalDate(sorted[i - 1].date).getTime()) /
        86400000;
      if (days > 0) gaps.push(days);
    }
    if (gaps.length < 2) continue;

    const intervalDays = median(gaps);
    if (intervalDays < 3 || intervalDays > 120) continue;

    const last = sorted[sorted.length - 1];
    const daysSinceLast = (today - parseLocalDate(last.date).getTime()) / 86400000;

    // Overdue relative to this pattern, with a grace window
    if (daysSinceLast > intervalDays * 1.4 && daysSinceLast > intervalDays + 2) {
      nudges.push({
        key,
        description: last.description,
        category: last.category,
        currency: last.currency,
        avgAmount:
          Math.round((group.reduce((a, e) => a + e.amount, 0) / group.length) * 100) /
          100,
        intervalDays: Math.round(intervalDays),
        daysSinceLast: Math.round(daysSinceLast),
        lastDate: last.date,
      });
    }
  }

  return nudges.sort((a, b) => b.daysSinceLast - a.daysSinceLast).slice(0, 3);
}
