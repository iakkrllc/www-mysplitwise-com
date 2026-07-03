"use client";

import { useMemo, useRef, useState } from "react";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { advanceDate, uid, useStore } from "@/lib/store";
import { useUI, type Modal } from "@/lib/ui-store";
import { CATEGORIES } from "@/lib/categories";
import { CURRENCIES, getCurrency } from "@/lib/currency";
import { round2, formatMoney } from "@/lib/calculations";
import { todayISO } from "@/lib/dates";
import { splitEqual, splitByPercent, splitByShares } from "@/lib/split";
import { compressImage } from "@/lib/image";
import { callAiApi } from "@/lib/call-ai-api";
import type {
  ExpenseShare,
  Frequency,
  LineItem,
  PaymentMethod,
  SplitMethod,
} from "@/lib/types";
import { UserAvatar } from "../user-avatar";
import { cn } from "@/lib/utils";
import {
  X,
  UserPlus,
  Check,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  ListPlus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface ScannedReceipt {
  merchant: string;
  date: string | null;
  category: string;
  tax: number;
  tip: number;
  total: number;
  items: { name: string; amount: number }[];
}

const METHODS: { id: SplitMethod; label: string; title: string }[] = [
  { id: "equal", label: "=", title: "Split equally" },
  { id: "exact", label: "1.23", title: "Exact amounts" },
  { id: "percentage", label: "%", title: "By percentage" },
  { id: "shares", label: "shares", title: "By shares" },
];

const REPEAT_OPTIONS: { id: Frequency | "none"; label: string }[] = [
  { id: "none", label: "Does not repeat" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export function AddExpenseDialog() {
  const { modal, closeModal } = useUI();
  const open = modal.kind === "addExpense";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        {open && <AddExpenseForm modal={modal} onDone={closeModal} />}
      </DialogContent>
    </Dialog>
  );
}

function AddExpenseForm({
  modal,
  onDone,
}: {
  modal: Extract<Modal, { kind: "addExpense" }>;
  onDone: () => void;
}) {
  const {
    state,
    currentUser,
    getGroup,
    addExpense,
    updateExpense,
    addRecurring,
    getUser,
  } = useStore();
  const { openModal } = useUI();

  const editing = modal.editId
    ? state.expenses.find((e) => e.id === modal.editId)
    : undefined;
  const pre = !editing ? modal.aiPrefill : undefined;

  const [description, setDescription] = useState(
    editing?.description ?? pre?.description ?? "",
  );
  const [amount, setAmount] = useState(
    editing ? String(editing.amount) : pre?.amount ? String(pre.amount) : "",
  );
  const [currency, setCurrency] = useState(
    editing?.currency ?? state.baseCurrency,
  );
  const [category, setCategory] = useState(
    editing?.category ?? pre?.category ?? "general",
  );
  const [categorySuggested, setCategorySuggested] = useState(!!pre?.category);
  const [date, setDate] = useState(
    editing?.date.slice(0, 10) ?? pre?.date ?? todayISO(),
  );
  const [groupId, setGroupId] = useState<string | null>(
    editing?.groupId ?? pre?.groupId ?? modal.groupId ?? null,
  );
  const [repeat, setRepeat] = useState<Frequency | "none">("none");
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(
    editing?.receiptUrl,
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editing?.paymentMethod ?? "card",
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const initialParticipants = (): string[] => {
    if (editing) return editing.shares.map((s) => s.userId);
    if (pre?.participantIds?.length) return pre.participantIds;
    if (modal.groupId) {
      const g = getGroup(modal.groupId);
      if (g) return g.memberIds;
    }
    const ids = [currentUser.id];
    if (modal.friendId && modal.friendId !== currentUser.id)
      ids.push(modal.friendId);
    return ids;
  };

  const [participantIds, setParticipantIds] = useState<string[]>(
    initialParticipants,
  );

  const initialPayer = editing
    ? editing.shares.find((s) => s.paid > 0.001)?.userId ?? currentUser.id
    : currentUser.id;
  const [payerId, setPayerId] = useState(initialPayer);

  const detectMethod = (): SplitMethod => {
    if (!editing) return "equal";
    const owed = editing.shares.map((s) => s.owed);
    const eq = splitEqual(editing.amount, owed.length);
    const isEqual = owed.every((o, i) => Math.abs(o - eq[i]) < 0.01);
    return isEqual ? "equal" : "exact";
  };
  const [method, setMethod] = useState<SplitMethod>(detectMethod);

  const [values, setValues] = useState<Record<string, string>>(() => {
    if (editing && detectMethod() === "exact") {
      const m: Record<string, string> = {};
      for (const s of editing.shares) m[s.userId] = String(s.owed);
      return m;
    }
    return {};
  });

  const [itemized, setItemized] = useState(
    !!editing?.items?.length || !!pre?.items?.length,
  );
  const [items, setItems] = useState<LineItem[]>(() => {
    if (editing?.items && editing.items.length) return editing.items;
    if (pre?.items && pre.items.length) {
      return pre.items.map((it) => ({
        id: uid("li_"),
        name: it.name,
        amount: it.amount,
        participantIds: [...participantIds],
      }));
    }
    return [
      { id: uid("li_"), name: "", amount: 0, participantIds: [...participantIds] },
    ];
  });
  const [tax, setTax] = useState(
    editing?.tax ? String(editing.tax) : pre?.tax ? String(pre.tax) : "",
  );
  const [tip, setTip] = useState(
    editing?.tip ? String(editing.tip) : pre?.tip ? String(pre.tip) : "",
  );

  const cur = getCurrency(currency);
  const taxNum = Number.parseFloat(tax) || 0;
  const tipNum = Number.parseFloat(tip) || 0;
  const itemsTotal = round2(items.reduce((a, it) => a + (it.amount || 0), 0));
  const itemizedTotal = round2(itemsTotal + taxNum + tipNum);
  const amountNum = itemized ? itemizedTotal : Number.parseFloat(amount) || 0;
  const n = participantIds.length;
  const eqArr = useMemo(() => splitEqual(amountNum, n), [amountNum, n]);
  const evenPct = n ? round2(100 / n) : 0;

  const rawValue = (id: string, idx: number): string => {
    if (values[id] !== undefined) return values[id];
    if (method === "exact") return String(eqArr[idx] ?? 0);
    if (method === "percentage") return String(evenPct);
    if (method === "shares") return "1";
    return "";
  };

  const owedMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (itemized) {
      const sub: Record<string, number> = {};
      for (const id of participantIds) sub[id] = 0;
      for (const it of items) {
        const ps = it.participantIds.filter((p) => participantIds.includes(p));
        if (ps.length === 0 || !it.amount) continue;
        const per = it.amount / ps.length;
        for (const p of ps) sub[p] = (sub[p] ?? 0) + per;
      }
      const extra = taxNum + tipNum;
      for (const id of participantIds) {
        map[id] = round2(
          (sub[id] ?? 0) +
            (itemsTotal > 0 ? ((sub[id] ?? 0) / itemsTotal) * extra : 0),
        );
      }
      const sum = round2(participantIds.reduce((a, id) => a + (map[id] ?? 0), 0));
      const diff = round2(itemizedTotal - sum);
      if (Math.abs(diff) >= 0.01) {
        const top = [...participantIds].sort(
          (a, b) => (map[b] ?? 0) - (map[a] ?? 0),
        )[0];
        if (top) map[top] = round2((map[top] ?? 0) + diff);
      }
      return map;
    }
    if (method === "equal") {
      participantIds.forEach((id, i) => (map[id] = eqArr[i]));
    } else if (method === "exact") {
      participantIds.forEach(
        (id, i) => (map[id] = round2(Number.parseFloat(rawValue(id, i)) || 0)),
      );
    } else if (method === "percentage") {
      const pcts = participantIds.map(
        (id, i) => Number.parseFloat(rawValue(id, i)) || 0,
      );
      const arr = splitByPercent(amountNum, pcts);
      participantIds.forEach((id, i) => (map[id] = arr[i]));
    } else {
      const shs = participantIds.map(
        (id, i) => Number.parseFloat(rawValue(id, i)) || 0,
      );
      const arr = splitByShares(amountNum, shs);
      participantIds.forEach((id, i) => (map[id] = arr[i]));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemized, items, taxNum, tipNum, itemsTotal, itemizedTotal, method, participantIds, values, amountNum, eqArr, evenPct]);

  const owedSum = round2(
    participantIds.reduce((a, id) => a + (owedMap[id] ?? 0), 0),
  );
  const pctSum = round2(
    participantIds.reduce(
      (a, id, i) => a + (Number.parseFloat(rawValue(id, i)) || 0),
      0,
    ),
  );
  const shareSum = participantIds.reduce(
    (a, id, i) => a + (Number.parseFloat(rawValue(id, i)) || 0),
    0,
  );

  let splitValid = true;
  let splitHint = "";
  if (method === "exact") {
    splitValid = Math.abs(owedSum - amountNum) < 0.01;
    const left = round2(amountNum - owedSum);
    splitHint = splitValid
      ? `${formatMoney(amountNum, currency)} of ${formatMoney(amountNum, currency)}`
      : `${formatMoney(owedSum, currency)} of ${formatMoney(amountNum, currency)} (${
          left > 0
            ? formatMoney(left, currency) + " left"
            : formatMoney(-left, currency) + " over"
        })`;
  } else if (method === "percentage") {
    splitValid = Math.abs(pctSum - 100) < 0.05;
    splitHint = `${pctSum}% of 100%`;
  } else if (method === "shares") {
    splitValid = shareSum > 0;
    splitHint = `${shareSum} total shares`;
  }

  const itemizedValid =
    !itemized ||
    (items.length > 0 &&
      itemizedTotal > 0 &&
      items.every(
        (it) =>
          it.amount > 0 &&
          it.participantIds.filter((p) => participantIds.includes(p)).length > 0,
      ));

  const canSave =
    description.trim().length > 0 &&
    amountNum > 0 &&
    participantIds.length >= 2 &&
    (itemized ? itemizedValid : splitValid);

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems((its) => its.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id: string) =>
    setItems((its) => (its.length > 1 ? its.filter((it) => it.id !== id) : its));
  const addItem = () =>
    setItems((its) => [
      ...its,
      { id: uid("li_"), name: "", amount: 0, participantIds: [...participantIds] },
    ]);
  const toggleItemParticipant = (id: string, pid: string) =>
    setItems((its) =>
      its.map((it) =>
        it.id === id
          ? {
              ...it,
              participantIds: it.participantIds.includes(pid)
                ? it.participantIds.filter((x) => x !== pid)
                : [...it.participantIds, pid],
            }
          : it,
      ),
    );

  const nonParticipants = state.users.filter(
    (u) => !participantIds.includes(u.id),
  );

  const addParticipant = (id: string) => setParticipantIds((p) => [...p, id]);
  const removeParticipant = (id: string) => {
    setParticipantIds((p) => p.filter((x) => x !== id));
    if (payerId === id) setPayerId(currentUser.id);
    setValues((v) => {
      const { [id]: _removed, ...rest } = v;
      return rest;
    });
  };

  const handleGroupChange = (val: string) => {
    if (val === "none") {
      setGroupId(null);
      setParticipantIds((prev) =>
        prev.includes(currentUser.id) ? prev : [currentUser.id, ...prev],
      );
      return;
    }
    const g = getGroup(val);
    setGroupId(val);
    if (g) {
      setParticipantIds(g.memberIds);
      if (!g.memberIds.includes(payerId)) setPayerId(currentUser.id);
      setValues({});
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await compressImage(file);
      setReceiptUrl(url);
    } catch {
      toast.error("Could not load that image");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const scanReceipt = async () => {
    if (!receiptUrl || scanning) return;
    setScanning(true);
    try {
      const { receipt } = await callAiApi<{ receipt: ScannedReceipt }>(
        "/api/ai/scan-receipt",
        { image: receiptUrl },
      );
      if (receipt.merchant) setDescription(receipt.merchant);
      if (receipt.category) {
        setCategory(receipt.category);
        setCategorySuggested(true);
      }
      if (receipt.date) setDate(receipt.date);
      if (receipt.items && receipt.items.length > 0) {
        setItemized(true);
        setItems(
          receipt.items.map((it) => ({
            id: uid("li_"),
            name: it.name,
            amount: it.amount,
            participantIds: [...participantIds],
          })),
        );
        if (receipt.tax) setTax(String(receipt.tax));
        if (receipt.tip) setTip(String(receipt.tip));
      } else if (receipt.total) {
        setAmount(String(receipt.total));
      }
      toast.success("Receipt scanned — check the details below");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't scan that receipt",
      );
    }
    setScanning(false);
  };

  const suggestCategory = async () => {
    if (!description.trim() || category !== "general") return;
    try {
      const { category: suggested } = await callAiApi<{ category: string }>(
        "/api/ai/categorize",
        { description: description.trim() },
      );
      if (suggested && suggested !== "general") {
        setCategory(suggested);
        setCategorySuggested(true);
      }
    } catch {
      // silent — auto-categorize is a nicety, not critical
    }
  };

  const save = () => {
    if (!canSave) {
      if (participantIds.length < 2) {
        toast.error("Add a friend or group to split this expense with");
      } else {
        toast.error("Please complete the expense details");
      }
      return;
    }
    const involved = itemized
      ? participantIds.filter(
          (id) => (owedMap[id] ?? 0) > 0.001 || id === payerId,
        )
      : participantIds;
    const shares: ExpenseShare[] = involved.map((id) => ({
      userId: id,
      paid: id === payerId ? round2(amountNum) : 0,
      owed: round2(owedMap[id] ?? 0),
    }));
    if (!involved.includes(payerId)) {
      shares.push({ userId: payerId, paid: round2(amountNum), owed: 0 });
    }

    const itemFields = itemized
      ? {
          items: items
            .filter((it) => it.amount > 0)
            .map((it) => ({
              ...it,
              amount: round2(it.amount),
              participantIds: it.participantIds.filter((p) =>
                participantIds.includes(p),
              ),
            })),
          tax: taxNum || undefined,
          tip: tipNum || undefined,
        }
      : { items: undefined, tax: undefined, tip: undefined };

    if (editing) {
      updateExpense(editing.id, {
        description: description.trim(),
        amount: round2(amountNum),
        currency,
        category,
        date,
        groupId,
        shares,
        receiptUrl,
        notes: notes.trim() || undefined,
        paymentMethod,
        ...itemFields,
      });
      toast.success("Expense updated");
    } else {
      addExpense({
        description: description.trim(),
        amount: round2(amountNum),
        currency,
        category,
        date,
        groupId,
        shares,
        createdBy: currentUser.id,
        isSettlement: false,
        receiptUrl,
        notes: notes.trim() || undefined,
        paymentMethod,
        ...itemFields,
      });
      if (repeat !== "none") {
        addRecurring({
          description: description.trim(),
          amount: round2(amountNum),
          currency,
          category,
          groupId,
          shares,
          payerId,
          createdBy: currentUser.id,
          frequency: repeat,
          startDate: date,
          nextDue: advanceDate(date, repeat),
          active: true,
        });
        toast.success("Expense added & set to repeat");
      } else {
        toast.success("Expense added");
      }
    }
    onDone();
  };

  return (
    <>
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle className="text-lg">
          {editing ? "Edit expense" : "Add an expense"}
        </DialogTitle>
      </DialogHeader>

      <div className="max-h-[66vh] space-y-5 overflow-y-auto px-6 py-5">
        {/* With you and */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            With you and
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            {participantIds.map((id) => {
              const u = getUser(id);
              if (!u) return null;
              const isMe = id === currentUser.id;
              return (
                <span
                  key={id}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pl-1 pr-2 text-sm font-medium"
                >
                  <UserAvatar user={u} size={22} />
                  {isMe ? "You" : u.name.split(" ")[0]}
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(id)}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
            {nonParticipants.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1.5 text-sm font-semibold text-primary hover:bg-muted"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-1">
                  <div className="max-h-56 overflow-y-auto">
                    {nonParticipants.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => addParticipant(u.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        <UserAvatar user={u} size={24} /> {u.name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {nonParticipants.length === 0 && participantIds.length < 2 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-primary/40 bg-secondary/60 px-3 py-2 text-xs text-sw-charcoal">
              <span>
                You need a friend to split this expense with — add one first.
              </span>
              <Button
                type="button"
                size="sm"
                variant="green"
                className="shrink-0"
                onClick={() => {
                  onDone();
                  openModal({ kind: "addFriend" });
                }}
              >
                Add a friend
              </Button>
            </div>
          )}
        </div>

        {/* Paid by + how */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Paid by
            </Label>
            <Select value={payerId} onValueChange={setPayerId}>
              <SelectTrigger className="h-12 text-base font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {participantIds.map((id) => {
                  const u = getUser(id);
                  if (!u) return null;
                  return (
                    <SelectItem key={id} value={id}>
                      {id === currentUser.id ? "You" : u.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              How was this paid
            </Label>
            <div className="flex h-12 rounded-lg border border-border bg-card p-1">
              {(
                [
                  { id: "cash" as const, label: "Cash" },
                  { id: "card" as const, label: "Card" },
                ]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={cn(
                    "flex-1 rounded-md text-sm font-bold transition-colors",
                    paymentMethod === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Input
            id="desc"
            placeholder="e.g. Dinner, Groceries"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={suggestCategory}
          />
        </div>

        {/* Amount + currency */}
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="amt">
              {itemized ? "Total (from items)" : "Amount"}
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                {cur.symbol}
              </span>
              <Input
                id="amt"
                inputMode="decimal"
                placeholder="0.00"
                className="pl-8 font-semibold disabled:opacity-100"
                value={itemized ? itemizedTotal.toFixed(2) : amount}
                disabled={itemized}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                }
              />
            </div>
            {itemized && (
              <p className="text-xs text-muted-foreground">
                Calculated from your itemized list below — turn off
                &quot;Itemize this bill&quot; to enter a total directly.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="font-semibold">{c.symbol}</span> {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category / group */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              Category
              {categorySuggested && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                  <Sparkles className="h-3 w-3" /> AI suggested
                </span>
              )}
            </Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setCategorySuggested(false);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {Array.from(new Set(CATEGORIES.map((c) => c.group))).map(
                  (grp) => (
                    <SelectGroup key={grp}>
                      <SelectLabel>{grp}</SelectLabel>
                      {CATEGORIES.filter((c) => c.group === grp).map((c) => {
                        const Icon = c.icon;
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              <Icon
                                className="h-4 w-4"
                                style={{ color: c.color }}
                              />
                              {c.name}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Group</Label>
            <Select value={groupId ?? "none"} onValueChange={handleGroupChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non-group</SelectItem>
                {state.groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date / repeat */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {!editing && (
            <div className="space-y-1.5">
              <Label>Repeat</Label>
              <Select
                value={repeat}
                onValueChange={(v) => setRepeat(v as Frequency | "none")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPEAT_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Itemize toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <ListPlus className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-sw-charcoal">
                Itemize this bill
              </p>
              <p className="text-xs text-muted-foreground">
                Split individual items, tax &amp; tip
              </p>
            </div>
          </div>
          <Switch checked={itemized} onCheckedChange={setItemized} />
        </div>

        {/* Split method */}
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">
              {payerId === currentUser.id ? "You" : getUser(payerId)?.name}{" "}
              paid{!itemized && " — split"}
            </span>
          </div>

          {!itemized && (
            <>
          <div className="mt-3 inline-flex rounded-lg border border-border bg-card p-0.5">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMethod(m.id);
                  setValues({});
                }}
                className={cn(
                  "min-w-[44px] rounded-md px-3 py-1.5 text-sm font-bold transition-colors",
                  method === m.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title={m.title}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-1">
            {method === "equal" && (
              <p className="px-1 py-2 text-sm text-muted-foreground">
                Split equally —{" "}
                <span className="font-bold text-foreground">
                  {formatMoney(n ? amountNum / n : 0, currency)}
                </span>{" "}
                per person ({n} people)
              </p>
            )}

            {method !== "equal" &&
              participantIds.map((id, i) => {
                const u = getUser(id);
                if (!u) return null;
                return (
                  <div key={id} className="flex items-center gap-3 py-1">
                    <UserAvatar user={u} size={26} />
                    <span className="flex-1 truncate text-sm font-medium">
                      {id === currentUser.id ? "You" : u.name.split(" ")[0]}
                    </span>
                    <span className="w-20 text-right text-xs text-muted-foreground">
                      {formatMoney(owedMap[id] ?? 0, currency)}
                    </span>
                    <div className="relative w-28">
                      {method === "exact" && (
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {cur.symbol}
                        </span>
                      )}
                      <Input
                        inputMode="decimal"
                        className={cn(
                          "h-8 text-right text-sm",
                          method === "exact" && "pl-7",
                          method === "percentage" && "pr-6",
                        )}
                        value={rawValue(id, i)}
                        onChange={(e) =>
                          setValues((v) => ({
                            ...v,
                            [id]: e.target.value.replace(/[^0-9.]/g, ""),
                          }))
                        }
                      />
                      {method === "percentage" && (
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          %
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

            {method !== "equal" && (
              <p
                className={cn(
                  "px-1 pt-2 text-xs font-semibold",
                  splitValid ? "text-owed" : "text-owe",
                )}
              >
                {splitHint}
              </p>
            )}
          </div>
            </>
          )}

          {itemized && (
            <div className="mt-3 space-y-2">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-border bg-card p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Item name"
                      value={it.name}
                      onChange={(e) =>
                        updateItem(it.id, { name: e.target.value })
                      }
                      className="h-8 flex-1"
                    />
                    <div className="relative w-24">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {cur.symbol}
                      </span>
                      <Input
                        inputMode="decimal"
                        placeholder="0.00"
                        className="h-8 pl-6 text-right text-sm"
                        value={it.amount ? String(it.amount) : ""}
                        onChange={(e) =>
                          updateItem(it.id, {
                            amount:
                              Number.parseFloat(
                                e.target.value.replace(/[^0-9.]/g, ""),
                              ) || 0,
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {participantIds.map((pid) => {
                      const u = getUser(pid);
                      if (!u) return null;
                      const on = it.participantIds.includes(pid);
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => toggleItemParticipant(it.id, pid)}
                          className={cn(
                            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
                            on
                              ? "border-primary bg-secondary text-primary"
                              : "border-border text-muted-foreground hover:bg-muted",
                          )}
                        >
                          <UserAvatar user={u} size={16} />
                          {pid === currentUser.id ? "You" : u.name.split(" ")[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {cur.symbol}
                  </span>
                  <Input
                    inputMode="decimal"
                    placeholder="Tax"
                    className="h-9 pl-6"
                    value={tax}
                    onChange={(e) =>
                      setTax(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                  />
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {cur.symbol}
                  </span>
                  <Input
                    inputMode="decimal"
                    placeholder="Tip"
                    className="h-9 pl-6"
                    value={tip}
                    onChange={(e) =>
                      setTip(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[15, 18, 20].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setTip(String(round2((itemsTotal * p) / 100)))
                    }
                    className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                  >
                    {p}% tip
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">
                  Items {formatMoney(itemsTotal, currency)}
                  {(taxNum > 0 || tipNum > 0) &&
                    ` + ${formatMoney(taxNum + tipNum, currency)}`}
                </span>
                <span className="font-extrabold text-sw-charcoal">
                  {formatMoney(itemizedTotal, currency)}
                </span>
              </div>

              <div className="space-y-1 rounded-lg bg-muted/30 p-2">
                {participantIds.map((id) => {
                  const u = getUser(id);
                  if (!u) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <UserAvatar user={u} size={18} />
                        {id === currentUser.id ? "You" : u.name.split(" ")[0]}
                      </span>
                      <span className="font-semibold text-sw-charcoal">
                        {formatMoney(owedMap[id] ?? 0, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Receipt + notes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
          <div className="space-y-1.5">
            <Label>Receipt</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            {receiptUrl ? (
              <div className="space-y-1.5">
                <div className="relative w-fit">
                  <img
                    src={receiptUrl}
                    alt="Receipt"
                    className="h-24 w-24 rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptUrl(undefined)}
                    className="absolute -right-2 -top-2 rounded-full bg-sw-charcoal p-1 text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-24 gap-1 px-2 text-xs"
                  disabled={scanning}
                  onClick={scanReceipt}
                >
                  {scanning ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {scanning ? "Scanning" : "Scan w/ AI"}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
                {uploading ? "Loading" : "Add photo"}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add a note (optional)"
              className="h-24 resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DialogFooter className="border-t px-6 py-4">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="green" onClick={save} disabled={!canSave}>
          {editing ? "Save changes" : "Save expense"}
        </Button>
      </DialogFooter>
    </>
  );
}
