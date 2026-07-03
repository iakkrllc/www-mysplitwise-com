"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { buildFinanceSummary } from "@/lib/finance-summary";
import { callAiApi } from "@/lib/call-ai-api";
import { Sparkles, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Turn {
  question: string;
  answer?: string;
  error?: string;
}

const SUGGESTIONS = [
  "How much did I spend on dining out this month?",
  "Who owes me the most right now?",
  "What's my biggest spending category?",
];

export function AskAiDialog() {
  const { modal, closeModal } = useUI();
  const open = modal.kind === "askAi";
  const { state, baseExpenses, currentUser } = useStore();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setQuestion("");
    setLoading(true);
    setTurns((t) => [...t, { question: trimmed }]);
    try {
      const summary = buildFinanceSummary(state, baseExpenses, currentUser.id);
      const { answer } = await callAiApi<{ answer: string }>("/api/ai/ask", {
        question: trimmed,
        summary,
      });
      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = { question: trimmed, answer };
        return next;
      });
    } catch (err) {
      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = {
          question: trimmed,
          error: err instanceof Error ? err.message : "Something went wrong",
        };
        return next;
      });
    }
    setLoading(false);
  };

  const handleClose = () => {
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Ask mysplitwise
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-[240px] flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {turns.length === 0 && (
            <div>
              <p className="text-sm text-muted-foreground">
                Ask anything about your expenses, balances, or spending — I&apos;ll
                answer using your data on this device.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="w-fit rounded-full border border-dashed border-primary/40 bg-secondary/40 px-3 py-1.5 text-left text-xs font-medium text-sw-charcoal transition-colors hover:bg-secondary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className="space-y-2">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
                {t.question}
              </div>
              <div
                className={cn(
                  "mr-auto w-fit max-w-[90%] rounded-2xl rounded-tl-sm px-4 py-2 text-sm",
                  t.error
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-sw-charcoal",
                )}
              >
                {t.error ??
                  t.answer ?? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                    </span>
                  )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2 border-t px-4 py-3">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(question);
              }
            }}
            placeholder="Ask a question…"
            className="h-11 min-h-0 resize-none py-2.5"
          />
          <Button
            variant="green"
            size="icon"
            disabled={loading || !question.trim()}
            onClick={() => ask(question)}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
