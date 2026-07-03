"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import {
  balanceBetween,
  formatMoney,
  summaryForUser,
} from "@/lib/calculations";
import { UserAvatar } from "../user-avatar";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, PartyPopper } from "lucide-react";
import { DashboardCharts } from "../charts/dashboard-charts";

export function DashboardView() {
  const { state, currentUser, setView, baseExpenses } = useStore();
  const { openModal } = useUI();
  const base = state.baseCurrency;

  const friends = useMemo(
    () => state.users.filter((u) => u.id !== currentUser.id),
    [state.users, currentUser.id],
  );

  const { owe, owed, summary } = useMemo(() => {
    const owe: { id: string; amount: number }[] = [];
    const owed: { id: string; amount: number }[] = [];
    for (const f of friends) {
      const bal = balanceBetween(currentUser.id, f.id, baseExpenses);
      if (bal > 0.01) owed.push({ id: f.id, amount: bal });
      else if (bal < -0.01) owe.push({ id: f.id, amount: -bal });
    }
    owe.sort((a, b) => b.amount - a.amount);
    owed.sort((a, b) => b.amount - a.amount);
    const summary = summaryForUser(
      currentUser.id,
      friends.map((f) => f.id),
      baseExpenses,
    );
    return { owe, owed, summary };
  }, [friends, baseExpenses, currentUser.id]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-extrabold text-sw-charcoal sm:text-3xl">
          Dashboard
        </h1>
      </div>

      <SummaryBar
        net={summary.net}
        totalOwe={summary.totalOwe}
        totalOwed={summary.totalOwed}
        currency={base}
      />

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">
            You owe
          </h2>
          <div className="space-y-2">
            {owe.length === 0 ? (
              <EmptyColumn label="You don't owe anything" />
            ) : (
              owe.map((row) => {
                const u = state.users.find((x) => x.id === row.id)!;
                return (
                  <PersonRow
                    key={row.id}
                    name={u.name}
                    color={u.avatarColor}
                    amount={row.amount}
                    currency={base}
                    kind="owe"
                    onClick={() => setView({ type: "friend", id: u.id })}
                  />
                );
              })
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">
            You are owed
          </h2>
          <div className="space-y-2">
            {owed.length === 0 ? (
              <EmptyColumn label="No one owes you yet" />
            ) : (
              owed.map((row) => {
                const u = state.users.find((x) => x.id === row.id)!;
                return (
                  <PersonRow
                    key={row.id}
                    name={u.name}
                    color={u.avatarColor}
                    amount={row.amount}
                    currency={base}
                    kind="owed"
                    onClick={() => setView({ type: "friend", id: u.id })}
                  />
                );
              })
            )}
          </div>
        </section>
      </div>

      {owe.length === 0 && owed.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-14 text-center">
          <PartyPopper className="mb-3 h-10 w-10 text-primary" />
          <p className="text-lg font-bold text-sw-charcoal">
            You are all settled up!
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add an expense to start tracking who owes who.
          </p>
          <Button
            variant="green"
            className="mt-5"
            onClick={() => openModal({ kind: "addExpense" })}
          >
            Add an expense
          </Button>
        </div>
      ) : (
        <DashboardCharts />
      )}
    </div>
  );
}

function SummaryBar({
  net,
  totalOwe,
  totalOwed,
  currency,
}: {
  net: number;
  totalOwe: number;
  totalOwed: number;
  currency: string;
}) {
  const netOwed = net >= 0;
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:grid-cols-3">
      <div className="flex flex-col gap-1 border-b border-border p-5 sm:border-b-0 sm:border-r">
        <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          Total balance
        </span>
        <span
          className={cn(
            "text-2xl font-extrabold",
            Math.abs(net) < 0.01
              ? "text-sw-charcoal"
              : netOwed
                ? "text-owed"
                : "text-owe",
          )}
        >
          {netOwed ? "" : "-"}
          {formatMoney(Math.abs(net), currency)}
        </span>
        <span className="text-xs text-muted-foreground">
          {Math.abs(net) < 0.01
            ? "you are settled up"
            : netOwed
              ? "overall, you are owed"
              : "overall, you owe"}
        </span>
      </div>
      <div className="flex flex-col gap-1 border-b border-border p-5 sm:border-b-0 sm:border-r">
        <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          You owe
        </span>
        <span className="text-2xl font-extrabold text-owe">
          {formatMoney(totalOwe, currency)}
        </span>
        <span className="text-xs text-muted-foreground">across all friends</span>
      </div>
      <div className="flex flex-col gap-1 p-5">
        <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          You are owed
        </span>
        <span className="text-2xl font-extrabold text-owed">
          {formatMoney(totalOwed, currency)}
        </span>
        <span className="text-xs text-muted-foreground">across all friends</span>
      </div>
    </div>
  );
}

function PersonRow({
  name,
  color,
  amount,
  currency,
  kind,
  onClick,
}: {
  name: string;
  color: string;
  amount: number;
  currency: string;
  kind: "owe" | "owed";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <UserAvatar user={{ name, avatarColor: color }} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-sw-charcoal">{name}</p>
        <p
          className={cn(
            "text-xs font-medium",
            kind === "owe" ? "text-owe" : "text-owed",
          )}
        >
          {kind === "owe" ? "you owe" : "owes you"}
        </p>
      </div>
      <span
        className={cn(
          "text-lg font-extrabold",
          kind === "owe" ? "text-owe" : "text-owed",
        )}
      >
        {formatMoney(amount, currency)}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function EmptyColumn({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
