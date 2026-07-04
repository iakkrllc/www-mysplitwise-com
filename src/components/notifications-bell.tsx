"use client";

import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { balanceBetween, formatMoney } from "@/lib/calculations";
import { todayISO, parseLocalDate } from "@/lib/dates";
import { predictedNudges } from "@/lib/predictive-nudges";
import {
  Bell,
  CalendarClock,
  MessageSquare,
  ArrowRightLeft,
  HandCoins,
  Scale,
  Check,
  Sparkles,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

interface Notif {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  title: React.ReactNode;
  sub?: string;
  at?: string;
  action?: { label: string; run: () => void };
}

function daysUntil(dateStr: string) {
  const a = parseLocalDate(todayISO()).getTime();
  const b = parseLocalDate(dateStr).getTime();
  return Math.round((b - a) / 86400000);
}
function dueLabel(dateStr: string) {
  const d = daysUntil(dateStr);
  if (d < 0) return `${-d} day${-d === 1 ? "" : "s"} ago`;
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}

export function NotificationsBell() {
  const {
    state,
    baseExpenses,
    currentUser,
    getUser,
    logRecurringNow,
    setNotificationsRead,
  } = useStore();
  const { openModal } = useUI();
  const base = state.baseCurrency;

  const nameOf = (id: string) =>
    id === currentUser.id ? "You" : getUser(id)?.name.split(" ")[0] ?? "Someone";

  const notifs = useMemo<Notif[]>(() => {
    const timed: Notif[] = [];
    const standing: Notif[] = [];
    const prefs = currentUser.notificationPrefs;

    // Recurring due within a week (or overdue)
    for (const r of state.recurring) {
      if (!r.active) continue;
      if (prefs.recurringDue === false) continue;
      if (daysUntil(r.nextDue) <= 7) {
        standing.push({
          id: `rec-${r.id}`,
          icon: CalendarClock,
          iconColor: "#5BA0C5",
          title: (
            <>
              <b>{r.description}</b> is due {dueLabel(r.nextDue)}
            </>
          ),
          sub: `${formatMoney(r.amount, r.currency)} · ${r.frequency}`,
          action: {
            label: "Log now",
            run: () => {
              logRecurringNow(r.id);
              toast.success(`"${r.description}" added`);
            },
          },
        });
      }
    }

    // Comments by others + payments received
    for (const e of state.expenses) {
      for (const c of e.comments ?? []) {
        if (c.userId === currentUser.id) continue;
        if (prefs.comment === false) continue;
        timed.push({
          id: `c-${c.id}`,
          icon: MessageSquare,
          iconColor: "#C566B5",
          at: c.createdAt,
          title: (
            <>
              <b>{nameOf(c.userId)}</b> commented on “{e.description}”
            </>
          ),
          sub: c.text,
          action: {
            label: "View",
            run: () => openModal({ kind: "expenseDetail", id: e.id }),
          },
        });
      }
      if (e.isSettlement) {
        const payee = e.shares.find((s) => s.owed > 0.001);
        const payer = e.shares.find((s) => s.paid > 0.001);
        if (payee?.userId === currentUser.id && prefs.settlementReceived !== false) {
          timed.push({
            id: `p-${e.id}`,
            icon: ArrowRightLeft,
            iconColor: "#22A85A",
            at: e.createdAt,
            title: (
              <>
                <b>{nameOf(payer?.userId ?? "")}</b> paid you{" "}
                {formatMoney(e.amount, e.currency)}
              </>
            ),
            action: {
              label: "View",
              run: () => openModal({ kind: "expenseDetail", id: e.id }),
            },
          });
        }
        if (e.disputed && e.createdBy === currentUser.id && prefs.settlementDisputed !== false) {
          timed.push({
            id: `dispute-${e.id}`,
            icon: AlertTriangle,
            iconColor: "#E63879",
            at: e.disputedAt ?? e.createdAt,
            title: (
              <>
                <b>{nameOf(e.disputedBy ?? "")}</b> disputed the{" "}
                {formatMoney(e.amount, e.currency)} payment you logged
              </>
            ),
            sub: e.disputeReason,
            action: {
              label: "View",
              run: () => openModal({ kind: "expenseDetail", id: e.id }),
            },
          });
        }
      }
    }

    // Predicted spending patterns that look overdue (e.g. groceries every ~7 days)
    for (const n of prefs.aiNudge === false ? [] : predictedNudges(state.expenses)) {
      standing.push({
        id: `nudge-${n.key}`,
        icon: Sparkles,
        iconColor: "#7C3AED",
        title: (
          <>
            You usually log <b>{n.description}</b> every ~{n.intervalDays} days
          </>
        ),
        sub: `Last one was ${n.daysSinceLast} days ago · ~${formatMoney(n.avgAmount, n.currency)}`,
        action: {
          label: "Log it",
          run: () =>
            openModal({
              kind: "addExpense",
              aiPrefill: {
                description: n.description,
                category: n.category,
                amount: n.avgAmount,
              },
            }),
        },
      });
    }

    // Outstanding balances → remind / settle
    const friends = state.users.filter((u) => u.id !== currentUser.id);
    for (const f of friends) {
      const bal = balanceBetween(currentUser.id, f.id, baseExpenses);
      if (bal > 0.5 && prefs.friendOwesYou !== false) {
        standing.push({
          id: `owed-${f.id}`,
          icon: HandCoins,
          iconColor: "#145C31",
          title: (
            <>
              <b>{f.name.split(" ")[0]}</b> owes you {formatMoney(bal, base)}
            </>
          ),
          action: {
            label: "Remind",
            run: () => openModal({ kind: "reminderDraft", friendId: f.id }),
          },
        });
      } else if (bal < -0.5 && prefs.youOweFriend !== false) {
        standing.push({
          id: `owe-${f.id}`,
          icon: Scale,
          iconColor: "#E63879",
          title: (
            <>
              You owe <b>{f.name.split(" ")[0]}</b> {formatMoney(-bal, base)}
            </>
          ),
          action: {
            label: "Settle up",
            run: () =>
              openModal({
                kind: "settle",
                groupId: null,
                fromId: currentUser.id,
                toId: f.id,
              }),
          },
        });
      }
    }

    timed.sort((a, b) => +new Date(b.at as string) - +new Date(a.at as string));
    return [...standing.filter((n) => n.id.startsWith("rec-")), ...timed, ...standing.filter((n) => !n.id.startsWith("rec-"))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.recurring,
    state.expenses,
    state.users,
    baseExpenses,
    base,
    currentUser.id,
    currentUser.notificationPrefs,
  ]);

  const unread = useMemo(() => {
    const readAt = state.notificationsReadAt
      ? +new Date(state.notificationsReadAt)
      : 0;
    return notifs.filter((n) => n.at && +new Date(n.at) > readAt).length;
  }, [notifs, state.notificationsReadAt]);

  return (
    <Popover
      onOpenChange={(o) => {
        if (o) setNotificationsRead();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative rounded-md p-2 text-sw-charcoal transition-colors hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--sw-orange))] px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-bold text-sw-charcoal">Notifications</span>
          <span className="text-xs text-muted-foreground">
            {notifs.length} update{notifs.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Check className="h-8 w-8 text-primary" />
              <p className="text-sm font-semibold text-sw-charcoal">
                You're all caught up
              </p>
              <p className="text-xs text-muted-foreground">
                No reminders or balances need your attention.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {notifs.map((n) => {
                const Icon = n.icon;
                return (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${n.iconColor}22`,
                        color: n.iconColor,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-sw-charcoal">
                        {n.title}
                      </p>
                      {n.sub && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {n.sub}
                        </p>
                      )}
                    </div>
                    {n.action && (
                      <button
                        type="button"
                        onClick={n.action.run}
                        className="shrink-0 rounded-md bg-secondary px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:brightness-95"
                      >
                        {n.action.label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
