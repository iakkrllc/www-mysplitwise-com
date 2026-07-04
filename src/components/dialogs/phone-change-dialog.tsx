"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useAuth } from "@/lib/auth-store";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PhoneChangeDialog() {
  const { modal, closeModal } = useUI();
  const open = modal.kind === "changePhone";
  const { startPhoneChange, confirmPhoneChange } = useAuth();
  const { updateProfile } = useStore();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setStep("phone");
    setPhone("");
    setCode("");
    setError(null);
    setSubmitting(false);
    closeModal();
  };

  const sendCode = async () => {
    setError(null);
    if (!phone.trim().startsWith("+")) {
      setError("Enter your number with country code, e.g. +1 555 123 4567");
      return;
    }
    // Same normalization as login/signup so the same number always maps to
    // one canonical string, regardless of how it was typed.
    const normalized = "+" + phone.trim().replace(/\D/g, "");
    setPhone(normalized);
    setSubmitting(true);
    const { error } = await startPhoneChange(normalized);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setStep("code");
  };

  const verifyCode = async () => {
    setError(null);
    setSubmitting(true);
    const { error } = await confirmPhoneChange(phone.trim(), code.trim());
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    updateProfile({ phone });
    toast.success("Phone number updated");
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {step === "phone" ? "Change phone number" : "Enter verification code"}
          </DialogTitle>
        </DialogHeader>
        {step === "phone" ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-phone">New phone number</Label>
              <Input
                id="new-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll text a verification code to confirm it&apos;s really you.
              </p>
            </div>
            {error && <p className="text-sm font-medium text-owe">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enter the code we texted to <span className="font-semibold">{phone}</span>.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="phone-change-code">Verification code</Label>
              <Input
                id="phone-change-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && verifyCode()}
              />
            </div>
            {error && <p className="text-sm font-medium text-owe">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          {step === "phone" ? (
            <Button variant="green" onClick={sendCode} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
            </Button>
          ) : (
            <Button variant="green" onClick={verifyCode} disabled={submitting || code.length < 4}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
