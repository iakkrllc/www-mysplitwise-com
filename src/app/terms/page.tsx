import type { Metadata } from "next";
import Link from "next/link";
import { MysplitwiseLogo } from "@/components/mysplitwise-logo";

export const metadata: Metadata = {
  title: "Terms of Service · mysplitwise",
  description: "Terms for using mysplitwise.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/" className="mb-8 inline-flex">
        <MysplitwiseLogo size={28} />
      </Link>

      <h1 className="text-3xl font-extrabold text-sw-charcoal">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-[15px] leading-relaxed text-sw-charcoal">
        <section>
          <h2 className="text-lg font-bold">Using mysplitwise</h2>
          <p>
            mysplitwise is a free tool to help you track and split shared
            expenses with friends. By creating an account, you agree to these
            terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Not a payment processor</h2>
          <p>
            mysplitwise does not move, hold, or process money. Any "Pay" links
            (Venmo, PayPal, Cash App) simply open those third-party services —
            all actual payments happen entirely outside mysplitwise, subject to
            those services&apos; own terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Your data</h2>
          <p>
            Your expenses, groups, and friends are stored locally on your own
            device. We&apos;re not responsible for data loss if you clear your
            browser storage, uninstall the app, or switch devices without
            exporting a backup first. Use the backup/export feature in Account
            settings regularly if this data matters to you.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Acceptable use</h2>
          <p>
            Don&apos;t use mysplitwise for anything illegal, to harass others, or
            to attempt to disrupt or gain unauthorized access to our systems.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">No warranty</h2>
          <p>
            mysplitwise is provided "as is," without warranties of any kind. We
            do our best to keep it accurate and available, but we&apos;re not
            liable for damages arising from its use.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Changes</h2>
          <p>
            We may update these terms as the product evolves. Continued use
            after a change means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Contact</h2>
          <p>
            Questions? Reach us at{" "}
            <a href="mailto:iakkrllc@gmail.com" className="font-semibold text-primary hover:underline">
              iakkrllc@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
