"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Menu,
  Plus,
  Scale,
  ChevronDown,
  RotateCcw,
  User2,
  LogOut,
  Moon,
  Sun,
  Search,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";
import { SidebarContent } from "./sidebar";
import { MysplitwiseLogo, MysplitwiseMark } from "./mysplitwise-logo";
import { Button } from "./ui/button";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { UserAvatar } from "./user-avatar";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsBell } from "./notifications-bell";

export function Header() {
  const { currentUser, setView, resetData } = useStore();
  const { openModal, setCommandOpen } = useUI();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-3 backdrop-blur sm:px-5">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="rounded-md p-2 text-sw-charcoal hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => setView({ type: "dashboard" })}
        className="flex items-center"
      >
        <span className="hidden sm:block">
          <MysplitwiseLogo size={26} />
        </span>
        <span className="sm:hidden">
          <MysplitwiseMark size={26} />
        </span>
      </button>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="ml-2 hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex"
      >
        <Search className="h-4 w-4" />
        <span>Search…</span>
        <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-bold">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="rounded-md p-2 text-sw-charcoal hover:bg-muted md:hidden"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>

      <Button
        variant="green"
        onClick={() => openModal({ kind: "addExpense" })}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add an expense</span>
        <span className="sm:hidden">Add</span>
      </Button>
      <Button
        variant="orange"
        onClick={() => openModal({ kind: "settle" })}
        className="gap-1.5"
      >
        <Scale className="h-4 w-4" />
        <span className="hidden sm:inline">Settle up</span>
      </Button>

      <div className="ml-1 flex items-center">
        <NotificationsBell />
        <ThemeToggle className="hidden sm:inline-flex" />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="ml-1 flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-muted"
          >
            <UserAvatar user={currentUser} size={34} />
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-3 py-2">
            <UserAvatar user={currentUser} size={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-sw-charcoal">
                {currentUser.name}
              </p>
              <p className="truncate text-xs font-normal text-muted-foreground">
                {currentUser.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setView({ type: "account" })}>
            <User2 className="mr-2 h-4 w-4" /> Your account
          </DropdownMenuItem>
          <DropdownMenuItem
            className="sm:hidden"
            onSelect={(e) => {
              e.preventDefault();
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
            }}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => resetData()}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset sample data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/")}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b px-4">
            <MysplitwiseLogo size={24} />
          </div>
          <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
