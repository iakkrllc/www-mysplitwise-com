"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { MysplitwiseLogo } from "@/components/mysplitwise-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthTab = "email" | "phone";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [tab, setTab] = useState<AuthTab>("email");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <MysplitwiseLogo size={30} />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-extrabold text-sw-charcoal">
            {mode === "login" ? "Log in" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Welcome back — enter your details to continue."
              : "It's free. Start splitting expenses in seconds."}
          </p>

          <div className="mt-4 flex rounded-lg border border-border bg-muted/30 p-1">
            {(
              [
                { id: "email" as const, label: "Email" },
                { id: "phone" as const, label: "Phone" },
              ]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-sm font-bold transition-colors",
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "email" ? (
            <EmailAuthForm mode={mode} />
          ) : (
            <PhoneAuthForm mode={mode} />
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-bold text-primary hover:underline">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-bold text-primary hover:underline">
                  Log in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailAuthForm({ mode }: { mode: "login" | "signup" }) {
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (mode === "signup") {
      const { error } = await signUp(email, password, name.trim());
      setSubmitting(false);
      if (error) {
        setError(error);
        return;
      }
      setInfo("Check your email to confirm your account, then log in.");
      return;
    }

    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    router.push("/app");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="auth-name">Your name</Label>
          <Input
            id="auth-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Morgan"
            required
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="auth-password">Password</Label>
        <Input
          id="auth-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          minLength={6}
          required
        />
      </div>

      {error && <p className="text-sm font-medium text-owe">{error}</p>}
      {info && <p className="text-sm font-medium text-owed">{info}</p>}

      <Button
        type="submit"
        variant="green"
        size="lg"
        className="w-full"
        disabled={submitting}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "login" ? "Log in" : "Sign up"}
      </Button>
    </form>
  );
}

function PhoneAuthForm({ mode }: { mode: "login" | "signup" }) {
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim().startsWith("+")) {
      setError("Enter your number with country code, e.g. +1 555 123 4567");
      return;
    }
    setSubmitting(true);
    const { error } = await sendPhoneOtp(
      phone.trim(),
      mode === "signup" ? name.trim() : undefined,
    );
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setStep("code");
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await verifyPhoneOtp(phone.trim(), code.trim());
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    router.push("/app");
  };

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="mt-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the code we texted to <span className="font-semibold">{phone}</span>.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="auth-code">Verification code</Label>
          <Input
            id="auth-code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="123456"
            autoFocus
            required
          />
        </div>

        {error && <p className="text-sm font-medium text-owe">{error}</p>}

        <Button
          type="submit"
          variant="green"
          size="lg"
          className="w-full"
          disabled={submitting || code.length < 4}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify &amp; continue
        </Button>
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setCode("");
            setError(null);
          }}
          className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Use a different number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="mt-5 space-y-4">
      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="auth-phone-name">Your name</Label>
          <Input
            id="auth-phone-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Morgan"
            required
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="auth-phone">Phone number</Label>
        <Input
          id="auth-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 123 4567"
          required
        />
        <p className="text-xs text-muted-foreground">
          Include your country code, starting with +.
        </p>
      </div>

      {error && <p className="text-sm font-medium text-owe">{error}</p>}

      <Button
        type="submit"
        variant="green"
        size="lg"
        className="w-full"
        disabled={submitting}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Send code
      </Button>
    </form>
  );
}
