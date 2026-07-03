import Link from "next/link";
import { MysplitwiseLogo, MysplitwiseMark } from "@/components/mysplitwise-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Wallet,
  Users,
  Globe,
  PieChart,
  Repeat,
  Percent,
  ArrowRight,
  Check,
  ReceiptText,
  Scale,
} from "lucide-react";

const FEATURES = [
  {
    icon: Wallet,
    title: "Track balances",
    body: "See exactly who owes who at a glance, with live totals across every friend and group.",
    color: "#7C3AED",
  },
  {
    icon: Percent,
    title: "Split any way",
    body: "Divide bills equally, by exact amounts, by percentages, or by shares — whatever's fair.",
    color: "#FF8A5B",
  },
  {
    icon: Users,
    title: "Organize in groups",
    body: "Create groups for trips, apartments, couples and more. Keep every shared cost together.",
    color: "#6C8AE4",
  },
  {
    icon: Globe,
    title: "Multi-currency",
    body: "Log expenses in 14 currencies. Balances convert automatically to your home currency.",
    color: "#C566B5",
  },
  {
    icon: PieChart,
    title: "Insightful charts",
    body: "Visualize your spending by category and watch your balance trend over time.",
    color: "#E4A85B",
  },
  {
    icon: Repeat,
    title: "Recurring expenses",
    body: "Rent, utilities and subscriptions add themselves on a weekly, monthly or yearly schedule.",
    color: "#5BA0C5",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Add an expense",
    body: "Enter what you paid and who shared it. Attach a receipt and a note if you like.",
  },
  {
    n: "2",
    title: "We do the math",
    body: "Balances update instantly and simplify across all your groups and friends.",
  },
  {
    n: "3",
    title: "Settle up",
    body: "Record a payment to clear the balance. Everyone stays on the same page.",
  },
];

const btnGreen =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--sw-green-strong))] px-5 py-3 text-[15px] font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-[15px] font-bold text-sw-charcoal transition-colors hover:bg-muted";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-sw-charcoal">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <MysplitwiseLogo size={28} />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-sw-charcoal md:flex">
            <a href="#features" className="hover:text-primary">
              Features
            </a>
            <a href="#how" className="hover:text-primary">
              How it works
            </a>
            <a href="#faq" className="hover:text-primary">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/app"
              className="hidden rounded-lg px-4 py-2 text-sm font-bold text-sw-charcoal hover:bg-muted sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--sw-green-strong))] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:brightness-105"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* decorative blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #7C3AED, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #FF8A5B, transparent 70%)" }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
              <Scale className="h-3.5 w-3.5" /> Fair splits, zero awkwardness
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Sharing expenses,
              <br />
              minus the{" "}
              <span className="text-primary">awkward math.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              mysplitwise keeps track of shared costs with friends, roommates,
              trips and groups — so everyone knows who owes who, and settling up
              is effortless.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/app" className={btnGreen}>
                Get started — it&apos;s free <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className={btnGhost}>
                See features
              </a>
            </div>
            <div className="mt-6 flex items-center gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary" /> No sign-up needed
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary" /> Works offline
              </span>
            </div>
          </div>

          {/* App mock */}
          <div className="relative animate-fade-up [animation-delay:120ms]">
            <HeroMock />
          </div>
        </div>

        {/* stats strip */}
        <div className="border-y border-border bg-[hsl(var(--sw-faint))]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:px-6">
            {[
              { k: "14", v: "currencies supported" },
              { k: "4", v: "ways to split a bill" },
              { k: "∞", v: "groups & friends" },
              { k: "100%", v: "private — stays on device" },
            ].map((s) => (
              <div key={s.v} className="text-center">
                <div className="text-3xl font-black text-sw-charcoal">{s.k}</div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Everything you need to split fairly
          </h2>
          <p className="mt-3 text-muted-foreground">
            From a quick dinner to a months-long lease — mysplitwise handles it.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${f.color}22`, color: f.color }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-[hsl(var(--sw-faint))]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Settle up in three simple steps
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-border bg-card p-7"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--sw-green-strong))] text-lg font-black text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-black tracking-tight sm:text-4xl">
          Questions, answered
        </h2>
        <div className="mt-10 space-y-4">
          {[
            {
              q: "Is it really free?",
              a: "Yes. mysplitwise is free to use — create an account and start splitting expenses with friends.",
            },
            {
              q: "Can I split a bill unequally?",
              a: "Absolutely. Split equally, by exact amounts, by percentages, or by shares.",
            },
            {
              q: "Does it handle different currencies?",
              a: "Log expenses in any of 14 currencies and your balances convert automatically.",
            },
            {
              q: "What about rent and subscriptions?",
              a: "Mark any expense as recurring and it will be added automatically every week, month or year.",
            },
          ].map((item) => (
            <div
              key={item.q}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <h3 className="font-bold">{item.q}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[hsl(var(--sw-green-dark))] px-8 py-16 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, #ffffff55, transparent 40%), radial-gradient(circle at 80% 60%, #ffffff33, transparent 40%)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Less stress when sharing expenses.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">
              Join in seconds and never chase a friend for money again.
            </p>
            <Link
              href="/app"
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 text-[15px] font-extrabold text-[hsl(var(--sw-green-dark))] shadow-lg transition-transform hover:scale-[1.03]"
            >
              Get started — it&apos;s free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <MysplitwiseLogo size={26} />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The easiest way to share expenses with friends and family and stop
              stressing about “who owes who.”
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how" },
              { label: "Open the app", href: "/app" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "About", href: "#" },
              { label: "Blog", href: "#" },
              { label: "Contact", href: "#" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
            ]}
          />
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <span>© 2026 mysplitwise. All rights reserved.</span>
            <span className="flex items-center gap-1.5">
              <MysplitwiseMark size={16} /> Built with care
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sw-charcoal hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroMock() {
  return (
    <div className="relative">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <MysplitwiseLogo size={22} />
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase text-primary">
            Dashboard
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-border">
          <div className="border-r border-border p-3">
            <div className="text-[9px] font-bold uppercase text-muted-foreground">
              Total
            </div>
            <div className="text-base font-black text-owed">+$196.85</div>
          </div>
          <div className="border-r border-border p-3">
            <div className="text-[9px] font-bold uppercase text-muted-foreground">
              You owe
            </div>
            <div className="text-base font-black text-owe">$249.76</div>
          </div>
          <div className="p-3">
            <div className="text-[9px] font-bold uppercase text-muted-foreground">
              You're owed
            </div>
            <div className="text-base font-black text-owed">$446.61</div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <MockRow name="Harry Hughes" sub="owes you" amount="+$136.61" owed initials="HH" color="#E4694A" />
          <MockRow name="Marcel Proust" sub="you owe" amount="-$249.76" initials="MP" color="#FF8A5B" />
          <MockRow name="Ada Lovelace" sub="owes you" amount="+$110.00" owed initials="AL" color="#C566B5" />
        </div>
      </div>

      {/* floating pills */}
      <div className="absolute -right-3 -top-4 hidden rotate-3 items-center gap-2 rounded-xl bg-[hsl(var(--sw-green-strong))] px-3 py-2 text-xs font-bold text-white shadow-lg sm:flex">
        <ReceiptText className="h-4 w-4" /> Add an expense
      </div>
      <div className="absolute -bottom-4 -left-3 hidden -rotate-2 items-center gap-2 rounded-xl bg-[hsl(var(--sw-orange))] px-3 py-2 text-xs font-bold text-white shadow-lg sm:flex">
        <Scale className="h-4 w-4" /> Settle up
      </div>
    </div>
  );
}

function MockRow({
  name,
  sub,
  amount,
  owed,
  initials,
  color,
}: {
  name: string;
  sub: string;
  amount: string;
  owed?: boolean;
  initials: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        <div
          className={`text-[11px] font-medium ${owed ? "text-owed" : "text-owe"}`}
        >
          {sub}
        </div>
      </div>
      <span className={`text-sm font-black ${owed ? "text-owed" : "text-owe"}`}>
        {amount}
      </span>
    </div>
  );
}
