import { round2 } from "./calculations";
import type { AppState, Expense } from "./types";

/** Build a brand-new, empty account state for a real signed-in user. */
export function makeBlankState(user: {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}): AppState {
  return {
    currentUserId: user.id,
    baseCurrency: "USD",
    users: [
      {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
      },
    ],
    groups: [],
    expenses: [],
    recurring: [],
    templates: [],
    onboarded: false,
  };
}

// Sanity helper kept for clarity (rounds any float drift on owed/paid)
export function normalizeExpense(e: Expense): Expense {
  return {
    ...e,
    amount: round2(e.amount),
    shares: e.shares.map((s) => ({ ...s, paid: round2(s.paid), owed: round2(s.owed) })),
  };
}
