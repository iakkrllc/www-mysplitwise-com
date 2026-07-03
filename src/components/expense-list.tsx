"use client";

import { useMemo } from "react";
import type { Expense } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { CategoryIcon } from "./category-icon";
import { formatMoney } from "@/lib/calculations";
import { parseLocalDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ArrowRightLeft } from "lucide-react";

function monthKey(date: string) {
  const d = parseLocalDate(date);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function payerLabel(e: Expense, currentUserId: string, nameOf: (id: string) => string) {
  const payers = e.shares.filter((s) => s.paid > 0.001);
  if (payers.length === 0) return "no payer";
  if (payers.length === 1) {
    const p = payers[0];
    const who = p.userId === currentUserId ? "You" : nameOf(p.userId).split(" ")[0];
    return `${who} paid ${formatMoney(p.paid, e.currency)}`;
  }
  return `${payers.length} people paid ${formatMoney(e.amount, e.currency)}`;
}

export function ExpenseRow({ e }: { e: Expense }) {
  const { currentUser, getUser } = useStore();
  const { openModal } = useUI();
  const nameOf = (id: string) => getUser(id)?.name ?? "Someone";

  const d = parseLocalDate(e.date);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();

  if (e.isSettlement) {
    const from = e.shares.find((s) => s.paid > 0.001);
    const to = e.shares.find((s) => s.owed > 0.001);
    const fromName =
      from?.userId === currentUser.id ? "You" : nameOf(from?.userId ?? "").split(" ")[0];
    const toName =
      to?.userId === currentUser.id ? "you" : nameOf(to?.userId ?? "").split(" ")[0];
    return (
      <button
        type="button"
        onClick={() => openModal({ kind: "expenseDetail", id: e.id })}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/60"
      >
        <div className="flex w-9 shrink-0 flex-col items-center">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">
            {month}
          </span>
          <span className="text-sm font-bold text-sw-charcoal">{day}</span>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <ArrowRightLeft className="h-4 w-4" />
        </div>
        <p className="flex-1 text-[14px] font-medium text-sw-charcoal">
          <span className="font-semibold">{fromName}</span> paid{" "}
          <span className="font-semibold">{toName}</span>{" "}
          <span className="font-bold">{formatMoney(e.amount, e.currency)}</span>
        </p>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
          payment
        </span>
      </button>
    );
  }

  const myShare = e.shares.find((s) => s.userId === currentUser.id);
  const net = myShare ? myShare.paid - myShare.owed : 0;
  const involved = !!myShare;

  let rightTop = "";
  let rightBottom = "";
  let rightClass = "text-muted-foreground";
  if (!involved) {
    rightTop = "not involved";
  } else if (net > 0.01) {
    rightTop = "you lent";
    rightBottom = formatMoney(net, e.currency);
    rightClass = "text-owed";
  } else if (net < -0.01) {
    rightTop = "you borrowed";
    rightBottom = formatMoney(-net, e.currency);
    rightClass = "text-owe";
  } else {
    rightTop = "settled";
  }

  return (
    <button
      type="button"
      onClick={() => openModal({ kind: "expenseDetail", id: e.id })}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/60"
    >
      <div className="flex w-9 shrink-0 flex-col items-center">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">
          {month}
        </span>
        <span className="text-sm font-bold text-sw-charcoal">{day}</span>
      </div>
      <CategoryIcon categoryId={e.category} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-sw-charcoal">
          {e.description}
        </p>
        <p className="truncate text-[12px] text-muted-foreground">
          {payerLabel(e, currentUser.id, nameOf)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end leading-tight">
        <span className={cn("text-[11px]", rightClass)}>{rightTop}</span>
        {rightBottom && (
          <span className={cn("text-[15px] font-extrabold", rightClass)}>
            {rightBottom}
          </span>
        )}
      </div>
    </button>
  );
}

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const grouped = useMemo(() => {
    const sorted = [...expenses].sort(
      (a, b) => +new Date(b.date) - +new Date(a.date),
    );
    const map = new Map<string, Expense[]>();
    for (const e of sorted) {
      const k = monthKey(e.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries());
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        No expenses yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([month, items]) => (
        <div key={month}>
          <h3 className="mb-1 px-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
            {month}
          </h3>
          <div className="divide-y divide-border/60">
            {items.map((e) => (
              <ExpenseRow key={e.id} e={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
