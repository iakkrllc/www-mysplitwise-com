"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { CategoryIcon } from "../category-icon";
import { formatMoney } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { ArrowRightLeft } from "lucide-react";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86400000;
  if (diff < 0) return "just now";
  if (diff < 3600000) {
    const m = Math.max(1, Math.floor(diff / 60000));
    return `${m}m ago`;
  }
  if (diff < day) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ActivityView() {
  const { state, currentUser, getUser, getGroup } = useStore();
  const { openModal } = useUI();

  const items = useMemo(
    () =>
      [...state.expenses].sort(
        (a, b) =>
          +new Date(b.createdAt || b.date) - +new Date(a.createdAt || a.date),
      ),
    [state.expenses],
  );

  const nameOf = (id: string) =>
    id === currentUser.id ? "You" : getUser(id)?.name.split(" ")[0] ?? "Someone";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-sw-charcoal sm:text-3xl">
        Recent activity
      </h1>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      )}

      <div className="space-y-1">
        {items.map((e) => {
          const myShare = e.shares.find((s) => s.userId === currentUser.id);
          const net = myShare ? myShare.paid - myShare.owed : 0;
          const group = e.groupId ? getGroup(e.groupId) : null;

          let impact: React.ReactNode = null;
          if (e.isSettlement) {
            const from = e.shares.find((s) => s.paid > 0.001);
            const to = e.shares.find((s) => s.owed > 0.001);
            if (myShare) {
              impact =
                from?.userId === currentUser.id ? (
                  <span className="text-muted-foreground">
                    You paid {formatMoney(e.amount, e.currency)}
                  </span>
                ) : (
                  <span className="text-owed">
                    You received {formatMoney(e.amount, e.currency)}
                  </span>
                );
            }
            void to;
          } else if (myShare) {
            if (net > 0.01)
              impact = (
                <span className="text-owed">
                  You get back {formatMoney(net, e.currency)}
                </span>
              );
            else if (net < -0.01)
              impact = (
                <span className="text-owe">
                  You owe {formatMoney(-net, e.currency)}
                </span>
              );
            else impact = <span className="text-muted-foreground">No change for you</span>;
          } else {
            impact = (
              <span className="text-muted-foreground">You are not involved</span>
            );
          }

          const actor = nameOf(e.createdBy);

          return (
            <button
              key={e.id}
              type="button"
              onClick={() => openModal({ kind: "expenseDetail", id: e.id })}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/60"
            >
              {e.isSettlement ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
              ) : (
                <CategoryIcon categoryId={e.category} size={40} />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-snug text-sw-charcoal">
                  {e.isSettlement ? (
                    <>
                      <span className="font-bold">
                        {nameOf(
                          e.shares.find((s) => s.paid > 0.001)?.userId ?? "",
                        )}
                      </span>{" "}
                      paid{" "}
                      <span className="font-bold">
                        {nameOf(
                          e.shares.find((s) => s.owed > 0.001)?.userId ?? "",
                        ).toLowerCase() === "you"
                          ? "you"
                          : nameOf(
                              e.shares.find((s) => s.owed > 0.001)?.userId ?? "",
                            )}
                      </span>{" "}
                      <span className="font-bold">
                        {formatMoney(e.amount, e.currency)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold">{actor}</span> added{" "}
                      <span className="font-semibold">&ldquo;{e.description}&rdquo;</span>
                      {group && (
                        <>
                          {" "}
                          in{" "}
                          <span className="font-semibold">{group.name}</span>
                        </>
                      )}
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-[12px] font-medium">{impact}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap pt-0.5 text-[11px] text-muted-foreground">
                {timeAgo(e.createdAt || e.date)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
