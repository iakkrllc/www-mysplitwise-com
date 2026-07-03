import type { AppState, Expense } from "./types";
import { balanceBetween } from "./calculations";
import { formatMoney } from "./currency";

/** Builds a compact plain-text summary of the user's local data for "Ask mysplitwise" to reason over. */
export function buildFinanceSummary(
  state: AppState,
  baseExpenses: Expense[],
  currentUserId: string,
): string {
  const base = state.baseCurrency;
  const friends = state.users.filter((u) => u.id !== currentUserId);
  const lines: string[] = [`Base currency: ${base}`];

  lines.push("\nBalances with friends:");
  if (friends.length === 0) lines.push("- No friends added yet");
  for (const f of friends) {
    const bal = balanceBetween(currentUserId, f.id, baseExpenses);
    if (Math.abs(bal) < 0.01) lines.push(`- ${f.name}: settled up`);
    else if (bal > 0) lines.push(`- ${f.name}: owes you ${formatMoney(bal, base)}`);
    else lines.push(`- ${f.name}: you owe ${formatMoney(-bal, base)}`);
  }

  lines.push("\nGroups:");
  if (state.groups.length === 0) lines.push("- No groups yet");
  for (const g of state.groups) {
    lines.push(`- ${g.name} (${g.type}), ${g.memberIds.length} members`);
  }

  const recent = [...baseExpenses]
    .filter((e) => !e.isSettlement)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 60);

  lines.push("\nRecent expenses (up to 60, most recent first, amounts in base currency):");
  if (recent.length === 0) lines.push("- No expenses logged yet");
  for (const e of recent) {
    lines.push(`- ${e.date} | ${e.description} | ${formatMoney(e.amount, base)} | ${e.category}`);
  }

  const byCategory = new Map<string, number>();
  for (const e of baseExpenses) {
    if (e.isSettlement) continue;
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  lines.push("\nSpending by category (all-time, base currency):");
  if (byCategory.size === 0) lines.push("- No data yet");
  for (const [cat, total] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${cat}: ${formatMoney(total, base)}`);
  }

  return lines.join("\n");
}
