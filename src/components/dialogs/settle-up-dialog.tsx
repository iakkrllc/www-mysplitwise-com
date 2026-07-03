"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useStore } from "@/lib/store";
import { useUI, type Modal } from "@/lib/ui-store";
import { balanceBetween, formatMoney, round2 } from "@/lib/calculations";
import { getCurrency } from "@/lib/currency";
import type { Expense } from "@/lib/types";
import { UserAvatar } from "../user-avatar";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function SettleUpDialog() {
  const { modal, closeModal } = useUI();
  const open = modal.kind === "settle";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-md">
        {open && <SettleForm modal={modal} onDone={closeModal} />}
      </DialogContent>
    </Dialog>
  );
}

function SettleForm({
  modal,
  onDone,
}: {
  modal: Extract<Modal, { kind: "settle" }>;
  onDone: () => void;
}) {
  const { state, currentUser, getUser, addExpense, baseExpenses } = useStore();
  const base = state.baseCurrency;

  const groupId = modal.groupId ?? null;

  const relevantExpenses = useMemo(
    () =>
      groupId
        ? baseExpenses.filter((e) => e.groupId === groupId)
        : baseExpenses,
    [baseExpenses, groupId],
  );

  const candidates = useMemo(() => {
    if (groupId) {
      const g = state.groups.find((x) => x.id === groupId);
      return (g?.memberIds ?? []).map((id) => getUser(id)!).filter(Boolean);
    }
    return state.users;
  }, [groupId, state.groups, state.users, getUser]);

  const suggest = (from: string, to: string) => {
    const bal = balanceBetween(from, to, relevantExpenses);
    // bal positive => to owes from; we want amount `from` pays `to`,
    // which makes sense when from owes to (bal negative).
    return bal < 0 ? round2(-bal) : 0;
  };

  const defaultTo = useMemo(() => {
    if (modal.toId) return modal.toId;
    // pick the friend the current user owes the most
    let best = "";
    let bestAmt = 0;
    for (const u of candidates) {
      if (u.id === currentUser.id) continue;
      const owe = -balanceBetween(currentUser.id, u.id, relevantExpenses);
      if (owe > bestAmt) {
        bestAmt = owe;
        best = u.id;
      }
    }
    if (best) return best;
    const other = candidates.find((u) => u.id !== currentUser.id);
    return other?.id ?? currentUser.id;
  }, [modal.toId, candidates, currentUser.id, relevantExpenses]);

  const [fromId, setFromId] = useState(modal.fromId ?? currentUser.id);
  const [toId, setToId] = useState(defaultTo);
  const [amount, setAmount] = useState(
    String(suggest(modal.fromId ?? currentUser.id, defaultTo) || ""),
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const amountNum = Number.parseFloat(amount) || 0;
  const from = getUser(fromId);
  const to = getUser(toId);
  const canSave = fromId !== toId && amountNum > 0 && from && to;

  const onFrom = (id: string) => {
    let newTo = toId;
    if (id === toId) {
      const other = candidates.find((u) => u.id !== id);
      if (other) newTo = other.id;
    }
    setFromId(id);
    setToId(newTo);
    setAmount(String(suggest(id, newTo) || ""));
  };
  const onTo = (id: string) => {
    setToId(id);
    setAmount(String(suggest(fromId, id) || ""));
  };

  const save = () => {
    if (!canSave) {
      toast.error("Choose two different people and an amount");
      return;
    }
    const expense: Omit<Expense, "id" | "createdAt"> = {
      description: "Payment",
      amount: round2(amountNum),
      currency: base,
      category: "payment",
      date,
      groupId,
      shares: [
        { userId: fromId, paid: round2(amountNum), owed: 0 },
        { userId: toId, paid: 0, owed: round2(amountNum) },
      ],
      createdBy: currentUser.id,
      isSettlement: true,
    };
    addExpense(expense);
    toast.success("Payment recorded");
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Settle up</DialogTitle>
      </DialogHeader>

      <div className="space-y-5 py-2">
        <div className="flex items-center justify-center gap-3">
          {from && <UserAvatar user={from} size={52} />}
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          {to && <UserAvatar user={to} size={52} />}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Payer</Label>
            <Select value={fromId} onValueChange={onFrom}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.id === currentUser.id ? "You" : u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="pb-2.5 text-xs font-bold text-muted-foreground">
            pays
          </span>
          <div className="space-y-1.5">
            <Label className="text-xs">Recipient</Label>
            <Select value={toId} onValueChange={onTo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.id === currentUser.id ? "You" : u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settle-amt">Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              {getCurrency(base).symbol}
            </span>
            <Input
              id="settle-amt"
              inputMode="decimal"
              className="pl-8 text-lg font-bold"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder="0.00"
            />
          </div>
          {(() => {
            const bal = balanceBetween(fromId, toId, relevantExpenses);
            if (bal < -0.01)
              return (
                <p className="text-xs text-muted-foreground">
                  {from?.id === currentUser.id ? "You owe" : from?.name.split(" ")[0] + " owes"}{" "}
                  {to?.id === currentUser.id ? "you" : to?.name.split(" ")[0]}{" "}
                  <span className="font-semibold text-owe">
                    {formatMoney(-bal, base)}
                  </span>
                </p>
              );
            return (
              <p className="text-xs text-muted-foreground">
                No outstanding balance in this direction.
              </p>
            );
          })()}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settle-date">Date</Label>
          <Input
            id="settle-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="green" onClick={save} disabled={!canSave}>
          Record payment
        </Button>
      </DialogFooter>
    </>
  );
}
