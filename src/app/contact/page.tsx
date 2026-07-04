import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { MysplitwiseLogo } from "@/components/mysplitwise-logo";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Contact us · mysplitwise",
  description: "Get in touch with the mysplitwise team.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/" className="mb-8 inline-flex">
          <MysplitwiseLogo size={28} />
        </Link>

        <h1 className="text-3xl font-extrabold text-sw-charcoal">Contact us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions, feedback, or need help with your account? We&apos;d love to hear from you.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-sw-charcoal">Email support</p>
              <a
                href="mailto:iakkrllc@gmail.com"
                className="text-sm font-semibold text-primary hover:underline"
              >
                iakkrllc@gmail.com
              </a>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            If you&apos;re a registered user, include your account&apos;s support
            reference ID (found on your Account page) so we can look up your
            account quickly.
          </p>
        </div>

        <div className="mt-6 text-sm text-muted-foreground">
          Looking for something else?{" "}
          <Link href="/privacy" className="font-semibold text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="font-semibold text-primary hover:underline">
            Terms of Service
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
