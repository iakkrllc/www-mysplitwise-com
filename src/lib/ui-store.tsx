"use client";

import { createContext, useCallback, useContext, useState } from "react";

export interface AiExpensePrefill {
  description?: string;
  amount?: number;
  category?: string;
  date?: string;
  participantIds?: string[];
  groupId?: string | null;
  items?: { name: string; amount: number }[];
  tax?: number;
  tip?: number;
}

export type Modal =
  | { kind: "none" }
  | {
      kind: "addExpense";
      groupId?: string | null;
      friendId?: string;
      editId?: string;
      aiPrefill?: AiExpensePrefill;
    }
  | { kind: "settle"; groupId?: string | null; fromId?: string; toId?: string }
  | { kind: "createGroup"; editId?: string }
  | { kind: "addFriend" }
  | { kind: "expenseDetail"; id: string }
  | { kind: "paymentInfo"; userId: string }
  | { kind: "deleteAccount" }
  | { kind: "askAi" }
  | { kind: "reminderDraft"; friendId: string }
  | { kind: "changePhone" }
  | { kind: "importCsv" };

interface UIContextValue {
  modal: Modal;
  openModal: (m: Modal) => void;
  closeModal: () => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [commandOpen, setCommandOpen] = useState(false);
  const openModal = useCallback((m: Modal) => setModal(m), []);
  const closeModal = useCallback(() => setModal({ kind: "none" }), []);
  return (
    <UIContext.Provider
      value={{ modal, openModal, closeModal, commandOpen, setCommandOpen }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
