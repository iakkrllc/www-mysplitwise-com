"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { balanceBetween } from "@/lib/calculations";
import { formatMoney } from "@/lib/currency";
import { callAiApi } from "@/lib/call-ai-api";
import { Sparkles, Loader2, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function ReminderDialog() {
  const { modal, closeModal } = useUI();
  const open = modal.kind === "reminderDraft";
  const friendId = modal.kind === "reminderDraft" ? modal.friendId : null;
  const { state, baseExpenses, currentUser, getUser } = useStore();
  const friend = friendId ? getUser(friendId) : undefined;
  const base = state.baseCurrency;

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = friendId ? balanceBetween(currentUser.id, friendId, baseExpenses) : 0;
  const amountText = formatMoney(Math.abs(balance), base);

  useEffect(() => {
    if (!open || !friend) return;
    setMessage("");
    setError(null);
    setLoading(true);
    callAiApi<{ message: string }>("/api/ai/draft-reminder", {
      friendName: friend.name.split(" ")[0],
      amountText,
    })
      .then(({ message }) => setMessage(message))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't draft a reminder"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, friendId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  if (!friend) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="sm:max-w-sm" />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Remind {friend.name.split(" ")[0]}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {friend.name.split(" ")[0]} owes you {amountText}. Here&apos;s a drafted
          nudge — edit it if you&apos;d like, then send it however you talk to them.
        </p>
        <div className="py-1">
          {loading ? (
            <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Drafting a message…
            </div>
          ) : error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : (
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-28 resize-none"
            />
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <Button variant="ghost" onClick={closeModal}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={!message}
              onClick={copy}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            <Button variant="green" className="gap-1.5" disabled={!message} asChild>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Send
              </a>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
