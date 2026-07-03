export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export type GroupType = "trip" | "home" | "couple" | "other";

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  memberIds: string[];
  simplifyDebts: boolean;
  monthlyBudget?: number;
  createdAt: string;
}

/** Per-user breakdown of a single expense. sum(paid)===amount, sum(owed)===amount */
export interface ExpenseShare {
  userId: string;
  paid: number;
  owed: number;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface LineItem {
  id: string;
  name: string;
  amount: number;
  participantIds: string[];
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string; // ISO date string
  groupId: string | null;
  shares: ExpenseShare[];
  createdBy: string;
  createdAt: string;
  isSettlement: boolean;
  notes?: string;
  receiptUrl?: string;
  comments?: Comment[];
  recurringId?: string;
  items?: LineItem[];
  tax?: number;
  tip?: number;
}

export type SplitMethod = "equal" | "exact" | "percentage" | "shares";

export type Frequency = "weekly" | "monthly" | "yearly";

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  groupId: string | null;
  shares: ExpenseShare[];
  payerId: string;
  createdBy: string;
  frequency: Frequency;
  startDate: string; // ISO date
  nextDue: string; // ISO date
  active: boolean;
  createdAt: string;
}

export interface ExpenseTemplate {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  groupId: string | null;
  payerId: string;
  shares: ExpenseShare[];
  createdAt: string;
}

export interface AppState {
  currentUserId: string;
  baseCurrency: string;
  users: User[];
  groups: Group[];
  expenses: Expense[];
  recurring: RecurringExpense[];
  templates: ExpenseTemplate[];
  notificationsReadAt?: string;
  onboarded?: boolean;
}

/** A single "from owes to" relationship */
export interface Debt {
  from: string;
  to: string;
  amount: number;
}
