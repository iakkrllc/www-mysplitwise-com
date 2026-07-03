"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { ExpenseList } from "../expense-list";
import { balanceBetween, formatMoney } from "@/lib/calculations";
import { CATEGORIES } from "@/lib/categories";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Download,
  Search,
  X,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import {
  exportBalancesCSV,
  exportBalancesPDF,
  exportExpensesCSV,
  exportExpensesPDF,
  type ExportHelpers,
} from "@/lib/export";
import { toast } from "sonner";

export function AllExpensesView() {
  const { state, currentUser, baseExpenses, getUser, getGroup } = useStore();
  const base = state.baseCurrency;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const predicate = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (e: { description: string; category: string; groupId: string | null; date: string }) => {
      if (q && !e.description.toLowerCase().includes(q)) return false;
      if (category !== "all" && e.category !== category) return false;
      if (groupId === "none" && e.groupId !== null) return false;
      if (groupId !== "all" && groupId !== "none" && e.groupId !== groupId)
        return false;
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    };
  }, [query, category, groupId, from, to]);

  const mine = useMemo(
    () =>
      state.expenses.filter((e) =>
        e.shares.some((s) => s.userId === currentUser.id),
      ),
    [state.expenses, currentUser.id],
  );
  const baseMine = useMemo(
    () =>
      baseExpenses.filter((e) =>
        e.shares.some((s) => s.userId === currentUser.id),
      ),
    [baseExpenses, currentUser.id],
  );

  const filtered = useMemo(() => mine.filter(predicate), [mine, predicate]);
  const filteredBase = useMemo(
    () => baseMine.filter(predicate),
    [baseMine, predicate],
  );

  const { totalLent, totalBorrowed } = useMemo(() => {
    let totalLent = 0;
    let totalBorrowed = 0;
    for (const e of filteredBase) {
      if (e.isSettlement) continue;
      const my = e.shares.find((s) => s.userId === currentUser.id);
      if (!my) continue;
      const net = my.paid - my.owed;
      if (net > 0) totalLent += net;
      else totalBorrowed += -net;
    }
    return { totalLent, totalBorrowed };
  }, [filteredBase, currentUser.id]);

  const hasFilters =
    query || category !== "all" || groupId !== "all" || from || to;

  const helpers: ExportHelpers = {
    currentUserId: currentUser.id,
    nameOf: (id) => (id === currentUser.id ? "You" : getUser(id)?.name ?? "Someone"),
    groupName: (gid) => (gid ? getGroup(gid)?.name ?? "Group" : "Non-group"),
    baseCurrency: base,
  };

  const balanceRows = useMemo(
    () =>
      state.users
        .filter((u) => u.id !== currentUser.id)
        .map((u) => ({
          name: u.name,
          balance: balanceBetween(currentUser.id, u.id, baseExpenses),
        }))
        .filter((r) => Math.abs(r.balance) > 0.01),
    [state.users, currentUser.id, baseExpenses],
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-sw-charcoal sm:text-3xl">
          All expenses
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              Expenses ({filtered.length})
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                exportExpensesCSV(filtered, helpers);
                toast.success("Exported CSV");
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Expenses as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                exportExpensesPDF(filtered, helpers);
                toast.success("Exported PDF");
              }}
            >
              <FileText className="mr-2 h-4 w-4" /> Expenses as PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Balances</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                exportBalancesCSV(balanceRows, base);
                toast.success("Exported CSV");
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Balances as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                exportBalancesPDF(balanceRows, base);
                toast.success("Exported PDF");
              }}
            >
              <FileText className="mr-2 h-4 w-4" /> Balances as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter bar */}
      <div className="mb-4 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search descriptions…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="lg:w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All categories</SelectItem>
              {Array.from(new Set(CATEGORIES.map((c) => c.group))).map((grp) => (
                <SelectGroup key={grp}>
                  <SelectLabel>{grp}</SelectLabel>
                  {CATEGORIES.filter((c) => c.group === grp).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="lg:w-40">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              <SelectItem value="none">Non-group</SelectItem>
              {state.groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">From</span>
            <Input
              type="date"
              className="h-9 w-full sm:w-40"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">To</span>
            <Input
              type="date"
              className="h-9 w-full sm:w-40"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground sm:ml-auto"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setGroupId("all");
                setFrom("");
                setTo("");
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 text-sm">
        <span className="font-semibold text-muted-foreground">
          {filtered.length} expense{filtered.length === 1 ? "" : "s"}
        </span>
        <div className="flex gap-6">
          <span>
            <span className="text-muted-foreground">Lent </span>
            <span className="font-extrabold text-owed">
              {formatMoney(totalLent, base)}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">Borrowed </span>
            <span className="font-extrabold text-owe">
              {formatMoney(totalBorrowed, base)}
            </span>
          </span>
        </div>
      </div>

      <ExpenseList expenses={filtered} />
    </div>
  );
}
