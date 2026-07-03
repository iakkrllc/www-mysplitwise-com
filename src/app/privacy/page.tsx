import type { Metadata } from "next";
import Link from "next/link";
import { MysplitwiseLogo } from "@/components/mysplitwise-logo";

export const metadata: Metadata = {
  title: "Privacy Policy · mysplitwise",
  description: "How mysplitwise collects, uses, and stores your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/" className="mb-8 inline-flex">
        <MysplitwiseLogo size={28} />
      </Link>

      <h1 className="text-3xl font-extrabold text-sw-charcoal">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-[15px] leading-relaxed text-sw-charcoal">
        <section>
          <h2 className="text-lg font-bold">Overview</h2>
          <p>
            mysplitwise (&quot;we,&quot; &quot;us&quot;) helps you track and split
            shared expenses with friends. This page explains, plainly, what data
            we collect, where it lives, and who can see it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">What we store on our servers</h2>
          <p>When you create an account, we store:</p>
          <ul className="list-disc pl-5">
            <li>Your email address and/or phone number (used to log in)</li>
            <li>Your display name</li>
            <li>Account timestamps: when you signed up and when you last logged in</li>
          </ul>
          <p className="mt-2">
            This account data is hosted by our infrastructure provider, Supabase,
            on secure servers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">What stays on your device</h2>
          <p>
            Your expenses, friends, groups, balances, and any payment handles
            (Venmo/PayPal/Cash App usernames) you enter are stored{" "}
            <strong>locally in your browser or app, on your device only</strong>{" "}
            — not on our servers. If you use mysplitwise on a different device,
            this data will not automatically appear there.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Login activity</h2>
          <p>
            We keep a basic log of account activity (sign-ups, logins, sign-outs)
            for security and support purposes. This log is only visible to
            authorized staff with a legitimate business need to access it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Optional features</h2>
          <ul className="list-disc pl-5">
            <li>
              <strong>Pay via Venmo/PayPal/Cash App:</strong> tapping "Pay" opens
              the relevant third-party app or site with an amount pre-filled. We
              don&apos;t process, receive, or see any payment or financial
              transaction data — that happens entirely within the third-party
              service, governed by their own privacy policy.
            </li>
            <li>
              <strong>Telegram update bot:</strong> if you choose to message our
              Telegram bot to get product updates, we store your Telegram chat
              ID so we can send you those messages. You can unsubscribe anytime
              by sending <code>/stop</code> to the bot.
            </li>
            <li>
              <strong>Profile photo:</strong> if you upload a profile picture, it
              is stored securely with our infrastructure provider and is publicly
              viewable via a non-guessable URL (the same way most apps handle
              avatar images).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">What we don&apos;t do</h2>
          <ul className="list-disc pl-5">
            <li>We don&apos;t sell your data to anyone.</li>
            <li>We don&apos;t show ads or use third-party ad-tracking SDKs.</li>
            <li>We don&apos;t access your contacts, photos, or location without your action.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">Your choices</h2>
          <p>
            You can edit or delete your locally-stored data at any time from
            Account settings (export a backup, or clear all data). To delete
            your account entirely, contact us using the details below and we
            will remove your account record from our servers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Contact</h2>
          <p>
            Questions about this policy? Reach us at{" "}
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
