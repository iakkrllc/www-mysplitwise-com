"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { MysplitwiseMark } from "@/components/mysplitwise-logo";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <MysplitwiseMark size={42} className="animate-pulse" />
        <p className="text-sm font-medium">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
