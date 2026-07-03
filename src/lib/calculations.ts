import type { Debt, Expense, ExpenseShare } from "./types";
import { convert } from "./currency";

export { formatMoney } from "./currency";

const EPS = 0.005;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Return a copy of an expense with amount + shares converted to `base` currency. */
export function convertExpenseToBase(e: Expense, base: string): Expense {
  if (e.currency === base) return e;
  return {
    ...e,
    amount: round2(convert(e.amount, e.currency, base)),
    currency: base,
    shares: e.shares.map((s) => ({
      userId: s.userId,
      paid: round2(convert(s.paid, e.currency, base)),
      owed: round2(convert(s.owed, e.currency, base)),
    })),
  };
}

/** Convert a list of expenses to the base currency (for balance math). */
export function toBaseExpenses(expenses: Expense[], base: string): Expense[] {
  return expenses.map((e) => convertExpenseToBase(e, base));
}

/**
 * Convert a single expense (which may have multiple payers) into a set of
 * "from owes to" pairwise debts using proportional distribution.
 * For the common single-payer case this reduces to: each debtor owes the
 * payer exactly their share.
 */
export function pairwiseDebtsForShares(shares: ExpenseShare[]): Debt[] {
  const creditors: { id: string; amt: number }[] = [];
  const debtors: { id: string; amt: number }[] = [];

  for (const s of shares) {
    const net = round2(s.paid - s.owed);
    if (net > EPS) creditors.push({ id: s.userId, amt: net });
    else if (net < -EPS) debtors.push({ id: s.userId, amt: -net });
  }

  const totalCredit = creditors.reduce((a, c) => a + c.amt, 0);
  const debts: Debt[] = [];
  if (totalCredit <= EPS) return debts;

  for (const d of debtors) {
    for (const c of creditors) {
      const amount = round2(d.amt * (c.amt / totalCredit));
      if (amount > EPS) debts.push({ from: d.id, to: c.id, amount });
    }
  }
  return debts;
}

/**
 * Net balance between `userId` and `otherId` over the given expenses.
 * Positive  => otherId owes userId (they owe you).
 * Negative  => userId owes otherId (you owe them).
 */
export function balanceBetween(
  userId: string,
  otherId: string,
  expenses: Expense[],
): number {
  let bal = 0;
  for (const e of expenses) {
    for (const d of pairwiseDebtsForShares(e.shares)) {
      if (d.from === otherId && d.to === userId) bal += d.amount;
      else if (d.from === userId && d.to === otherId) bal -= d.amount;
    }
  }
  return round2(bal);
}

/**
 * Net balance for a single user over a set of expenses: total paid - total owed.
 * Positive => they are owed money overall; negative => they owe overall.
 */
export function netBalanceForUser(userId: string, expenses: Expense[]): number {
  let net = 0;
  for (const e of expenses) {
    for (const s of e.shares) {
      if (s.userId === userId) net += s.paid - s.owed;
    }
  }
  return round2(net);
}

/** Map of userId -> net balance across the given expenses. */
export function netBalances(
  userIds: string[],
  expenses: Expense[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const id of userIds) map.set(id, 0);
  for (const e of expenses) {
    for (const s of e.shares) {
      if (map.has(s.userId)) {
        map.set(s.userId, (map.get(s.userId) as number) + (s.paid - s.owed));
      }
    }
  }
  for (const [k, v] of map) map.set(k, round2(v));
  return map;
}

/**
 * Greedy debt simplification: turns a set of net balances into the minimum-ish
 * set of "from owes to" transactions.
 */
export function simplifyDebts(balances: Map<string, number>): Debt[] {
  const creditors: { id: string; amt: number }[] = [];
  const debtors: { id: string; amt: number }[] = [];

  for (const [id, bal] of balances) {
    if (bal > EPS) creditors.push({ id, amt: bal });
    else if (bal < -EPS) debtors.push({ id, amt: -bal });
  }

  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const debts: Debt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amount = round2(Math.min(d.amt, c.amt));
    if (amount > EPS) {
      debts.push({ from: d.id, to: c.id, amount });
    }
    d.amt = round2(d.amt - amount);
    c.amt = round2(c.amt - amount);
    if (d.amt <= EPS) i++;
    if (c.amt <= EPS) j++;
  }
  return debts;
}

/**
 * For a group: return the list of "who owes whom" relationships.
 * If `simplify` is true the debts are simplified across all members,
 * otherwise direct pairwise balances are returned.
 */
export function groupDebts(
  memberIds: string[],
  expenses: Expense[],
  simplify: boolean,
): Debt[] {
  if (simplify) {
    return simplifyDebts(netBalances(memberIds, expenses));
  }
  // Direct pairwise
  const debts: Debt[] = [];
  for (let a = 0; a < memberIds.length; a++) {
    for (let b = a + 1; b < memberIds.length; b++) {
      const bal = balanceBetween(memberIds[a], memberIds[b], expenses);
      if (bal > EPS) debts.push({ from: memberIds[b], to: memberIds[a], amount: bal });
      else if (bal < -EPS) debts.push({ from: memberIds[a], to: memberIds[b], amount: -bal });
    }
  }
  return debts;
}

export interface BalanceSummary {
  totalOwed: number; // others owe you
  totalOwe: number; // you owe others
  net: number; // totalOwed - totalOwe
}

/** Overall summary for the current user across all friends. */
export function summaryForUser(
  userId: string,
  otherIds: string[],
  expenses: Expense[],
): BalanceSummary {
  let totalOwed = 0;
  let totalOwe = 0;
  for (const otherId of otherIds) {
    const bal = balanceBetween(userId, otherId, expenses);
    if (bal > EPS) totalOwed += bal;
    else if (bal < -EPS) totalOwe += -bal;
  }
  totalOwed = round2(totalOwed);
  totalOwe = round2(totalOwe);
  return { totalOwed, totalOwe, net: round2(totalOwed - totalOwe) };
}
