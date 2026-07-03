import type { Metadata } from "next";
import { StoreProvider } from "@/lib/store";
import { UIProvider } from "@/lib/ui-store";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Dashboard · mysplitwise",
  description: "Track balances, split expenses and settle up.",
};

export default function AppPage() {
  return (
    <StoreProvider>
      <UIProvider>
        <AppShell />
      </UIProvider>
    </StoreProvider>
  );
}
