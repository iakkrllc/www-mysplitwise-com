"use client";

import { useCallback, useMemo } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { balanceBetween, formatMoney } from "@/lib/calculations";
import { UserAvatar } from "../user-avatar";
import { Button } from "../ui/button";
import { ExpenseList } from "../expense-list";
import { FriendInsights } from "../charts/friend-insights";
import { PayMenu } from "../pay-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Plus, Scale, MoreVertical, UserMinus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function FriendView({ friendId }: { friendId: string }) {
  const { state, currentUser, getUser, baseExpenses, removeFriend, setView } =
    useStore();
  const { openModal } = useUI();
  const friend = getUser(friendId);
  const base = state.baseCurrency;

  const involves = useCallback(
    (e: { shares: { userId: string }[] }) =>
      e.shares.some((s) => s.userId === currentUser.id) &&
      e.shares.some((s) => s.userId === friendId),
    [currentUser.id, friendId],
  );

  const expenses = useMemo(
    () => state.expenses.filter(involves),
    [state.expenses, involves],
  );

  const balance = useMemo(
    () => balanceBetween(currentUser.id, friendId, baseExpenses.filter(involves)),
    [currentUser.id, friendId, baseExpenses, involves],
  );

  if (!friend) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        This friend no longer exists.
      </div>
    );
  }

  const settled = Math.abs(balance) < 0.01;
  const owed = balance > 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar user={friend} size={64} />
          <div>
            <h1 className="text-2xl font-extrabold text-sw-charcoal">
              {friend.name}
            </h1>
            <p className="text-sm text-muted-foreground">{friend.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => openModal({ kind: "paymentInfo", userId: friendId })}
            className="gap-1.5 text-muted-foreground"
          >
            Payment info
          </Button>
          <Button
            variant="orange"
            onClick={() =>
              openModal({
                kind: "settle",
                groupId: null,
                // if you owe them, you pay; if they owe you, they pay
                fromId: balance < 0 ? currentUser.id : friendId,
                toId: balance < 0 ? friendId : currentUser.id,
              })
            }
            className="gap-1.5"
          >
            <Scale className="h-4 w-4" /> Settle up
          </Button>
          <Button
            variant="green"
            onClick={() => openModal({ kind: "addExpense", friendId })}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add expense
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Friend options">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (!settled) {
                    toast.error(
                      `Settle up with ${friend.name.split(" ")[0]} before removing them`,
                    );
                    return;
                  }
                  if (
                    !window.confirm(
                      `Remove ${friend.name} from your friends? This can't be undone.`,
                    )
                  )
                    return;
                  removeFriend(friendId);
                  toast.success(`${friend.name} removed`);
                  setView({ type: "friends" });
                }}
              >
                <UserMinus className="mr-2 h-4 w-4" /> Remove friend
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Balance banner */}
      <div
        className={cn(
          "mt-5 flex items-center justify-between gap-3 rounded-xl border px-5 py-4 text-[15px] font-semibold",
          settled
            ? "border-border bg-muted/40 text-sw-charcoal"
            : owed
              ? "border-[hsl(var(--sw-green))]/30 bg-secondary text-owed"
              : "border-[hsl(var(--sw-orange))]/25 bg-[hsl(var(--sw-orange))]/8 text-owe",
        )}
      >
        <span>
          {settled ? (
            <>You are all settled up with {friend.name.split(" ")[0]}.</>
          ) : owed ? (
            <>
              {friend.name.split(" ")[0]} owes you{" "}
              <span className="font-extrabold">{formatMoney(balance, base)}</span>
            </>
          ) : (
            <>
              You owe {friend.name.split(" ")[0]}{" "}
              <span className="font-extrabold">{formatMoney(-balance, base)}</span>
            </>
          )}
        </span>
        {!settled && !owed && (
          <PayMenu
            payee={friend}
            amount={-balance}
            note={`Settling up via mysplitwise`}
          />
        )}
        {!settled && owed && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => openModal({ kind: "reminderDraft", friendId })}
          >
            <Sparkles className="h-3.5 w-3.5" /> Remind
          </Button>
        )}
      </div>

      <FriendInsights friendId={friendId} />

      <div className="mt-8">
        <ExpenseList expenses={expenses} />
      </div>
    </div>
  );
}
