"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { CategoryIcon } from "../category-icon";
import { getCategory } from "@/lib/categories";
import { formatMoney } from "@/lib/calculations";
import { convert } from "@/lib/currency";
import { UserAvatar } from "../user-avatar";
import {
  Pencil,
  Trash2,
  ArrowRightLeft,
  CalendarDays,
  Users,
  Repeat,
  SendHorizontal,
} from "lucide-react";
import { toast } from "sonner";

function shortTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ExpenseDetailDialog() {
  const { modal, closeModal, openModal } = useUI();
  const { state, currentUser, getUser, getGroup, deleteExpense, addComment } =
    useStore();
  const [comment, setComment] = useState("");

  const open = modal.kind === "expenseDetail";
  const expense =
    modal.kind === "expenseDetail"
      ? state.expenses.find((e) => e.id === modal.id)
      : undefined;

  const nameOf = (id: string) =>
    id === currentUser.id ? "You" : getUser(id)?.name ?? "Someone";

  const base = state.baseCurrency;
  const recurring = expense?.recurringId
    ? state.recurring.find((r) => r.id === expense.recurringId)
    : undefined;

  const submitComment = () => {
    if (!expense || !comment.trim()) return;
    addComment(expense.id, comment);
    setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {expense && (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Expense details</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-4 pb-2">
              {expense.isSettlement ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-primary">
                  <ArrowRightLeft className="h-6 w-6" />
                </div>
              ) : (
                <CategoryIcon categoryId={expense.category} size={56} />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-extrabold text-sw-charcoal">
                  {expense.isSettlement ? "Payment" : expense.description}
                </h2>
                <p className="text-2xl font-black text-sw-charcoal">
                  {formatMoney(expense.amount, expense.currency)}
                </p>
                {expense.currency !== base && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatMoney(convert(expense.amount, expense.currency, base), base)}{" "}
                    {base}
                  </p>
                )}
              </div>
            </div>

            {recurring && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-primary">
                <Repeat className="h-3.5 w-3.5" />
                Auto-added from a {recurring.frequency} recurring expense
              </div>
            )}

            <div className="space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {new Date(`${expense.date}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              {expense.groupId && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {getGroup(expense.groupId)?.name ?? "Group"}
                </div>
              )}
              {!expense.isSettlement && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Category: {getCategory(expense.category).name}</span>
                </div>
              )}
            </div>

            {/* Breakdown */}
            <div className="mt-4 space-y-3">
              {expense.isSettlement ? (
                <p className="text-[15px] text-sw-charcoal">
                  <span className="font-bold">
                    {nameOf(expense.shares.find((s) => s.paid > 0.001)?.userId ?? "")}
                  </span>{" "}
                  paid{" "}
                  <span className="font-bold">
                    {nameOf(
                      expense.shares.find((s) => s.owed > 0.001)?.userId ?? "",
                    ).toLowerCase() === "you"
                      ? "you"
                      : nameOf(expense.shares.find((s) => s.owed > 0.001)?.userId ?? "")}
                  </span>{" "}
                  <span className="font-bold">
                    {formatMoney(expense.amount, expense.currency)}
                  </span>
                </p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-sw-charcoal">
                    {(() => {
                      const payers = expense.shares.filter((s) => s.paid > 0.001);
                      if (payers.length === 1) {
                        return `${nameOf(payers[0].userId)} paid ${formatMoney(
                          payers[0].paid,
                          expense.currency,
                        )}`;
                      }
                      return "Multiple people paid";
                    })()}
                  </p>
                  <div className="space-y-1.5">
                    {expense.shares
                      .filter((s) => s.owed > 0.001)
                      .map((s) => {
                        const u = getUser(s.userId);
                        if (!u) return null;
                        return (
                          <div key={s.userId} className="flex items-center gap-2.5">
                            <UserAvatar user={u} size={26} />
                            <span className="flex-1 text-sm">
                              {s.userId === currentUser.id
                                ? "You owe"
                                : `${u.name.split(" ")[0]} owes`}
                            </span>
                            <span className="text-sm font-bold text-sw-charcoal">
                              {formatMoney(s.owed, expense.currency)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>

            {/* Itemized breakdown */}
            {expense.items && expense.items.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-card p-3">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Items
                </span>
                <div className="space-y-1 text-sm">
                  {expense.items.map((it) => (
                    <div key={it.id} className="flex justify-between">
                      <span className="text-sw-charcoal">
                        {it.name || "Item"}
                      </span>
                      <span className="font-semibold text-sw-charcoal">
                        {formatMoney(it.amount, expense.currency)}
                      </span>
                    </div>
                  ))}
                  {!!expense.tax && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax</span>
                      <span>{formatMoney(expense.tax, expense.currency)}</span>
                    </div>
                  )}
                  {!!expense.tip && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tip</span>
                      <span>{formatMoney(expense.tip, expense.currency)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {expense.notes && (
              <div className="mt-4 rounded-xl border border-border bg-card p-3 text-sm text-sw-charcoal">
                <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Notes
                </span>
                {expense.notes}
              </div>
            )}

            {/* Receipt */}
            {expense.receiptUrl && (
              <div className="mt-4">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Receipt
                </span>
                <a href={expense.receiptUrl} target="_blank" rel="noreferrer">
                  <img
                    src={expense.receiptUrl}
                    alt="Receipt"
                    className="max-h-64 w-full rounded-xl border border-border object-contain bg-muted/30"
                  />
                </a>
              </div>
            )}

            {/* Comments */}
            <div className="mt-5">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Comments
              </span>
              <div className="space-y-3">
                {(expense.comments ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No comments yet. Start the conversation.
                  </p>
                )}
                {(expense.comments ?? []).map((c) => {
                  const u = getUser(c.userId);
                  return (
                    <div key={c.id} className="flex items-start gap-2.5">
                      {u && <UserAvatar user={u} size={28} />}
                      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-muted/60 px-3 py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-bold text-sw-charcoal">
                            {c.userId === currentUser.id
                              ? "You"
                              : u?.name.split(" ")[0] ?? "Someone"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {shortTime(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-sw-charcoal">{c.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <UserAvatar user={currentUser} size={28} />
                <Input
                  placeholder="Add a comment…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                  className="h-9"
                />
                <Button
                  size="icon"
                  variant="green"
                  className="h-9 w-9 shrink-0"
                  onClick={submitComment}
                  disabled={!comment.trim()}
                >
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <DialogFooter className="mt-5 sm:justify-between">
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  deleteExpense(expense.id);
                  toast.success("Expense deleted");
                  closeModal();
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
              {!expense.isSettlement && (
                <Button
                  variant="green"
                  onClick={() => openModal({ kind: "addExpense", editId: expense.id })}
                >
                  <Pencil className="mr-1.5 h-4 w-4" /> Edit
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
