"use client";

import { useMemo } from "react";
import {
  LayoutDashboard,
  Activity,
  ReceiptText,
  Plus,
  Plane,
  Home,
  Heart,
  Folder,
  Repeat,
  Users,
  Wallet,
  Sparkles,
} from "lucide-react";
import { useStore, type View } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { balanceBetween, formatMoney, summaryForUser } from "@/lib/calculations";
import type { GroupType } from "@/lib/types";
import { UserAvatar } from "./user-avatar";
import { InviteFriend } from "./invite-friend";
import { cn } from "@/lib/utils";

const GROUP_ICONS: Record<GroupType, typeof Home> = {
  home: Home,
  trip: Plane,
  couple: Heart,
  other: Folder,
};

function BalanceTag({ net, currency }: { net: number; currency: string }) {
  if (Math.abs(net) < 0.01)
    return <span className="text-[11px] text-muted-foreground">settled up</span>;
  const owed = net > 0;
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="text-[10px] text-muted-foreground">
        {owed ? "you are owed" : "you owe"}
      </span>
      <span
        className={cn(
          "text-[12px] font-bold",
          owed ? "text-owed" : "text-owe",
        )}
      >
        {formatMoney(Math.abs(net), currency)}
      </span>
    </span>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { state, currentUser, view, setView, baseExpenses } = useStore();
  const { openModal } = useUI();
  const base = state.baseCurrency;

  const friends = useMemo(
    () => state.users.filter((u) => u.id !== currentUser.id),
    [state.users, currentUser.id],
  );

  const go = (v: View) => {
    setView(v);
    onNavigate?.();
  };

  const isActive = (v: View) => {
    if (v.type !== view.type) return false;
    if (v.type === "group" && view.type === "group") return v.id === view.id;
    if (v.type === "friend" && view.type === "friend") return v.id === view.id;
    return v.type === view.type;
  };

  const navItem = (
    label: string,
    icon: React.ReactNode,
    v: View,
  ) => (
    <button
      type="button"
      onClick={() => go(v)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[15px] font-semibold transition-colors",
        isActive(v)
          ? "bg-accent text-accent-foreground"
          : "text-sw-charcoal hover:bg-muted",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-full flex-col gap-1 px-3 py-4">
      {navItem("Dashboard", <LayoutDashboard className="h-[18px] w-[18px]" />, {
        type: "dashboard",
      })}
      {navItem("Recent activity", <Activity className="h-[18px] w-[18px]" />, {
        type: "activity",
      })}
      {navItem("All expenses", <ReceiptText className="h-[18px] w-[18px]" />, {
        type: "all-expenses",
      })}
      {navItem("Pay", <Wallet className="h-[18px] w-[18px]" />, {
        type: "pay",
      })}
      {navItem("Recurring", <Repeat className="h-[18px] w-[18px]" />, {
        type: "recurring",
      })}
      {navItem("Friends", <Users className="h-[18px] w-[18px]" />, {
        type: "friends",
      })}

      <button
        type="button"
        onClick={() => {
          openModal({ kind: "askAi" });
          onNavigate?.();
        }}
        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[15px] font-semibold text-primary transition-colors hover:bg-muted"
      >
        <Sparkles className="h-[18px] w-[18px]" />
        <span>Ask mysplitwise</span>
      </button>

      {/* Groups */}
      <div className="mt-5 flex items-center justify-between px-3 pb-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Groups
        </span>
        <button
          type="button"
          onClick={() => openModal({ kind: "createGroup" })}
          className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
        >
          <Plus className="h-3 w-3" /> add
        </button>
      </div>
      <div className="flex flex-col">
        {state.groups.length === 0 && (
          <p className="px-3 py-1 text-[13px] text-muted-foreground">
            No groups yet
          </p>
        )}
        {state.groups.map((g) => {
          const Icon = GROUP_ICONS[g.type];
          const groupExpenses = baseExpenses.filter(
            (e) => e.groupId === g.id,
          );
          const net = summaryForUser(
            currentUser.id,
            g.memberIds.filter((m) => m !== currentUser.id),
            groupExpenses,
          ).net;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => go({ type: "group", id: g.id })}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors",
                isActive({ type: "group", id: g.id })
                  ? "bg-accent"
                  : "hover:bg-muted",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-sw-charcoal">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate text-[14px] font-semibold text-sw-charcoal">
                {g.name}
              </span>
              <BalanceTag net={net} currency={base} />
            </button>
          );
        })}
      </div>

      {/* Friends */}
      <div className="mt-5 flex items-center justify-between px-3 pb-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Friends
        </span>
        <button
          type="button"
          onClick={() => openModal({ kind: "addFriend" })}
          className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
        >
          <Plus className="h-3 w-3" /> add
        </button>
      </div>
      <div className="flex flex-col pb-4">
        {friends.length === 0 && (
          <p className="px-3 py-1 text-[13px] text-muted-foreground">
            No friends yet
          </p>
        )}
        {friends.map((f) => {
          const net = balanceBetween(currentUser.id, f.id, baseExpenses);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => go({ type: "friend", id: f.id })}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors",
                isActive({ type: "friend", id: f.id })
                  ? "bg-accent"
                  : "hover:bg-muted",
              )}
            >
              <UserAvatar user={f} size={28} />
              <span className="flex-1 truncate text-[14px] font-semibold text-sw-charcoal">
                {f.name}
              </span>
              <BalanceTag net={net} currency={base} />
            </button>
          );
        })}
      </div>

      {/* Invite */}
      <div className="mx-1 mb-4 mt-1 rounded-xl border border-dashed border-primary/40 bg-secondary/40 p-3">
        <p className="mb-2 text-[13px] font-bold text-sw-charcoal">
          Invite a friend
        </p>
        <InviteFriend />
      </div>
    </div>
  );
}
