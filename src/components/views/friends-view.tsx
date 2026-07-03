"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { balanceBetween, formatMoney, summaryForUser } from "@/lib/calculations";
import { UserAvatar } from "../user-avatar";
import { Button } from "../ui/button";
import { InviteFriend } from "../invite-friend";
import { cn } from "@/lib/utils";
import { ArrowRight, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

export function FriendsView() {
  const { state, currentUser, baseExpenses, setView } = useStore();
  const { openModal } = useUI();
  const base = state.baseCurrency;

  const friends = useMemo(
    () => state.users.filter((u) => u.id !== currentUser.id),
    [state.users, currentUser.id],
  );

  const rows = useMemo(
    () =>
      friends
        .map((f) => ({
          user: f,
          balance: balanceBetween(currentUser.id, f.id, baseExpenses),
        }))
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
    [friends, baseExpenses, currentUser.id],
  );

  const summary = useMemo(
    () =>
      summaryForUser(
        currentUser.id,
        friends.map((f) => f.id),
        baseExpenses,
      ),
    [friends, baseExpenses, currentUser.id],
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-sw-charcoal sm:text-3xl">
            Friends
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {friends.length} friend{friends.length === 1 ? "" : "s"} · you are
            owed{" "}
            <span className="font-semibold text-owed">
              {formatMoney(summary.totalOwed, base)}
            </span>
            , you owe{" "}
            <span className="font-semibold text-owe">
              {formatMoney(summary.totalOwe, base)}
            </span>
          </p>
        </div>
        <Button variant="green" onClick={() => openModal({ kind: "addFriend" })}>
          <UserPlus className="h-4 w-4" /> Add
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-dashed border-primary/40 bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-sw-charcoal">
            Invite a friend to mysplitwise
          </p>
          <p className="text-xs text-muted-foreground">
            Share your invite link — they don&apos;t need an account to see it.
          </p>
        </div>
        <InviteFriend />
      </div>

      {friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-primary" />
          <p className="text-lg font-bold text-sw-charcoal">No friends yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add a friend to start splitting expenses together.
          </p>
          <Button
            variant="green"
            className="mt-5"
            onClick={() => openModal({ kind: "addFriend" })}
          >
            Add a friend
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ user, balance }) => {
            const settled = Math.abs(balance) < 0.01;
            const owed = balance > 0;
            return (
              <div
                key={user.id}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setView({ type: "friend", id: user.id })}
                  className="flex items-center gap-3 text-left"
                >
                  <UserAvatar user={user} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-sw-charcoal">
                      {user.name}
                    </p>
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        settled
                          ? "text-muted-foreground"
                          : owed
                            ? "text-owed"
                            : "text-owe",
                      )}
                    >
                      {settled
                        ? "settled up"
                        : owed
                          ? `owes you ${formatMoney(balance, base)}`
                          : `you owe ${formatMoney(-balance, base)}`}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
                {!settled && (
                  <div className="flex gap-2">
                    {owed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          toast.success(
                            `Reminder sent to ${user.name.split(" ")[0]}`,
                          )
                        }
                      >
                        Remind
                      </Button>
                    ) : (
                      <Button
                        variant="orange"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          openModal({
                            kind: "settle",
                            groupId: null,
                            fromId: currentUser.id,
                            toId: user.id,
                          })
                        }
                      >
                        Settle up
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        openModal({ kind: "addExpense", friendId: user.id })
                      }
                    >
                      Add expense
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
