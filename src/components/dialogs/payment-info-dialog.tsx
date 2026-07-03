"use client";

import { useEffect, useState } from "react";
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
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { toast } from "sonner";

export function PaymentInfoDialog() {
  const { modal, closeModal } = useUI();
  const open = modal.kind === "paymentInfo";
  const userId = modal.kind === "paymentInfo" ? modal.userId : null;
  const { getUser, updateUser, currentUser } = useStore();
  const target = userId ? getUser(userId) : undefined;

  const [venmo, setVenmo] = useState("");
  const [paypal, setPaypal] = useState("");
  const [cashapp, setCashapp] = useState("");

  useEffect(() => {
    if (open && target) {
      setVenmo(target.venmo ?? "");
      setPaypal(target.paypal ?? "");
      setCashapp(target.cashapp ?? "");
    }
  }, [open, target]);

  const save = () => {
    if (!userId) return;
    updateUser(userId, {
      venmo: venmo.trim() || undefined,
      paypal: paypal.trim() || undefined,
      cashapp: cashapp.trim() || undefined,
    });
    toast.success("Payment info saved");
    closeModal();
  };

  const isMe = userId === currentUser.id;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isMe ? "Your payment info" : `${target?.name ?? "Friend"}'s payment info`}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Add usernames so mysplitwise Pay can link straight to{" "}
          {isMe ? "your" : "their"} Venmo, PayPal, or Cash App to settle up.
        </p>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pay-venmo">Venmo username</Label>
            <Input
              id="pay-venmo"
              placeholder="@username"
              value={venmo}
              onChange={(e) => setVenmo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-paypal">PayPal.me username</Label>
            <Input
              id="pay-paypal"
              placeholder="username"
              value={paypal}
              onChange={(e) => setPaypal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-cashapp">Cash App $cashtag</Label>
            <Input
              id="pay-cashapp"
              placeholder="$cashtag"
              value={cashapp}
              onChange={(e) => setCashapp(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="green" onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
