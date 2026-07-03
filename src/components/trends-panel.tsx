"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatMoney, round2 } from "@/lib/calculations";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { TrendingUp, CalendarClock, ArrowRight } from "lucide-react";

type Range = "month" | "ytd";

function startOfMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function startOfYearISO(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export function TrendsPanel() {
  const { baseExpenses, currentUser, state, setView } = useStore();
  const base = state.baseCurrency;
  const [range, setRange] = useState<Range>("month");

  const since = range === "month" ? startOfMonthISO() : startOfYearISO();
  const today = todayISO();

  const periodExpenses = useMemo(
    () => baseExpenses.filter((e) => e.date >= since && e.date <= today),
    [baseExpenses, since, today],
  );

  const stats = useMemo(() => {
    let paidFor = 0;
    let yourShare = 0;
    let paymentsMade = 0;
    let paymentsReceived = 0;
    let netChange = 0;
    for (const e of periodExpenses) {
      const my = e.shares.find((s) => s.userId === currentUser.id);
      if (!my) continue;
      netChange += my.paid - my.owed;
      if (e.isSettlement) {
        if (my.paid > 0.001) paymentsMade += my.paid;
        if (my.owed > 0.001) paymentsReceived += my.owed;
      } else {
        paidFor += my.paid;
        yourShare += my.owed;
      }
    }
    return {
      paidFor: round2(paidFor),
      yourShare: round2(yourShare),
      paymentsMade: round2(paymentsMade),
      paymentsReceived: round2(paymentsReceived),
      netChange: round2(netChange),
    };
  }, [periodExpenses, currentUser.id]);

  const upcoming = useMemo(
    () =>
      [...state.recurring]
        .filter((r) => r.active)
        .sort((a, b) => a.nextDue.localeCompare(b.nextDue))
        .slice(0, 4),
    [state.recurring],
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-sw-charcoal">
          <TrendingUp className="h-4 w-4 text-primary" /> Trends
        </h2>
        <div className="flex rounded-lg border border-border bg-muted/30 p-1">
          {(["month", "ytd"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-bold transition-colors",
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r === "month" ? "This month" : "Year to date"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
        <Stat label="Total you paid for" value={formatMoney(stats.paidFor, base)} />
        <Stat label="Your total share" value={formatMoney(stats.yourShare, base)} />
        <Stat label="Payments made" value={formatMoney(stats.paymentsMade, base)} />
        <Stat
          label="Payments received"
          value={formatMoney(stats.paymentsReceived, base)}
        />
        <Stat
          label="Total change in balance"
          value={`${stats.netChange >= 0 ? "+" : "-"}${formatMoney(Math.abs(stats.netChange), base)}`}
          tone={stats.netChange >= 0 ? "owed" : "owe"}
        />
      </div>

      {upcoming.length > 0 && (
        <>
          <div className="my-5 h-px bg-border" />
          <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" /> Upcoming recurring
          </h3>
          <div className="space-y-2">
            {upcoming.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-2 py-1 text-sm"
              >
                <span className="text-sw-charcoal">{r.description}</span>
                <span className="text-muted-foreground">
                  {formatMoney(r.amount, r.currency)} ·{" "}
                  {new Date(`${r.nextDue}T00:00:00`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setView({ type: "recurring" })}
            className="mt-2 flex items-center gap-1 px-2 text-xs font-bold text-primary hover:underline"
          >
            Manage recurring <ArrowRight className="h-3 w-3" />
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => setView({ type: "dashboard" })}
        className="mt-5 flex items-center gap-1 text-sm font-bold text-primary hover:underline"
      >
        View full charts <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "owed" | "owe";
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-extrabold",
          tone === "owed" ? "text-owed" : tone === "owe" ? "text-owe" : "text-sw-charcoal",
        )}
      >
        {value}
      </p>
    </div>
  );
}
