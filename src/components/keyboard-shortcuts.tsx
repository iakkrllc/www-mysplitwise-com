"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "N", label: "Add an expense" },
  { keys: "S", label: "Settle up" },
  { keys: "D", label: "Go to Dashboard" },
  { keys: "F", label: "Go to Friends" },
  { keys: "A", label: "Go to All expenses" },
  { keys: "R", label: "Go to Recurring" },
  { keys: "⌘K", label: "Open command palette" },
  { keys: "?", label: "Show this help" },
];

export function KeyboardShortcuts() {
  const { setView } = useStore();
  const { openModal, modal, commandOpen } = useUI();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      )
        return;
      // don't hijack while a dialog / command palette is open
      if (commandOpen || (modal.kind !== "none" && !helpOpen)) return;

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          openModal({ kind: "addExpense" });
          break;
        case "s":
          e.preventDefault();
          openModal({ kind: "settle" });
          break;
        case "d":
          setView({ type: "dashboard" });
          break;
        case "f":
          setView({ type: "friends" });
          break;
        case "a":
          setView({ type: "all-expenses" });
          break;
        case "r":
          setView({ type: "recurring" });
          break;
        case "?":
          setHelpOpen((v) => !v);
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openModal, setView, modal.kind, commandOpen, helpOpen]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 py-1">
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm"
            >
              <span className="text-sw-charcoal">{s.label}</span>
              <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
