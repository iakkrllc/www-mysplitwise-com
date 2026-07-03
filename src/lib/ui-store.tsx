"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type Modal =
  | { kind: "none" }
  | {
      kind: "addExpense";
      groupId?: string | null;
      friendId?: string;
      editId?: string;
    }
  | { kind: "settle"; groupId?: string | null; fromId?: string; toId?: string }
  | { kind: "createGroup"; editId?: string }
  | { kind: "addFriend" }
  | { kind: "expenseDetail"; id: string }
  | { kind: "paymentInfo"; userId: string }
  | { kind: "deleteAccount" };

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
