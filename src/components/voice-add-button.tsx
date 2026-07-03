"use client";

import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { callAiApi } from "@/lib/call-ai-api";
import { Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceExpenseResult {
  description: string;
  amount: number;
  category: string;
  friendIds: string[];
  groupId: string | null;
}

interface MinimalSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): (new () => MinimalSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalSpeechRecognition;
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceAddButton() {
  const { state, currentUser } = useStore();
  const { openModal } = useUI();
  const [status, setStatus] = useState<"idle" | "listening" | "parsing">("idle");
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);

  const start = () => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      toast.error("Voice input isn't supported in this browser");
      return;
    }
    if (status !== "idle") return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = async (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (!transcript) {
        setStatus("idle");
        return;
      }
      setStatus("parsing");
      try {
        const friends = state.users
          .filter((u) => u.id !== currentUser.id)
          .map((u) => ({ id: u.id, name: u.name }));
        const groups = state.groups.map((g) => ({ id: g.id, name: g.name }));
        const { expense } = await callAiApi<{ expense: VoiceExpenseResult }>(
          "/api/ai/parse-voice-expense",
          { transcript, friends, groups },
        );
        const participantIds = [
          currentUser.id,
          ...expense.friendIds.filter((id) => id !== currentUser.id),
        ];
        openModal({
          kind: "addExpense",
          aiPrefill: {
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            groupId: expense.groupId,
            participantIds:
              participantIds.length > 1 ? participantIds : undefined,
          },
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't understand that",
        );
      }
      setStatus("idle");
    };
    recognition.onerror = () => {
      toast.error("Didn't catch that — try again");
      setStatus("idle");
    };
    recognition.onend = () => {
      setStatus((s) => (s === "listening" ? "idle" : s));
    };

    setStatus("listening");
    recognition.start();
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={start}
      disabled={status !== "idle"}
      aria-label="Add expense by voice"
      title="Add expense by voice"
    >
      {status === "idle" && <Mic className="h-4 w-4" />}
      {status === "listening" && <Mic className="h-4 w-4 animate-pulse text-primary" />}
      {status === "parsing" && <Loader2 className="h-4 w-4 animate-spin" />}
    </Button>
  );
}
