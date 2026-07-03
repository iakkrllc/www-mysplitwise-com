import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Log in · mysplitwise",
  description: "Log in to your mysplitwise account.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
