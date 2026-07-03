import type { Metadata } from "next";
import { AuthGate } from "@/components/auth-gate";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin · mysplitwise",
  description: "Internal staff admin dashboard.",
};

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminDashboard />
    </AuthGate>
  );
}
