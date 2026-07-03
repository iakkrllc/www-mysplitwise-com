import type { Metadata } from "next";
import { StoreProvider } from "@/lib/store";
import { UIProvider } from "@/lib/ui-store";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";

export const metadata: Metadata = {
  title: "Dashboard · mysplitwise",
  description: "Track balances, split expenses and settle up.",
};

export default function AppPage() {
  return (
    <AuthGate>
      <StoreProvider>
        <UIProvider>
          <AppShell />
        </UIProvider>
      </StoreProvider>
    </AuthGate>
  );
}
