"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import {
  formatMoney,
  netBalances,
  simplifyDebts,
  summaryForUser,
} from "@/lib/calculations";
import { UserAvatar, AvatarStack } from "../user-avatar";
import { Button } from "../ui/button";
import { ExpenseList } from "../expense-list";
import {
  Plus,
  Scale,
  Settings,
  Trash2,
  Pencil,
  Plane,
  Home,
  Heart,
  Folder,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { GroupType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GroupInsights } from "../charts/group-insights";

const GROUP_ICONS: Record<GroupType, typeof Home> = {
  home: Home,
  trip: Plane,
  couple: Heart,
  other: Folder,
};

export function GroupView({ groupId }: { groupId: string }) {
  const { state, currentUser, getGroup, getUser, deleteGroup, setView, baseExpenses } =
    useStore();
  const { openModal } = useUI();
  const group = getGroup(groupId);
  const base = state.baseCurrency;

  const expenses = useMemo(
    () => state.expenses.filter((e) => e.groupId === groupId),
    [state.expenses, groupId],
  );

  const members = useMemo(
    () =>
      group
        ? group.memberIds
            .map((id) => getUser(id))
            .filter((u): u is NonNullable<typeof u> => Boolean(u))
        : [],
    [group, getUser],
  );

  const { balancesMap, debts, mySummary } = useMemo(() => {
    if (!group)
      return { balancesMap: new Map<string, number>(), debts: [], mySummary: null };
    const ge = baseExpenses.filter((e) => e.groupId === groupId);
    const balancesMap = netBalances(group.memberIds, ge);
    const debts = simplifyDebts(balancesMap);
    const mySummary = summaryForUser(
      currentUser.id,
      group.memberIds.filter((m) => m !== currentUser.id),
      ge,
    );
    return { balancesMap, debts, mySummary };
  }, [group, baseExpenses, groupId, currentUser.id]);

  if (!group) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        This group no longer exists.
      </div>
    );
  }

  const Icon = GROUP_ICONS[group.type];
  const net = mySummary?.net ?? 0;
  const settled = Math.abs(net) < 0.01;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: "hsl(var(--sw-green))" }}
          >
            <Icon className="h-8 w-8" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-sw-charcoal">
              {group.name}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <AvatarStack users={members} size={24} />
              <span className="text-sm text-muted-foreground">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="orange"
            onClick={() => openModal({ kind: "settle", groupId })}
            className="gap-1.5"
          >
            <Scale className="h-4 w-4" /> Settle up
          </Button>
          <Button
            variant="green"
            onClick={() => openModal({ kind: "addExpense", groupId })}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add expense
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Group settings">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => openModal({ kind: "createGroup", editId: group.id })}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit group
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  deleteGroup(group.id);
                  setView({ type: "dashboard" });
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* My balance banner */}
      <div
        className={cn(
          "mt-5 rounded-xl border px-5 py-3.5 text-[15px] font-semibold",
          settled
            ? "border-border bg-muted/40 text-sw-charcoal"
            : net > 0
              ? "border-[hsl(var(--sw-green))]/30 bg-secondary text-owed"
              : "border-[hsl(var(--sw-orange))]/25 bg-[hsl(var(--sw-orange))]/8 text-owe",
        )}
      >
        {settled ? (
          <>You are all settled up in this group.</>
        ) : net > 0 ? (
          <>
            You are owed{" "}
            <span className="font-extrabold">{formatMoney(net, base)}</span>{" "}
            overall
          </>
        ) : (
          <>
            You owe{" "}
            <span className="font-extrabold">{formatMoney(-net, base)}</span>{" "}
            overall
          </>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Expenses */}
        <div className="order-2 lg:order-1">
          <ExpenseList expenses={expenses} />
        </div>

        {/* Balances panel */}
        <aside className="order-1 lg:order-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Group balances
            </h3>
            <div className="space-y-2.5">
              {members.map((m) => {
                const bal = balancesMap.get(m.id) ?? 0;
                const s = Math.abs(bal) < 0.01;
                return (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <UserAvatar user={m} size={28} />
                    <span className="flex-1 truncate text-sm font-semibold text-sw-charcoal">
                      {m.id === currentUser.id ? "You" : m.name.split(" ")[0]}
                    </span>
                    <span
                      className={cn(
                        "text-right text-xs font-bold",
                        s
                          ? "text-muted-foreground"
                          : bal > 0
                            ? "text-owed"
                            : "text-owe",
                      )}
                    >
                      {s
                        ? "settled"
                        : bal > 0
                          ? `gets ${formatMoney(bal, base)}`
                          : `owes ${formatMoney(-bal, base)}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {debts.length > 0 && (
              <>
                <div className="my-4 h-px bg-border" />
                <h3 className="mb-3 text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Suggested settle up
                </h3>
                <div className="space-y-2">
                  {debts.map((d, i) => {
                    const from = getUser(d.from);
                    const to = getUser(d.to);
                    if (!from || !to) return null;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          openModal({
                            kind: "settle",
                            groupId,
                            fromId: d.from,
                            toId: d.to,
                          })
                        }
                        className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-[13px] transition-colors hover:border-primary/40 hover:bg-muted/50"
                      >
                        <span className="font-semibold text-sw-charcoal">
                          {from.id === currentUser.id ? "You" : from.name.split(" ")[0]}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold text-sw-charcoal">
                          {to.id === currentUser.id ? "you" : to.name.split(" ")[0]}
                        </span>
                        <span className="ml-auto font-bold text-owe">
                          {formatMoney(d.amount, base)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <GroupInsights groupId={groupId} />
    </div>
  );
}
