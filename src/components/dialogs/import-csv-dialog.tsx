"use client";

import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { downloadFile } from "@/lib/export";
import { callAiApi } from "@/lib/call-ai-api";
import { createGroupApi, createExpenseApi } from "@/lib/sync-api";
import { splitEqual } from "@/lib/split";
import { round2 } from "@/lib/calculations";
import {
  csvTemplate,
  parseImportCSV,
  collectNames,
  resolveCategoryId,
  type ParsedRow,
  type RowError,
} from "@/lib/csv-import";
import type { Expense, ExpenseShare } from "@/lib/types";
import { Download, Upload, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Stage = "upload" | "map" | "importing" | "done";

type NameChoice =
  | { kind: "self" }
  | { kind: "friend"; friendId: string }
  | { kind: "new"; email: string; resolvedId?: string }
  | { kind: "unresolved" };

export function ImportCsvDialog() {
  const { modal, closeModal } = useUI();
  const open = modal.kind === "importCsv";
  const { state, currentUser, addFriend, resetData } = useStore();

  const [stage, setStage] = useState<Stage>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<RowError[]>([]);
  const [nameChoices, setNameChoices] = useState<Record<string, NameChoice>>({});
  const [addingFriendFor, setAddingFriendFor] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [failedRows, setFailedRows] = useState<RowError[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const names = useMemo(() => collectNames(rows), [rows]);

  const close = () => {
    setStage("upload");
    setRows([]);
    setParseErrors([]);
    setNameChoices({});
    setAddingFriendFor(null);
    setNewEmail("");
    setProgress(0);
    setImportedCount(0);
    setFailedRows([]);
    if (fileRef.current) fileRef.current.value = "";
    closeModal();
  };

  const downloadTemplate = () => {
    downloadFile("mysplitwise-import-template.csv", csvTemplate(), "text/csv;charset=utf-8;");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows: parsed, errors } = parseImportCSV(text);
    setRows(parsed);
    setParseErrors(errors);
    if (parsed.length > 0) {
      const initial: Record<string, NameChoice> = {};
      for (const name of collectNames(parsed)) {
        if (name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) {
          initial[name] = { kind: "self" };
          continue;
        }
        const friend = state.users.find(
          (u) => u.id !== currentUser.id && u.name.trim().toLowerCase() === name.trim().toLowerCase(),
        );
        initial[name] = friend ? { kind: "friend", friendId: friend.id } : { kind: "unresolved" };
      }
      setNameChoices(initial);
    }
  };

  const allResolved =
    names.length > 0 &&
    names.every((n) => {
      const c = nameChoices[n];
      return c && (c.kind === "self" || c.kind === "friend" || (c.kind === "new" && c.resolvedId));
    });

  const addNewFriend = async (name: string) => {
    if (!newEmail.trim()) {
      toast.error("Enter an email to add them as a friend");
      return;
    }
    try {
      const { id, status } = await addFriend(name, newEmail.trim());
      setNameChoices((prev) => ({
        ...prev,
        [name]: { kind: "new", email: newEmail.trim(), resolvedId: id },
      }));
      if (status === "connected") {
        toast.success(`${name} added — you're now connected!`);
      } else {
        toast.success(`${name} invited — you'll be connected as soon as they join mysplitwise`);
      }
      setAddingFriendFor(null);
      setNewEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that friend");
    }
  };

  const resolveId = (name: string): string | undefined => {
    const c = nameChoices[name];
    if (!c) return undefined;
    if (c.kind === "self") return currentUser.id;
    if (c.kind === "friend") return c.friendId;
    if (c.kind === "new") return c.resolvedId;
    return undefined;
  };

  const buildShares = (row: ParsedRow): ExpenseShare[] | null => {
    const payerId = resolveId(row.paidBy);
    if (!payerId) return null;
    const owed = new Map<string, number>();
    if (row.perPersonAmounts) {
      for (const name of row.splitWith) {
        const id = resolveId(name);
        if (!id) return null;
        owed.set(id, round2(row.perPersonAmounts.get(name) ?? 0));
      }
    } else {
      const amounts = splitEqual(row.amount, row.splitWith.length);
      row.splitWith.forEach((name, i) => {
        const id = resolveId(name);
        if (!id) return;
        owed.set(id, (owed.get(id) ?? 0) + amounts[i]);
      });
      if (owed.size !== row.splitWith.length) return null;
    }
    const shares = new Map<string, { paid: number; owed: number }>();
    for (const [id, amt] of owed) shares.set(id, { paid: 0, owed: amt });
    const existing = shares.get(payerId);
    shares.set(payerId, { paid: row.amount, owed: existing?.owed ?? 0 });
    return [...shares.entries()].map(([userId, v]) => ({ userId, ...v }));
  };

  const runImport = async () => {
    setStage("importing");
    setProgress(0);
    setImportedCount(0);
    setFailedRows([]);

    // Create any new groups first, one call each.
    const groupIdByName = new Map<string, string>();
    for (const g of state.groups) groupIdByName.set(g.name.trim().toLowerCase(), g.id);
    const uniqueGroupNames = [...new Set(rows.map((r) => r.group).filter(Boolean))] as string[];
    for (const groupName of uniqueGroupNames) {
      const key = groupName.trim().toLowerCase();
      if (groupIdByName.has(key)) continue;
      const memberIds = new Set<string>();
      for (const r of rows.filter((row) => row.group === groupName)) {
        const payerId = resolveId(r.paidBy);
        if (payerId) memberIds.add(payerId);
        for (const n of r.splitWith) {
          const id = resolveId(n);
          if (id) memberIds.add(id);
        }
      }
      try {
        const { group } = await createGroupApi(groupName.trim(), "other", [...memberIds]);
        groupIdByName.set(key, group.id);
      } catch {
        // Fall through — expenses for this group will just be logged ungrouped.
      }
    }

    const failures: RowError[] = [];
    let done = 0;
    for (const row of rows) {
      try {
        const shares = buildShares(row);
        if (!shares) throw new Error("Couldn't resolve everyone in this row");
        let category = row.category ? resolveCategoryId(row.category) : undefined;
        if (!category) {
          try {
            const { category: suggested } = await callAiApi<{ category: string }>(
              "/api/ai/categorize",
              { description: row.description },
            );
            category = suggested || "general";
          } catch {
            category = "general";
          }
        }
        const groupId = row.group ? groupIdByName.get(row.group.trim().toLowerCase()) ?? null : null;
        const expense: Omit<Expense, "id" | "createdAt"> = {
          description: row.description,
          amount: row.amount,
          currency: row.currency || state.baseCurrency,
          category,
          date: row.date,
          groupId,
          shares,
          createdBy: currentUser.id,
          isSettlement: false,
          notes: row.notes,
        };
        await createExpenseApi(expense);
        done++;
      } catch (err) {
        failures.push({
          rowNumber: row.rowNumber,
          message: err instanceof Error ? err.message : "Couldn't import this row",
        });
      }
      setImportedCount(done);
      setProgress(Math.round(((done + failures.length) / rows.length) * 100));
    }

    setFailedRows(failures);
    resetData();
    setStage("done");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import expenses from CSV</DialogTitle>
        </DialogHeader>

        {stage === "upload" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Download mysplitwise&apos;s CSV template, fill it in by hand (works great from
              another expense-tracking app&apos;s export you&apos;ve copied over, or from scratch),
              then upload it here.
            </p>
            <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Download template
            </Button>
            <div className="space-y-1.5">
              <Label htmlFor="csv-file">Upload filled-in CSV</Label>
              <input
                ref={fileRef}
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={onFile}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-primary"
              />
            </div>
            {(rows.length > 0 || parseErrors.length > 0) && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="font-semibold text-sw-charcoal">
                  {rows.length} row{rows.length === 1 ? "" : "s"} parsed
                  {parseErrors.length > 0 && `, ${parseErrors.length} invalid`}
                </p>
                {parseErrors.length > 0 && (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {parseErrors.map((e, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-owe" />
                        Row {e.rowNumber}: {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {stage === "map" && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Match each name in your file to a mysplitwise account so balances land in the
              right place.
            </p>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto">
              {names.map((name) => {
                const choice = nameChoices[name] ?? { kind: "unresolved" };
                return (
                  <div key={name} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-bold text-sw-charcoal">{name}</p>
                    {choice.kind === "self" && (
                      <p className="mt-1 text-xs font-semibold text-owed">This is you</p>
                    )}
                    {choice.kind === "friend" && (
                      <p className="mt-1 text-xs font-semibold text-owed">
                        Matched to {state.users.find((u) => u.id === choice.friendId)?.name}
                      </p>
                    )}
                    {choice.kind === "new" && choice.resolvedId && (
                      <p className="mt-1 text-xs font-semibold text-owed">
                        Added as new friend ({choice.email})
                      </p>
                    )}
                    {choice.kind === "unresolved" && (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNameChoices((p) => ({ ...p, [name]: { kind: "self" } }))}
                          >
                            This is me
                          </Button>
                          <Select
                            onValueChange={(friendId) =>
                              setNameChoices((p) => ({ ...p, [name]: { kind: "friend", friendId } }))
                            }
                          >
                            <SelectTrigger className="h-8 w-44 text-xs">
                              <SelectValue placeholder="Pick existing friend" />
                            </SelectTrigger>
                            <SelectContent>
                              {state.users
                                .filter((u) => u.id !== currentUser.id)
                                .map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAddingFriendFor(name);
                              setNewEmail("");
                            }}
                          >
                            Add as new friend
                          </Button>
                        </div>
                        {addingFriendFor === name && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="email"
                              placeholder="friend@email.com"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              className="h-8 text-xs"
                              autoFocus
                            />
                            <Button type="button" size="sm" variant="green" onClick={() => addNewFriend(name)}>
                              Add
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stage === "importing" && (
          <div className="space-y-4 py-6">
            <p className="text-center text-sm font-semibold text-sw-charcoal">
              Importing {importedCount} of {rows.length}…
            </p>
            <Progress value={progress} />
          </div>
        )}

        {stage === "done" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sw-charcoal">
              <CheckCircle2 className="h-5 w-5 text-owed" />
              <p className="font-semibold">
                Imported {importedCount} of {rows.length} rows.
              </p>
            </div>
            {failedRows.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                {failedRows.map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-owe" />
                    Row {e.rowNumber}: {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          {stage === "upload" && (
            <>
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button variant="green" disabled={rows.length === 0} onClick={() => setStage("map")}>
                Continue
              </Button>
            </>
          )}
          {stage === "map" && (
            <>
              <Button variant="ghost" onClick={() => setStage("upload")}>
                Back
              </Button>
              <Button variant="green" disabled={!allResolved} onClick={runImport}>
                <Upload className="mr-2 h-4 w-4" /> Import {rows.length} row{rows.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
          {stage === "importing" && (
            <Button variant="ghost" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…
            </Button>
          )}
          {stage === "done" && (
            <Button variant="green" onClick={close}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
