"use client";

import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { CategoryIcon } from "../category-icon";
import { formatMoney } from "@/lib/calculations";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Repeat, Trash2, Plus, CalendarClock, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Frequency } from "@/lib/types";

const FREQ_LABEL: Record<Frequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export function RecurringView() {
  const {
    state,
    getGroup,
    getUser,
    updateRecurring,
    deleteRecurring,
    logRecurringNow,
  } = useStore();
  const { openModal } = useUI();

  const recurring = [...state.recurring].sort((a, b) =>
    a.nextDue.localeCompare(b.nextDue),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-sw-charcoal sm:text-3xl">
            Recurring expenses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rent, subscriptions and bills — added automatically on schedule.
          </p>
        </div>
        <Button variant="green" onClick={() => openModal({ kind: "addExpense" })}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {recurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <Repeat className="mb-3 h-10 w-10 text-primary" />
          <p className="text-lg font-bold text-sw-charcoal">
            No recurring expenses yet
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            When adding an expense, pick a repeat schedule (weekly, monthly or
            yearly) and it will show up here.
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
        <div className="space-y-3">
          {recurring.map((r) => {
            const group = r.groupId ? getGroup(r.groupId) : null;
            const payer = getUser(r.payerId);
            const nextDue = new Date(`${r.nextDue}T00:00:00`).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" },
            );
            return (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
              >
                <CategoryIcon categoryId={r.category} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-bold text-sw-charcoal">
                      {r.description}
                    </p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      {FREQ_LABEL[r.frequency]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(r.amount, r.currency)}
                    {group ? ` · ${group.name}` : " · Non-group"}
                    {payer
                      ? ` · paid by ${
                          payer.id === state.currentUserId
                            ? "you"
                            : payer.name.split(" ")[0]
                        }`
                      : ""}
                  </p>
                  <p
                    className={`mt-0.5 flex items-center gap-1 text-xs ${
                      r.active ? "text-muted-foreground" : "text-muted-foreground/60"
                    }`}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {r.active ? `Next on ${nextDue}` : "Paused"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      logRecurringNow(r.id);
                      toast.success(`"${r.description}" added`);
                    }}
                  >
                    <Zap className="h-3.5 w-3.5" /> Log now
                  </Button>
                  <div className="flex items-center gap-1.5 px-1">
                    <Switch
                      checked={r.active}
                      onCheckedChange={(v) =>
                        updateRecurring(r.id, { active: v })
                      }
                      aria-label="Toggle active"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      deleteRecurring(r.id);
                      toast.success("Recurring expense removed");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
