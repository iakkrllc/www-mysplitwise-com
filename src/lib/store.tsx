"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { makeBlankState } from "./sample-data";
import { useAuth } from "./auth-store";
import { round2, toBaseExpenses } from "./calculations";
import { todayISO, advanceDate } from "./dates";
import {
  pullState,
  migrateLocalState,
  addFriendApi,
  removeFriendApi,
  updateProfileApi,
  createGroupApi,
  updateGroupApi,
  deleteGroupApi,
  createExpenseApi,
  updateExpenseApi,
  deleteExpenseApi,
  addCommentApi,
  createRecurringApi,
  updateRecurringApi,
  deleteRecurringApi,
  logRecurringNowApi,
  addSettlementsApi,
  type PullResponse,
} from "./sync-api";
import type {
  AppState,
  Expense,
  ExpenseTemplate,
  Group,
  GroupType,
  RecurringExpense,
  User,
} from "./types";

// mysplitwise stores expenses/friends/groups on the server (Supabase) —
// that's the source of truth so two people can actually share a bill.
// localStorage below is kept only as a fast local cache: it seeds the UI
// instantly on load and gives some resilience if the network is briefly
// down, but every load pulls fresh data from the server and every mutation
// writes there too.
const STORAGE_KEY = "mysplitwise.state.v1";

export function uid(prefix = "id_"): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

export { advanceDate } from "./dates";

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

/** Generate any recurring expenses that are due on or before today (cosmetic local pre-render only — the server does this authoritatively on pull). */
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
  addFriend: (name: string, email: string) => Promise<{ id: string; status: "connected" | "invited" }>;
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

  const applyPulled = useCallback((pulled: PullResponse) => {
    setState((s) => ({
      ...s,
      baseCurrency: pulled.baseCurrency,
      onboarded: pulled.onboarded,
      notificationsReadAt: pulled.notificationsReadAt,
      users: pulled.users,
      groups: pulled.groups,
      expenses: pulled.expenses,
      recurring: pulled.recurring,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let initial = blankState();
    let localHadData = false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.users?.length) {
          initial = migrate(parsed);
          localHadData =
            parsed.users.length > 1 ||
            (parsed.expenses?.length ?? 0) > 0 ||
            (parsed.groups?.length ?? 0) > 0;
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    initial = processRecurring(initial);
    setState(initial);
    setLoaded(true); // show cached/blank UI immediately while we sync with the server

    (async () => {
      try {
        let pulled = await pullState();
        const looksEmpty =
          pulled.users.length <= 1 && pulled.expenses.length === 0 && pulled.groups.length === 0;
        if (looksEmpty && localHadData) {
          try {
            const result = await migrateLocalState(initial);
            if (result.connected > 0) {
              toast.success(
                `Welcome back — ${result.connected} of your friend${result.connected === 1 ? "" : "s"} ${
                  result.connected === 1 ? "is" : "are"
                } already on mysplitwise and now connected.`,
              );
            }
            pulled = await pullState();
          } catch (err) {
            toast.error(
              err instanceof Error
                ? `Couldn't sync your existing data: ${err.message}`
                : "Couldn't sync your existing data",
            );
          }
        }
        if (cancelled) return;
        applyPulled(pulled);
      } catch {
        if (!cancelled) {
          toast.error("You're viewing offline data — some info may be out of date");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
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

  // Keep in sync with a friend's changes: poll while the tab is visible, and
  // refetch immediately whenever the tab regains focus.
  useEffect(() => {
    if (!loaded) return;
    const refresh = () => {
      pullState().then(applyPulled).catch(() => {
        /* keep showing current state; the next poll or focus may succeed */
      });
    };
    const interval = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30_000);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loaded, applyPulled]);

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
    createExpenseApi(e).then(
      ({ expense: serverExpense }) => {
        setState((s) => ({
          ...s,
          expenses: s.expenses.map((x) => (x.id === id ? serverExpense : x)),
        }));
      },
      (err) => {
        setState((s) => ({ ...s, expenses: s.expenses.filter((x) => x.id !== id) }));
        toast.error(err instanceof Error ? err.message : "Couldn't save that expense");
      },
    );
    return id;
  }, []);

  const updateExpense: StoreContextValue["updateExpense"] = useCallback(
    (id, patch) => {
      let previous: Expense | undefined;
      setState((s) => {
        previous = s.expenses.find((e) => e.id === id);
        return {
          ...s,
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        };
      });
      updateExpenseApi(id, patch).then(
        ({ expense: serverExpense }) => {
          setState((s) => ({
            ...s,
            expenses: s.expenses.map((e) => (e.id === id ? serverExpense : e)),
          }));
        },
        (err) => {
          setState((s) =>
            previous
              ? { ...s, expenses: s.expenses.map((e) => (e.id === id ? previous! : e)) }
              : s,
          );
          toast.error(err instanceof Error ? err.message : "Couldn't update that expense");
        },
      );
    },
    [],
  );

  const deleteExpense: StoreContextValue["deleteExpense"] = useCallback((id) => {
    let removed: Expense | undefined;
    setState((s) => {
      removed = s.expenses.find((e) => e.id === id);
      return { ...s, expenses: s.expenses.filter((e) => e.id !== id) };
    });
    deleteExpenseApi(id).catch((err) => {
      setState((s) => (removed ? { ...s, expenses: [removed!, ...s.expenses] } : s));
      toast.error(err instanceof Error ? err.message : "Couldn't delete that expense");
    });
  }, []);

  const addFriend: StoreContextValue["addFriend"] = useCallback(async (name, email) => {
    const { status, friend } = await addFriendApi(name, email);
    setState((s) => ({
      ...s,
      users: s.users.some((u) => u.id === friend.id)
        ? s.users.map((u) => (u.id === friend.id ? friend : u))
        : [...s.users, friend],
    }));
    return { id: friend.id, status };
  }, []);

  const removeFriend: StoreContextValue["removeFriend"] = useCallback((id) => {
    let removedUser: User | undefined;
    setState((s) => {
      removedUser = s.users.find((u) => u.id === id);
      return {
        ...s,
        users: s.users.filter((u) => u.id !== id),
        groups: s.groups.map((g) => ({
          ...g,
          memberIds: g.memberIds.filter((m) => m !== id),
        })),
      };
    });
    removeFriendApi(id).catch((err) => {
      setState((s) => (removedUser ? { ...s, users: [...s.users, removedUser!] } : s));
      toast.error(err instanceof Error ? err.message : "Couldn't remove that friend");
    });
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
      createGroupApi(name.trim(), type, memberIds).then(
        ({ group: serverGroup }) => {
          setState((s) => ({
            ...s,
            groups: s.groups.map((g) => (g.id === id ? serverGroup : g)),
          }));
        },
        (err) => {
          setState((s) => ({ ...s, groups: s.groups.filter((g) => g.id !== id) }));
          toast.error(err instanceof Error ? err.message : "Couldn't create that group");
        },
      );
      return id;
    },
    [],
  );

  const updateGroup: StoreContextValue["updateGroup"] = useCallback(
    (id, patch) => {
      let previous: Group | undefined;
      setState((s) => {
        previous = s.groups.find((g) => g.id === id);
        return {
          ...s,
          groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        };
      });
      updateGroupApi(id, patch).then(
        ({ group: serverGroup }) => {
          setState((s) => ({
            ...s,
            groups: s.groups.map((g) => (g.id === id ? serverGroup : g)),
          }));
        },
        (err) => {
          setState((s) =>
            previous ? { ...s, groups: s.groups.map((g) => (g.id === id ? previous! : g)) } : s,
          );
          toast.error(err instanceof Error ? err.message : "Couldn't update that group");
        },
      );
    },
    [],
  );

  const deleteGroup: StoreContextValue["deleteGroup"] = useCallback((id) => {
    let removed: Group | undefined;
    setState((s) => {
      removed = s.groups.find((g) => g.id === id);
      return {
        ...s,
        groups: s.groups.filter((g) => g.id !== id),
        expenses: s.expenses.map((e) => (e.groupId === id ? { ...e, groupId: null } : e)),
      };
    });
    deleteGroupApi(id).catch((err) => {
      setState((s) => (removed ? { ...s, groups: [...s.groups, removed!] } : s));
      toast.error(err instanceof Error ? err.message : "Couldn't delete that group");
    });
  }, []);

  const updateProfile: StoreContextValue["updateProfile"] = useCallback(
    (patch) => {
      setState((s) => ({
        ...s,
        users: s.users.map((u) =>
          u.id === s.currentUserId ? { ...u, ...patch } : u,
        ),
      }));
      // Your email is tied to your real mysplitwise login and isn't editable here.
      const { email: _email, ...syncable } = patch;
      if (Object.keys(syncable).length > 0) {
        updateProfileApi(authUserId, syncable).catch((err) => {
          toast.error(err instanceof Error ? err.message : "Couldn't save your profile changes");
        });
      }
    },
    [authUserId],
  );

  const updateUser: StoreContextValue["updateUser"] = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
    updateProfileApi(id, patch).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't save those changes");
    });
  }, []);

  const setBaseCurrency: StoreContextValue["setBaseCurrency"] = useCallback(
    (code) => {
      setState((s) => ({ ...s, baseCurrency: code }));
      updateProfileApi(authUserId, { baseCurrency: code }).catch(() => {});
    },
    [authUserId],
  );

  const setNotificationsRead: StoreContextValue["setNotificationsRead"] =
    useCallback(() => {
      const now = new Date().toISOString();
      setState((s) => ({ ...s, notificationsReadAt: now }));
      updateProfileApi(authUserId, { notificationsReadAt: now }).catch(() => {});
    }, [authUserId]);

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
      addCommentApi(expenseId, comment.text).then(
        ({ comment: serverComment }) => {
          setState((s) => ({
            ...s,
            expenses: s.expenses.map((e) =>
              e.id === expenseId
                ? {
                    ...e,
                    comments: (e.comments ?? []).map((c) =>
                      c.id === comment.id ? serverComment : c,
                    ),
                  }
                : e,
            ),
          }));
        },
        (err) => {
          setState((s) => ({
            ...s,
            expenses: s.expenses.map((e) =>
              e.id === expenseId
                ? { ...e, comments: (e.comments ?? []).filter((c) => c.id !== comment.id) }
                : e,
            ),
          }));
          toast.error(err instanceof Error ? err.message : "Couldn't add that comment");
        },
      );
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
    createRecurringApi(r).then(
      ({ recurring: serverRecurring }) => {
        setState((s) => ({
          ...s,
          recurring: s.recurring.map((x) => (x.id === id ? serverRecurring : x)),
        }));
      },
      (err) => {
        setState((s) => ({ ...s, recurring: s.recurring.filter((x) => x.id !== id) }));
        toast.error(err instanceof Error ? err.message : "Couldn't set up that recurring bill");
      },
    );
    return id;
  }, []);

  const updateRecurring: StoreContextValue["updateRecurring"] = useCallback(
    (id, patch) => {
      let previous: RecurringExpense | undefined;
      setState((s) => {
        previous = s.recurring.find((r) => r.id === id);
        return {
          ...s,
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        };
      });
      updateRecurringApi(id, patch).then(
        ({ recurring: serverRecurring }) => {
          setState((s) => ({
            ...s,
            recurring: s.recurring.map((r) => (r.id === id ? serverRecurring : r)),
          }));
        },
        (err) => {
          setState((s) =>
            previous
              ? { ...s, recurring: s.recurring.map((r) => (r.id === id ? previous! : r)) }
              : s,
          );
          toast.error(err instanceof Error ? err.message : "Couldn't update that recurring bill");
        },
      );
    },
    [],
  );

  const deleteRecurring: StoreContextValue["deleteRecurring"] = useCallback(
    (id) => {
      let removed: RecurringExpense | undefined;
      setState((s) => {
        removed = s.recurring.find((r) => r.id === id);
        return { ...s, recurring: s.recurring.filter((r) => r.id !== id) };
      });
      deleteRecurringApi(id).catch((err) => {
        setState((s) => (removed ? { ...s, recurring: [...s.recurring, removed!] } : s));
        toast.error(err instanceof Error ? err.message : "Couldn't delete that recurring bill");
      });
    },
    [],
  );

  const logRecurringNow: StoreContextValue["logRecurringNow"] = useCallback(
    (id) => {
      const today = todayISO();
      const tempExpenseId = uid("e_");
      let localRecurring: RecurringExpense | undefined;
      setState((s) => {
        const r = s.recurring.find((x) => x.id === id);
        if (!r) return s;
        localRecurring = r;
        const expense: Expense = {
          id: tempExpenseId,
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
            x.id === id ? { ...x, nextDue: advanceDate(today, x.frequency) } : x,
          ),
        };
      });
      logRecurringNowApi(id).then(
        ({ expense: serverExpense, recurring: serverRecurring }) => {
          setState((s) => ({
            ...s,
            expenses: s.expenses.map((e) => (e.id === tempExpenseId ? serverExpense : e)),
            recurring: serverRecurring
              ? s.recurring.map((r) => (r.id === id ? serverRecurring : r))
              : s.recurring,
          }));
        },
        (err) => {
          setState((s) => ({
            ...s,
            expenses: s.expenses.filter((e) => e.id !== tempExpenseId),
            recurring: localRecurring
              ? s.recurring.map((r) => (r.id === id ? localRecurring! : r))
              : s.recurring,
          }));
          toast.error(err instanceof Error ? err.message : "Couldn't log that bill");
        },
      );
    },
    [],
  );

  const addSettlements: StoreContextValue["addSettlements"] = useCallback(
    (payments) => {
      if (payments.length === 0) return;
      const now = new Date().toISOString();
      const today = todayISO();
      const tempIds = payments.map(() => uid("e_"));
      const newExpenses: Expense[] = payments.map((p, i) => ({
        id: tempIds[i],
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
      addSettlementsApi(payments).then(
        ({ expenses: serverExpenses }) => {
          setState((s) => {
            let next = s.expenses;
            tempIds.forEach((tempId, i) => {
              const serverExpense = serverExpenses[i];
              if (serverExpense) next = next.map((e) => (e.id === tempId ? serverExpense : e));
            });
            return { ...s, expenses: next };
          });
        },
        (err) => {
          setState((s) => ({
            ...s,
            expenses: s.expenses.filter((e) => !tempIds.includes(e.id)),
          }));
          toast.error(err instanceof Error ? err.message : "Couldn't record that settlement");
        },
      );
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
    (v) => {
      setState((s) => ({ ...s, onboarded: v }));
      updateProfileApi(authUserId, { onboarded: v }).catch(() => {});
    },
    [authUserId],
  );

  const exportState: StoreContextValue["exportState"] = useCallback(
    () => JSON.stringify(state, null, 2),
    [state],
  );

  const importState: StoreContextValue["importState"] = useCallback((json) => {
    try {
      const parsed = migrate(JSON.parse(json));
      if (!parsed?.users?.length) return false;
      migrateLocalState(parsed)
        .then(() => pullState())
        .then((pulled) => {
          applyPulled(pulled);
          toast.success("Backup restored");
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Couldn't restore that backup");
        });
      setView({ type: "dashboard" });
      return true;
    } catch {
      return false;
    }
  }, [applyPulled]);

  const resetData: StoreContextValue["resetData"] = useCallback(() => {
    pullState()
      .then((pulled) => {
        setState((s) => ({ ...blankState(), ...s, templates: [] }));
        applyPulled(pulled);
      })
      .catch(() => {
        toast.error("Couldn't resync — check your connection and try again");
      });
    setView({ type: "dashboard" });
  }, [blankState, applyPulled]);

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
