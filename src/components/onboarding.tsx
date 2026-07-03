"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useStore } from "@/lib/store";
import { CURRENCIES } from "@/lib/currency";
import { MysplitwiseLogo } from "./mysplitwise-logo";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export function Onboarding() {
  const { loaded, state, currentUser, updateProfile, setBaseCurrency, setOnboarded } =
    useStore();

  const open = loaded && !state.onboarded;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(currentUser?.name ?? "");
  const [currency, setCurrency] = useState(state.baseCurrency ?? "USD");

  const finish = () => {
    if (name.trim()) updateProfile({ name: name.trim() });
    setBaseCurrency(currency);
    setOnboarded(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setOnboarded(true)}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <MysplitwiseLogo size={24} />
          <div className="flex gap-1.5">
            {[0, 1].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-6 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-sw-charcoal">
                  Welcome to mysplitwise
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Let&apos;s set things up. First, what should we call you?
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-name">Your name</Label>
                <Input
                  id="ob-name"
                  value={name}
                  autoFocus
                  placeholder="e.g. Alex Morgan"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(1)}
                />
              </div>
              <Button
                variant="green"
                className="w-full"
                disabled={!name.trim()}
                onClick={() => setStep(1)}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-sw-charcoal">
                  Pick your currency
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Balances are shown in this currency. You can still log
                  expenses in others.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Base currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="font-semibold">{c.symbol}</span> {c.code}{" "}
                        — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setStep(0)}
                >
                  Back
                </Button>
                <Button variant="green" className="flex-1" onClick={finish}>
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
