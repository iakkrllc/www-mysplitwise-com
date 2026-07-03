"use client";

import { useStore } from "@/lib/store";
import { Header } from "./header";
import { SidebarContent } from "./sidebar";
import { DashboardView } from "./views/dashboard-view";
import { GroupView } from "./views/group-view";
import { FriendView } from "./views/friend-view";
import { ActivityView } from "./views/activity-view";
import { AllExpensesView } from "./views/all-expenses-view";
import { PayView } from "./views/pay-view";
import { RecurringView } from "./views/recurring-view";
import { FriendsView } from "./views/friends-view";
import { AccountView } from "./views/account-view";
import { CommandPalette } from "./command-palette";
import { AddExpenseDialog } from "./dialogs/add-expense-dialog";
import { SettleUpDialog } from "./dialogs/settle-up-dialog";
import { CreateGroupDialog } from "./dialogs/create-group-dialog";
import { AddFriendDialog } from "./dialogs/add-friend-dialog";
import { ExpenseDetailDialog } from "./dialogs/expense-detail-dialog";
import { PaymentInfoDialog } from "./dialogs/payment-info-dialog";
import { Toaster } from "./ui/sonner";
import { MysplitwiseMark } from "./mysplitwise-logo";

function ViewRouter() {
  const { view } = useStore();
  switch (view.type) {
    case "dashboard":
      return <DashboardView />;
    case "activity":
      return <ActivityView />;
    case "all-expenses":
      return <AllExpensesView />;
    case "pay":
      return <PayView />;
    case "recurring":
      return <RecurringView />;
    case "friends":
      return <FriendsView />;
    case "group":
      return <GroupView groupId={view.id} />;
    case "friend":
      return <FriendView friendId={view.id} />;
    case "account":
      return <AccountView />;
    default:
      return <DashboardView />;
  }
}

function LoadingState() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <MysplitwiseMark size={42} className="animate-pulse" />
      <p className="text-sm font-medium">Loading your expenses…</p>
    </div>
  );
}

export function AppShell() {
  const { loaded, view } = useStore();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[264px] shrink-0 overflow-y-auto border-r border-border bg-[hsl(var(--sw-faint))] lg:block">
          <SidebarContent />
        </aside>
        <main className="min-w-0 flex-1">
          <div key={JSON.stringify(view)} className="animate-fade-up">
            {loaded ? <ViewRouter /> : <LoadingState />}
          </div>
        </main>
      </div>

      <CommandPalette />
      <AddExpenseDialog />
      <SettleUpDialog />
      <CreateGroupDialog />
      <AddFriendDialog />
      <ExpenseDetailDialog />
      <PaymentInfoDialog />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
