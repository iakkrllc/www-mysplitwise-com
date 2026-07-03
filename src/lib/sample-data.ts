import { round2 } from "./calculations";
import { splitEqual } from "./split";
import type {
  AppState,
  Expense,
  ExpenseShare,
  ExpenseTemplate,
  RecurringExpense,
  User,
} from "./types";

export const CURRENT_USER_ID = "u_alex";

export const SAMPLE_USERS: User[] = [
  { id: "u_alex", name: "Alex Morgan", email: "alex@mysplitz.com", avatarColor: "#7C3AED" },
  { id: "u_marcel", name: "Marcel Proust", email: "marcel@example.com", avatarColor: "#FF8A5B" },
  { id: "u_noor", name: "Noor Idris", email: "noor@example.com", avatarColor: "#6C8AE4" },
  { id: "u_ada", name: "Ada Lovelace", email: "ada@example.com", avatarColor: "#C566B5" },
  { id: "u_harry", name: "Harry Hughes", email: "harry@example.com", avatarColor: "#E4694A" },
  { id: "u_zoe", name: "Zoe Carter", email: "zoe@example.com", avatarColor: "#5BA0C5" },
  { id: "u_sam", name: "Sam Rivera", email: "sam@example.com", avatarColor: "#7FB069" },
];

/** Build an equal-split expense. */
function eq(
  id: string,
  description: string,
  amount: number,
  category: string,
  date: string,
  groupId: string | null,
  payerId: string,
  memberIds: string[],
): Expense {
  const owedArr = splitEqual(amount, memberIds.length);
  const shares: ExpenseShare[] = memberIds.map((uid, i) => ({
    userId: uid,
    paid: uid === payerId ? amount : 0,
    owed: owedArr[i],
  }));
  return {
    id,
    description,
    amount,
    currency: "USD",
    category,
    date,
    groupId,
    shares,
    createdBy: payerId,
    createdAt: new Date(`${date}T12:00:00`).toISOString(),
    isSettlement: false,
  };
}

/** Build a settlement payment from -> to. */
function pay(
  id: string,
  fromId: string,
  toId: string,
  amount: number,
  date: string,
  groupId: string | null,
): Expense {
  const shares: ExpenseShare[] = [
    { userId: fromId, paid: amount, owed: 0 },
    { userId: toId, paid: 0, owed: amount },
  ];
  return {
    id,
    description: "Payment",
    amount,
    currency: "USD",
    category: "payment",
    date,
    groupId,
    shares,
    createdBy: fromId,
    createdAt: new Date(`${date}T12:00:00`).toISOString(),
    isSettlement: true,
  };
}

const GROUPS = [
  {
    id: "g_apartment",
    name: "Our apartment",
    type: "home" as const,
    memberIds: ["u_alex", "u_marcel"],
    simplifyDebts: false,
    monthlyBudget: 2000,
    createdAt: new Date("2026-01-04T12:00:00").toISOString(),
  },
  {
    id: "g_vegas",
    name: "Vegas trip",
    type: "trip" as const,
    memberIds: ["u_alex", "u_noor", "u_ada"],
    simplifyDebts: true,
    createdAt: new Date("2026-04-18T12:00:00").toISOString(),
  },
  {
    id: "g_cabin",
    name: "Weekend cabin",
    type: "trip" as const,
    memberIds: ["u_alex", "u_zoe", "u_sam", "u_harry"],
    simplifyDebts: true,
    createdAt: new Date("2026-05-22T12:00:00").toISOString(),
  },
];

const EXPENSES: Expense[] = [
  // ---- Our apartment ----
  eq("e1", "June rent", 1000, "rent", "2026-06-01", "g_apartment", "u_marcel", ["u_alex", "u_marcel"]),
  eq("e2", "Costco groceries", 470, "groceries", "2026-06-08", "g_apartment", "u_alex", ["u_alex", "u_marcel"]),
  eq("e3", "Electric bill", 90, "electricity", "2026-06-12", "g_apartment", "u_marcel", ["u_alex", "u_marcel"]),
  eq("e4", "New couch", 90, "furniture", "2026-06-15", "g_apartment", "u_alex", ["u_alex", "u_marcel"]),
  eq("e5", "Internet — June", 64.99, "internet", "2026-06-18", "g_apartment", "u_alex", ["u_alex", "u_marcel"]),
  eq("e6", "Dish soap & paper towels", 34.5, "household", "2026-06-21", "g_apartment", "u_marcel", ["u_alex", "u_marcel"]),

  // ---- Vegas trip ----
  eq("e10", "Flights", 240, "travel", "2026-04-20", "g_vegas", "u_alex", ["u_alex", "u_noor", "u_ada"]),
  eq("e11", "Hotel — 2 nights", 300, "travel", "2026-04-21", "g_vegas", "u_noor", ["u_alex", "u_noor", "u_ada"]),
  eq("e12", "Dinner & drinks", 120, "dining", "2026-04-21", "g_vegas", "u_ada", ["u_alex", "u_noor", "u_ada"]),
  eq("e13", "Cirque show tickets", 210, "tickets", "2026-04-22", "g_vegas", "u_alex", ["u_alex", "u_noor", "u_ada"]),

  // ---- Weekend cabin ----
  eq("e20", "Cabin rental", 480, "travel", "2026-05-23", "g_cabin", "u_alex", ["u_alex", "u_zoe", "u_sam", "u_harry"]),
  eq("e21", "Groceries for the weekend", 160, "groceries", "2026-05-23", "g_cabin", "u_zoe", ["u_alex", "u_zoe", "u_sam", "u_harry"]),
  eq("e22", "Gas for the drive", 80, "gas", "2026-05-23", "g_cabin", "u_sam", ["u_alex", "u_zoe", "u_sam", "u_harry"]),
  eq("e23", "Firewood & s'mores", 60, "household", "2026-05-24", "g_cabin", "u_harry", ["u_alex", "u_zoe", "u_sam", "u_harry"]),
  pay("e24", "u_zoe", "u_alex", 30, "2026-06-02", "g_cabin"),

  // ---- Non-group (with Harry) ----
  eq("e30", "Lunch at Sahadi's", 26.77, "dining", "2026-06-10", null, "u_harry", ["u_alex", "u_harry"]),
  eq("e31", "Concert tickets", 90, "tickets", "2026-06-14", null, "u_alex", ["u_alex", "u_harry"]),
];

const RECURRING: RecurringExpense[] = [
  {
    id: "r_rent",
    description: "Rent",
    amount: 1000,
    currency: "USD",
    category: "rent",
    groupId: "g_apartment",
    payerId: "u_marcel",
    shares: [
      { userId: "u_alex", paid: 0, owed: 500 },
      { userId: "u_marcel", paid: 1000, owed: 500 },
    ],
    createdBy: "u_marcel",
    frequency: "monthly",
    startDate: "2026-01-01",
    nextDue: "2026-07-01",
    active: true,
    createdAt: new Date("2026-01-01T12:00:00").toISOString(),
  },
  {
    id: "r_netflix",
    description: "Netflix",
    amount: 19.99,
    currency: "USD",
    category: "entertainment",
    groupId: "g_apartment",
    payerId: "u_alex",
    shares: [
      { userId: "u_alex", paid: 19.99, owed: 10.0 },
      { userId: "u_marcel", paid: 0, owed: 9.99 },
    ],
    createdBy: "u_alex",
    frequency: "monthly",
    startDate: "2026-02-05",
    nextDue: "2026-07-05",
    active: true,
    createdAt: new Date("2026-02-05T12:00:00").toISOString(),
  },
];

/** Comments + receipt attached to a couple of sample expenses for demo. */
function withExtras(expenses: Expense[]): Expense[] {
  return expenses.map((e) => {
    if (e.id === "e20") {
      return {
        ...e,
        notes: "Booked the lakeside cabin on Airbnb — 2 nights.",
        comments: [
          {
            id: "c1",
            userId: "u_zoe",
            text: "Such a great spot! Worth every penny 🏞️",
            createdAt: new Date("2026-05-24T09:12:00").toISOString(),
          },
          {
            id: "c2",
            userId: "u_alex",
            text: "Agreed — let's rebook for next summer.",
            createdAt: new Date("2026-05-24T10:01:00").toISOString(),
          },
        ],
      };
    }
    return e;
  });
}

const TEMPLATES: ExpenseTemplate[] = [
  {
    id: "t_groceries",
    name: "Weekly groceries",
    description: "Groceries",
    amount: 80,
    currency: "USD",
    category: "groceries",
    groupId: "g_apartment",
    payerId: "u_alex",
    shares: [
      { userId: "u_alex", paid: 80, owed: 40 },
      { userId: "u_marcel", paid: 0, owed: 40 },
    ],
    createdAt: new Date("2026-03-01T12:00:00").toISOString(),
  },
  {
    id: "t_coffee",
    name: "Coffee run",
    description: "Coffee",
    amount: 12,
    currency: "USD",
    category: "coffee",
    groupId: null,
    payerId: "u_alex",
    shares: [
      { userId: "u_alex", paid: 12, owed: 6 },
      { userId: "u_harry", paid: 0, owed: 6 },
    ],
    createdAt: new Date("2026-03-02T12:00:00").toISOString(),
  },
];

export function makeSampleState(): AppState {
  const state: AppState = {
    currentUserId: CURRENT_USER_ID,
    baseCurrency: "USD",
    users: SAMPLE_USERS,
    groups: GROUPS,
    expenses: withExtras(EXPENSES),
    recurring: RECURRING,
    templates: TEMPLATES,
    onboarded: false,
  };
  // deep clone so resets and recurring generation never mutate the templates
  return JSON.parse(JSON.stringify(state));
}

// Sanity helper kept for clarity (rounds any float drift on owed/paid)
export function normalizeExpense(e: Expense): Expense {
  return {
    ...e,
    amount: round2(e.amount),
    shares: e.shares.map((s) => ({ ...s, paid: round2(s.paid), owed: round2(s.owed) })),
  };
}
