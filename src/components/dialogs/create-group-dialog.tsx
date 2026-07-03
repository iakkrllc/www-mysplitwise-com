"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useStore } from "@/lib/store";
import { useUI, type Modal } from "@/lib/ui-store";
import type { GroupType } from "@/lib/types";
import { UserAvatar } from "../user-avatar";
import { getCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Plane, Home, Heart, Folder, Check } from "lucide-react";
import { toast } from "sonner";

const TYPES: { id: GroupType; label: string; icon: typeof Home }[] = [
  { id: "trip", label: "Trip", icon: Plane },
  { id: "home", label: "Home", icon: Home },
  { id: "couple", label: "Couple", icon: Heart },
  { id: "other", label: "Other", icon: Folder },
];

export function CreateGroupDialog() {
  const { modal, closeModal } = useUI();
  const open = modal.kind === "createGroup";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-md">
        {open && <GroupForm modal={modal} onDone={closeModal} />}
      </DialogContent>
    </Dialog>
  );
}

function GroupForm({
  modal,
  onDone,
}: {
  modal: Extract<Modal, { kind: "createGroup" }>;
  onDone: () => void;
}) {
  const { state, currentUser, addGroup, updateGroup, setView } = useStore();
  const editing = modal.editId
    ? state.groups.find((g) => g.id === modal.editId)
    : undefined;

  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<GroupType>(editing?.type ?? "trip");
  const [memberIds, setMemberIds] = useState<string[]>(
    editing?.memberIds ?? [currentUser.id],
  );
  const [budget, setBudget] = useState(
    editing?.monthlyBudget ? String(editing.monthlyBudget) : "",
  );

  const friends = state.users.filter((u) => u.id !== currentUser.id);
  const sym = getCurrency(state.baseCurrency).symbol;

  const toggle = (id: string) =>
    setMemberIds((m) =>
      m.includes(id) ? m.filter((x) => x !== id) : [...m, id],
    );

  const save = () => {
    if (!name.trim()) {
      toast.error("Give your group a name");
      return;
    }
    if (memberIds.length < 2) {
      toast.error("Add at least one other member");
      return;
    }
    const budgetNum = Number.parseFloat(budget) || 0;
    const monthlyBudget = budgetNum > 0 ? budgetNum : undefined;
    if (editing) {
      updateGroup(editing.id, { name: name.trim(), type, memberIds, monthlyBudget });
      toast.success("Group updated");
    } else {
      const id = addGroup(name.trim(), type, memberIds);
      if (monthlyBudget) updateGroup(id, { monthlyBudget });
      toast.success("Group created");
      setView({ type: "group", id });
    }
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit group" : "Create a group"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="group-name">Group name</Label>
          <Input
            id="group-name"
            placeholder="e.g. Trip to Tokyo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary bg-secondary text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="group-budget">Monthly budget (optional)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              {sym}
            </span>
            <Input
              id="group-budget"
              inputMode="decimal"
              placeholder="e.g. 2000"
              className="pl-8"
              value={budget}
              onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Members</Label>
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <UserAvatar user={currentUser} size={28} />
            <span className="text-sm font-semibold">You</span>
            <span className="ml-auto text-xs text-muted-foreground">
              (always included)
            </span>
          </div>
          <div className="max-h-52 space-y-1 overflow-y-auto">
            {friends.length === 0 && (
              <p className="px-1 py-2 text-sm text-muted-foreground">
                Add friends first to include them.
              </p>
            )}
            {friends.map((f) => {
              const checked = memberIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle(f.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <UserAvatar user={f} size={28} />
                  <span className="flex-1 text-sm font-medium">{f.name}</span>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-md border",
                      checked
                        ? "border-primary bg-primary text-white"
                        : "border-input",
                    )}
                  >
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="green" onClick={save}>
          {editing ? "Save changes" : "Create group"}
        </Button>
      </DialogFooter>
    </>
  );
}
