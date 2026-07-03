"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command";
import { useStore, type View } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import {
  LayoutDashboard,
  Activity,
  ReceiptText,
  Repeat,
  Users,
  User2,
  Plus,
  Scale,
  FolderPlus,
  UserPlus,
  Moon,
  Sun,
  Plane,
  Home,
  Heart,
  Folder,
  RotateCcw,
} from "lucide-react";
import type { GroupType } from "@/lib/types";

const GROUP_ICONS: Record<GroupType, typeof Home> = {
  home: Home,
  trip: Plane,
  couple: Heart,
  other: Folder,
};

export function CommandPalette() {
  const { state, currentUser, setView, resetData } = useStore();
  const { commandOpen, setCommandOpen, openModal } = useUI();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [commandOpen, setCommandOpen]);

  const run = (fn: () => void) => {
    setCommandOpen(false);
    // defer so the dialog closes before navigation/modal opens
    setTimeout(fn, 0);
  };

  const go = (v: View) => run(() => setView(v));

  const friends = state.users.filter((u) => u.id !== currentUser.id);

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => openModal({ kind: "addExpense" }))}>
            <Plus className="mr-2 h-4 w-4" /> Add an expense
          </CommandItem>
          <CommandItem onSelect={() => run(() => openModal({ kind: "settle" }))}>
            <Scale className="mr-2 h-4 w-4" /> Settle up
          </CommandItem>
          <CommandItem onSelect={() => run(() => openModal({ kind: "createGroup" }))}>
            <FolderPlus className="mr-2 h-4 w-4" /> Create a group
          </CommandItem>
          <CommandItem onSelect={() => run(() => openModal({ kind: "addFriend" }))}>
            <UserPlus className="mr-2 h-4 w-4" /> Add a friend
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
            }
          >
            {resolvedTheme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            Toggle {resolvedTheme === "dark" ? "light" : "dark"} mode
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => go({ type: "dashboard" })}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go({ type: "activity" })}>
            <Activity className="mr-2 h-4 w-4" /> Recent activity
          </CommandItem>
          <CommandItem onSelect={() => go({ type: "all-expenses" })}>
            <ReceiptText className="mr-2 h-4 w-4" /> All expenses
          </CommandItem>
          <CommandItem onSelect={() => go({ type: "recurring" })}>
            <Repeat className="mr-2 h-4 w-4" /> Recurring
          </CommandItem>
          <CommandItem onSelect={() => go({ type: "friends" })}>
            <Users className="mr-2 h-4 w-4" /> Friends
          </CommandItem>
          <CommandItem onSelect={() => go({ type: "account" })}>
            <User2 className="mr-2 h-4 w-4" /> Your account
          </CommandItem>
        </CommandGroup>

        {state.groups.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Groups">
              {state.groups.map((g) => {
                const Icon = GROUP_ICONS[g.type];
                return (
                  <CommandItem
                    key={g.id}
                    value={`group ${g.name}`}
                    onSelect={() => go({ type: "group", id: g.id })}
                  >
                    <Icon className="mr-2 h-4 w-4" /> {g.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {friends.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Friends">
              {friends.map((f) => (
                <CommandItem
                  key={f.id}
                  value={`friend ${f.name}`}
                  onSelect={() => go({ type: "friend", id: f.id })}
                >
                  <span
                    className="mr-2 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                    style={{ backgroundColor: f.avatarColor }}
                  >
                    {f.name[0]}
                  </span>
                  {f.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Danger zone">
          <CommandItem
            onSelect={() =>
              run(() => {
                if (window.confirm("Clear all your data? This can't be undone."))
                  resetData();
              })
            }
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Clear all data
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
