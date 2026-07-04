import type {
  Comment,
  Expense,
  ExpenseShare,
  Group,
  LineItem,
  RecurringExpense,
  User,
} from "@/lib/types";

const AVATAR_COLORS = [
  "#7C3AED", "#FF8A5B", "#6C8AE4", "#C566B5", "#E4694A",
  "#5BA0C5", "#7FB069", "#E4A85B", "#B05BC5", "#5BC5C0",
  "#E45B6E", "#9C7B5A",
];

function pickAvatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export interface ProfileRow {
  id: string;
  email: string;
  name: string;
  avatar_color: string | null;
  avatar_url: string | null;
  venmo: string | null;
  paypal: string | null;
  cashapp: string | null;
  is_placeholder: boolean;
  support_id?: string | null;
  phone?: string | null;
}

export function rowToUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarColor: row.avatar_color ?? pickAvatarColor(row.name + row.email),
    avatarUrl: row.avatar_url ?? undefined,
    venmo: row.venmo ?? undefined,
    paypal: row.paypal ?? undefined,
    cashapp: row.cashapp ?? undefined,
    supportId: row.support_id ?? undefined,
    phone: row.phone ?? undefined,
    ...(row.is_placeholder ? { pending: true } : {}),
  };
}

export interface GroupRow {
  id: string;
  name: string;
  type: string;
  simplify_debts: boolean;
  monthly_budget: string | number | null;
  created_at: string;
}

export function rowToGroup(row: GroupRow, memberIds: string[]): Group {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Group["type"],
    memberIds,
    simplifyDebts: row.simplify_debts,
    monthlyBudget: row.monthly_budget != null ? Number(row.monthly_budget) : undefined,
    createdAt: row.created_at,
  };
}

export interface ExpenseRow {
  id: string;
  description: string;
  amount: string | number;
  currency: string;
  category: string;
  date: string;
  group_id: string | null;
  created_by: string;
  created_at: string;
  is_settlement: boolean;
  notes: string | null;
  receipt_url: string | null;
  recurring_id: string | null;
  tax: string | number | null;
  tip: string | number | null;
  payment_method: string | null;
  disputed: boolean;
  dispute_reason: string | null;
  disputed_by: string | null;
  disputed_at: string | null;
}

export function rowToExpense(
  row: ExpenseRow,
  shares: { user_id: string; paid: string | number; owed: string | number }[],
  items: { id: string; name: string; amount: string | number; participantIds: string[] }[],
  comments: { id: string; user_id: string; text: string; created_at: string }[],
): Expense {
  const expenseShares: ExpenseShare[] = shares.map((s) => ({
    userId: s.user_id,
    paid: Number(s.paid),
    owed: Number(s.owed),
  }));
  const lineItems: LineItem[] = items.map((it) => ({
    id: it.id,
    name: it.name,
    amount: Number(it.amount),
    participantIds: it.participantIds,
  }));
  const expenseComments: Comment[] = comments.map((c) => ({
    id: c.id,
    userId: c.user_id,
    text: c.text,
    createdAt: c.created_at,
  }));
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    date: row.date,
    groupId: row.group_id,
    shares: expenseShares,
    createdBy: row.created_by,
    createdAt: row.created_at,
    isSettlement: row.is_settlement,
    notes: row.notes ?? undefined,
    receiptUrl: row.receipt_url ?? undefined,
    comments: expenseComments.length ? expenseComments : undefined,
    recurringId: row.recurring_id ?? undefined,
    items: lineItems.length ? lineItems : undefined,
    tax: row.tax != null ? Number(row.tax) : undefined,
    tip: row.tip != null ? Number(row.tip) : undefined,
    paymentMethod: (row.payment_method as Expense["paymentMethod"]) ?? undefined,
    disputed: row.disputed,
    disputeReason: row.dispute_reason ?? undefined,
    disputedBy: row.disputed_by ?? undefined,
    disputedAt: row.disputed_at ?? undefined,
  };
}

export interface RecurringRow {
  id: string;
  description: string;
  amount: string | number;
  currency: string;
  category: string;
  group_id: string | null;
  payer_id: string;
  created_by: string;
  frequency: string;
  start_date: string;
  next_due: string;
  active: boolean;
  created_at: string;
}

export function rowToRecurring(
  row: RecurringRow,
  shares: { user_id: string; paid: string | number; owed: string | number }[],
): RecurringExpense {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    groupId: row.group_id,
    shares: shares.map((s) => ({
      userId: s.user_id,
      paid: Number(s.paid),
      owed: Number(s.owed),
    })),
    payerId: row.payer_id,
    createdBy: row.created_by,
    frequency: row.frequency as RecurringExpense["frequency"],
    startDate: row.start_date,
    nextDue: row.next_due,
    active: row.active,
    createdAt: row.created_at,
  };
}
