import { apiRequest } from "./api-client";
import type {
  AppState,
  Comment,
  Expense,
  Group,
  GroupType,
  RecurringExpense,
  User,
} from "./types";

export interface PullResponse {
  baseCurrency: string;
  onboarded: boolean;
  notificationsReadAt?: string;
  users: User[];
  groups: Group[];
  expenses: Expense[];
  recurring: RecurringExpense[];
}

export interface MigrateResponse {
  ok: boolean;
  connected: number;
  invited: number;
  migratedExpenses: number;
  migratedGroups: number;
}

export const pullState = () => apiRequest<PullResponse>("GET", "/api/sync/pull");

export const claimInvites = () =>
  apiRequest<{ ok: boolean }>("POST", "/api/sync/claim-invites");

export const migrateLocalState = (state: AppState) =>
  apiRequest<MigrateResponse>("POST", "/api/sync/migrate", { state });

export const addFriendApi = (name: string, email: string) =>
  apiRequest<{ status: "connected" | "invited"; friend: User }>("POST", "/api/friends", {
    name,
    email,
  });

export const removeFriendApi = (id: string) =>
  apiRequest<{ ok: boolean }>("DELETE", `/api/friends/${id}`);

export const updateProfileApi = (id: string, patch: Record<string, unknown>) =>
  apiRequest<{ user: User }>("PATCH", `/api/profiles/${id}`, patch);

export const createGroupApi = (name: string, type: GroupType, memberIds: string[]) =>
  apiRequest<{ group: Group }>("POST", "/api/groups", { name, type, memberIds });

export const updateGroupApi = (id: string, patch: Partial<Group>) =>
  apiRequest<{ group: Group }>("PATCH", `/api/groups/${id}`, patch);

export const deleteGroupApi = (id: string) =>
  apiRequest<{ ok: boolean }>("DELETE", `/api/groups/${id}`);

export const createExpenseApi = (e: Omit<Expense, "id" | "createdAt">) =>
  apiRequest<{ expense: Expense }>("POST", "/api/expenses", e);

export const updateExpenseApi = (id: string, patch: Partial<Expense>) =>
  apiRequest<{ expense: Expense }>("PATCH", `/api/expenses/${id}`, patch);

export const deleteExpenseApi = (id: string) =>
  apiRequest<{ ok: boolean }>("DELETE", `/api/expenses/${id}`);

export const addCommentApi = (expenseId: string, text: string) =>
  apiRequest<{ comment: Comment }>("POST", `/api/expenses/${expenseId}/comments`, { text });

export const createRecurringApi = (r: Omit<RecurringExpense, "id" | "createdAt">) =>
  apiRequest<{ recurring: RecurringExpense }>("POST", "/api/recurring", r);

export const updateRecurringApi = (id: string, patch: Partial<RecurringExpense>) =>
  apiRequest<{ recurring: RecurringExpense }>("PATCH", `/api/recurring/${id}`, patch);

export const deleteRecurringApi = (id: string) =>
  apiRequest<{ ok: boolean }>("DELETE", `/api/recurring/${id}`);

export const logRecurringNowApi = (id: string) =>
  apiRequest<{ expense: Expense; recurring: RecurringExpense | null }>(
    "POST",
    `/api/recurring/${id}/log-now`,
  );

export const addSettlementsApi = (
  payments: {
    fromId: string;
    toId: string;
    amount: number;
    currency: string;
    groupId: string | null;
  }[],
) => apiRequest<{ expenses: Expense[] }>("POST", "/api/settlements", { payments });
