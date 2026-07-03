"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { makeBlankState } from "./sample-data";
import { useAuth } from "./auth-store";
import { round2, toBaseExpenses } from "./calculations";
import type {
  AppState,
  Expense,
  ExpenseTemplate,
  Frequency,
  Group,
  GroupType,
  RecurringExpense,
  User,
} from "./types";

const STORAGE_KEY = "mysplitwise.state.v1";

export function uid(prefix = "id_"): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function advanceDate(dateStr: string, freq: Frequency): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Backfill fields for state saved by an older version. */
function migrate(s: Partial<AppState> & Record<string, unknown>): AppState {
  return {
    currentUserId: (s.currentUserId as string) ?? "",
    baseCurrency: (s.baseCurrency as string) ?? "USD",
    users: (s.users as User[]) ?? [],
    groups: (s.groups as Group[]) ?? [],
    expenses: ((s.expenses as Expense[]) ?? []).map((e) => ({
      ...e,
      currency: e.currency ?? "USD",
    })),
    recurring: (s.recurring as RecurringExpense[]) ?? [],
    templates: (s.templates as ExpenseTemplate[]) ?? [],
    notificationsReadAt: s.notificationsReadAt as string | undefined,
    onboarded: (s.onboarded as boolean | undefined) ?? true,
  };
}

/** Generate any recurring expenses that are due on or before today. */
function processRecurring(state: AppState): AppState {
  const today = todayISO();
  const generated: Expense[] = [];
  let changed = false;
  const recurring = (state.recurring ?? []).map((r) => {
    if (!r.active) return r;
    let next = r.nextDue;
    let guard = 0;
    while (next <= today && guard < 120) {
      generated.push({
        id: uid("e_"),
        description: r.description,
        amount: r.amount,
        currency: r.currency,
        category: r.category,
        date: next,
        groupId: r.groupId,
        shares: r.shares.map((sh) => ({ ...sh })),
        createdBy: r.createdBy,
        createdAt: new Date().toISOString(),
        isSettlement: false,
        recurringId: r.id,
      });
      next = advanceDate(next, r.frequency);
      guard++;
    }
    if (next !== r.nextDue) {
      changed = true;
      return { ...r, nextDue: next };
    }
    return r;
  });
  if (!changed && generated.length === 0) return state;
  return { ...state, recurring, expenses: [...generated, ...state.expenses] };
}

const AVATAR_COLORS = [
  "#7C3AED", "#FF8A5B", "#6C8AE4", "#C566B5", "#E4694A",
  "#5BA0C5", "#7FB069", "#E4A85B", "#B05BC5", "#5BC5C0",
  "#E45B6E", "#9C7B5A",
];

export function pickAvatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export type View =
  | { type: "dashboard" }
  | { type: "activity" }
  | { type: "all-expenses" }
  | { type: "pay" }
  | { type: "recurring" }
  | { type: "friends" }
  | { type: "group"; id: string }
  | { type: "friend"; id: string }
  | { type: "account" };

interface StoreContextValue {
  state: AppState;
  loaded: boolean;
  view: View;
  setView: (v: View) => void;
  currentUser: User;
  /** All expenses converted to the app's base currency (for balance math). */
  baseExpenses: Expense[];
  // selectors
  getUser: (id: string) => User | undefined;
  getGroup: (id: string) => Group | undefined;
  // actions
  addExpense: (e: Omit<Expense, "id" | "createdAt">) => string;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addFriend: (name: string, email: string) => string;
  removeFriend: (id: string) => void;
  addGroup: (name: string, type: GroupType, memberIds: string[]) => string;
  updateGroup: (id: string, patch: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  updateProfile: (patch: Partial<User>) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  setBaseCurrency: (code: string) => void;
  setNotificationsRead: () => void;
  addComment: (expenseId: string, text: string) => void;
  addRecurring: (r: Omit<RecurringExpense, "id" | "createdAt">) => string;
  updateRecurring: (id: string, patch: Partial<RecurringExpense>) => void;
  deleteRecurring: (id: string) => void;
  logRecurringNow: (id: string) => void;
  addSettlements: (
    payments: {
      fromId: string;
      toId: string;
      amount: number;
      currency: string;
      groupId: string | null;
    }[],
  ) => void;
  addTemplate: (t: Omit<ExpenseTemplate, "id" | "createdAt">) => string;
  addFromTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  setOnboarded: (v: boolean) => void;
  exportState: () => string;
  importState: (json: string) => boolean;
  resetData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const authUserId = authUser?.id ?? "anonymous";
  const authName =
    (authUser?.user_metadata?.name as string | undefined) ||
    authUser?.email ||
    authUser?.phone ||
    "You";
  const authEmail = authUser?.email ?? authUser?.phone ?? "";
  const storageKey = `${STORAGE_KEY}.${authUserId}`;

  const blankState = useCallback(
    () =>
      makeBlankState({
        id: authUserId,
        name: authName,
        email: authEmail,
        avatarColor: pickAvatarColor(authEmail || authUserId),
      }),
    [authUserId, authName, authEmail],
  );

  const [state, setState] = useState<AppState>(() => blankState());
  const [view, setView] = useState<View>({ type: "dashboard" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let initial = blankState();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.users?.length) initial = migrate(parsed);
      }
    } catch {
      /* ignore corrupt storage */
    }
    initial = processRecurring(initial);
    setState(initial);
    setLoaded(true);
    // Intentionally run once at mount for this authenticated user's session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* storage full / unavailable */
    }
  }, [state, loaded, storageKey]);

  const getUser = useCallback(
    (id: string) => state.users.find((u) => u.id === id),
    [state.users],
  );
  const getGroup = useCallback(
    (id: string) => state.groups.find((g) => g.id === id),
    [state.groups],
  );

  const currentUser = useMemo(
    () =>
      state.users.find((u) => u.id === state.currentUserId) ?? state.users[0],
    [state.users, state.currentUserId],
  );

  const baseExpenses = useMemo(
    () => toBaseExpenses(state.expenses, state.baseCurrency),
    [state.expenses, state.baseCurrency],
  );

  const addExpense: StoreContextValue["addExpense"] = useCallback((e) => {
    const id = uid("e_");
    const expense: Expense = { ...e, id, createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, expenses: [expense, ...s.expenses] }));
    return id;
  }, []);

  const updateExpense: StoreContextValue["updateExpense"] = useCallback(
    (id, patch) => {
      setState((s) => ({
        ...s,
        expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },
    [],
  );

  const deleteExpense: StoreContextValue["deleteExpense"] = useCallback((id) => {
    setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }));
  }, []);

  const addFriend: StoreContextValue["addFriend"] = useCallback(
    (name, email) => {
      const id = uid("u_");
      const user: User = {
        id,
        name: name.trim(),
        email: email.trim(),
        avatarColor: pickAvatarColor(name + email),
      };
      setState((s) => ({ ...s, users: [...s.users, user] }));
      return id;
    },
    [],
  );

  const removeFriend: StoreContextValue["removeFriend"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      users: s.users.filter((u) => u.id !== id),
      groups: s.groups.map((g) => ({
        ...g,
        memberIds: g.memberIds.filter((m) => m !== id),
      })),
    }));
  }, []);

  const addGroup: StoreContextValue["addGroup"] = useCallback(
    (name, type, memberIds) => {
      const id = uid("g_");
      const group: Group = {
        id,
        name: name.trim(),
        type,
        memberIds,
        simplifyDebts: true,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, groups: [...s.groups, group] }));
      return id;
    },
    [],
  );

  const updateGroup: StoreContextValue["updateGroup"] = useCallback(
    (id, patch) => {
      setState((s) => ({
        ...s,
        groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      }));
    },
    [],
  );

  const deleteGroup: StoreContextValue["deleteGroup"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      groups: s.groups.filter((g) => g.id !== id),
      // move group expenses to non-group
      expenses: s.expenses.map((e) =>
        e.groupId === id ? { ...e, groupId: null } : e,
      ),
    }));
  }, []);

  const updateProfile: StoreContextValue["updateProfile"] = useCallback(
    (patch) => {
      setState((s) => ({
        ...s,
        users: s.users.map((u) =>
          u.id === s.currentUserId ? { ...u, ...patch } : u,
        ),
      }));
    },
    [],
  );

  const updateUser: StoreContextValue["updateUser"] = useCallback(
    (id, patch) => {
      setState((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      }));
    },
    [],
  );

  const setBaseCurrency: StoreContextValue["setBaseCurrency"] = useCallback(
    (code) => setState((s) => ({ ...s, baseCurrency: code })),
    [],
  );

  const setNotificationsRead: StoreContextValue["setNotificationsRead"] =
    useCallback(
      () =>
        setState((s) => ({
          ...s,
          notificationsReadAt: new Date().toISOString(),
        })),
      [],
    );

  const addComment: StoreContextValue["addComment"] = useCallback(
    (expenseId, text) => {
      const comment = {
        id: uid("c_"),
        userId: state.currentUserId,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({
        ...s,
        expenses: s.expenses.map((e) =>
          e.id === expenseId
            ? { ...e, comments: [...(e.comments ?? []), comment] }
            : e,
        ),
      }));
    },
    [state.currentUserId],
  );

  const addRecurring: StoreContextValue["addRecurring"] = useCallback((r) => {
    const id = uid("r_");
    const rec: RecurringExpense = {
      ...r,
      id,
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, recurring: [...s.recurring, rec] }));
    return id;
  }, []);

  const updateRecurring: StoreContextValue["updateRecurring"] = useCallback(
    (id, patch) => {
      setState((s) => ({
        ...s,
        recurring: s.recurring.map((r) =>
          r.id === id ? { ...r, ...patch } : r,
        ),
      }));
    },
    [],
  );

  const deleteRecurring: StoreContextValue["deleteRecurring"] = useCallback(
    (id) => {
      setState((s) => ({
        ...s,
        recurring: s.recurring.filter((r) => r.id !== id),
      }));
    },
    [],
  );

  const logRecurringNow: StoreContextValue["logRecurringNow"] = useCallback(
    (id) => {
      setState((s) => {
        const r = s.recurring.find((x) => x.id === id);
        if (!r) return s;
        const today = todayISO();
        const expense: Expense = {
          id: uid("e_"),
          description: r.description,
          amount: r.amount,
          currency: r.currency,
          category: r.category,
          date: today,
          groupId: r.groupId,
          shares: r.shares.map((sh) => ({ ...sh })),
          createdBy: r.createdBy,
          createdAt: new Date().toISOString(),
          isSettlement: false,
          recurringId: r.id,
        };
        return {
          ...s,
          expenses: [expense, ...s.expenses],
          recurring: s.recurring.map((x) =>
            x.id === id
              ? { ...x, nextDue: advanceDate(today, x.frequency) }
              : x,
          ),
        };
      });
    },
    [],
  );

  const addSettlements: StoreContextValue["addSettlements"] = useCallback(
    (payments) => {
      if (payments.length === 0) return;
      const now = new Date().toISOString();
      const today = todayISO();
      const newExpenses: Expense[] = payments.map((p) => ({
        id: uid("e_"),
        description: "Payment",
        amount: round2(p.amount),
        currency: p.currency,
        category: "payment",
        date: today,
        groupId: p.groupId,
        shares: [
          { userId: p.fromId, paid: round2(p.amount), owed: 0 },
          { userId: p.toId, paid: 0, owed: round2(p.amount) },
        ],
        createdBy: state.currentUserId,
        createdAt: now,
        isSettlement: true,
      }));
      setState((s) => ({ ...s, expenses: [...newExpenses, ...s.expenses] }));
    },
    [state.currentUserId],
  );

  const addTemplate: StoreContextValue["addTemplate"] = useCallback((t) => {
    const id = uid("t_");
    const tpl: ExpenseTemplate = { ...t, id, createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, templates: [...(s.templates ?? []), tpl] }));
    return id;
  }, []);

  const addFromTemplate: StoreContextValue["addFromTemplate"] = useCallback(
    (id) =>
      setState((s) => {
        const t = (s.templates ?? []).find((x) => x.id === id);
        if (!t) return s;
        const expense: Expense = {
          id: uid("e_"),
          description: t.description,
          amount: t.amount,
          currency: t.currency,
          category: t.category,
          date: todayISO(),
          groupId: t.groupId,
          shares: t.shares.map((sh) => ({ ...sh })),
          createdBy: s.currentUserId,
          createdAt: new Date().toISOString(),
          isSettlement: false,
        };
        return { ...s, expenses: [expense, ...s.expenses] };
      }),
    [],
  );

  const deleteTemplate: StoreContextValue["deleteTemplate"] = useCallback(
    (id) =>
      setState((s) => ({
        ...s,
        templates: (s.templates ?? []).filter((t) => t.id !== id),
      })),
    [],
  );

  const setOnboarded: StoreContextValue["setOnboarded"] = useCallback(
    (v) => setState((s) => ({ ...s, onboarded: v })),
    [],
  );

  const exportState: StoreContextValue["exportState"] = useCallback(
    () => JSON.stringify(state, null, 2),
    [state],
  );

  const importState: StoreContextValue["importState"] = useCallback((json) => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed?.users?.length) return false;
      setState(processRecurring(migrate(parsed)));
      setView({ type: "dashboard" });
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetData: StoreContextValue["resetData"] = useCallback(() => {
    setState({ ...blankState(), onboarded: true });
    setView({ type: "dashboard" });
  }, [blankState]);

  const value: StoreContextValue = {
    state,
    loaded,
    view,
    setView,
    currentUser,
    baseExpenses,
    getUser,
    getGroup,
    addExpense,
    updateExpense,
    deleteExpense,
    addFriend,
    removeFriend,
    addGroup,
    updateGroup,
    deleteGroup,
    updateProfile,
    updateUser,
    setBaseCurrency,
    setNotificationsRead,
    addComment,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    logRecurringNow,
    addSettlements,
    addTemplate,
    addFromTemplate,
    deleteTemplate,
    setOnboarded,
    exportState,
    importState,
    resetData,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
