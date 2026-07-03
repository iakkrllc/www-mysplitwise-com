"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { balanceBetween, formatMoney } from "@/lib/calculations";
import { UserAvatar } from "../user-avatar";
import { PayMenu } from "../pay-menu";
import { PartyPopper, HandCoins } from "lucide-react";

export function PayView() {
  const { state, currentUser, setView, baseExpenses } = useStore();
  const base = state.baseCurrency;

  const friends = useMemo(
    () => state.users.filter((u) => u.id !== currentUser.id),
    [state.users, currentUser.id],
  );

  const { owe, owed } = useMemo(() => {
    const owe: { id: string; amount: number }[] = [];
    const owed: { id: string; amount: number }[] = [];
    for (const f of friends) {
      const bal = balanceBetween(currentUser.id, f.id, baseExpenses);
      if (bal > 0.01) owed.push({ id: f.id, amount: bal });
      else if (bal < -0.01) owe.push({ id: f.id, amount: -bal });
    }
    owe.sort((a, b) => b.amount - a.amount);
    owed.sort((a, b) => b.amount - a.amount);
    return { owe, owed };
  }, [friends, baseExpenses, currentUser.id]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-1 text-2xl font-extrabold text-sw-charcoal sm:text-3xl">
        Pay
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Settle up with friends via Venmo, PayPal, or Cash App.
      </p>

      <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">
        You owe
      </h2>
      {owe.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          <PartyPopper className="h-6 w-6 text-primary" />
          You don&apos;t owe anyone — nothing to pay right now.
        </div>
      ) : (
        <div className="space-y-2">
          {owe.map((row) => {
            const u = state.users.find((x) => x.id === row.id)!;
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => setView({ type: "friend", id: u.id })}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <UserAvatar user={u} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sw-charcoal">
                      {u.name}
                    </p>
                    <p className="text-xs font-medium text-owe">you owe</p>
                  </div>
                  <span className="text-lg font-extrabold text-owe">
                    {formatMoney(row.amount, base)}
                  </span>
                </button>
                <PayMenu
                  payee={u}
                  amount={row.amount}
                  note="Settling up via mysplitwise"
                />
              </div>
            );
          })}
        </div>
      )}

      {owed.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">
            You are owed
          </h2>
          <div className="space-y-2">
            {owed.map((row) => {
              const u = state.users.find((x) => x.id === row.id)!;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setView({ type: "friend", id: u.id })}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <UserAvatar user={u} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sw-charcoal">
                      {u.name}
                    </p>
                    <p className="flex items-center gap-1 text-xs font-medium text-owed">
                      <HandCoins className="h-3 w-3" /> owes you
                    </p>
                  </div>
                  <span className="text-lg font-extrabold text-owed">
                    {formatMoney(row.amount, base)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
