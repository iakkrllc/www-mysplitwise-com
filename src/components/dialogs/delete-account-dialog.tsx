"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useUI } from "@/lib/ui-store";
import { useAuth } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function DeleteAccountDialog() {
  const { modal, closeModal } = useUI();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const open = modal.kind === "deleteAccount";

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const identifier = user?.email ?? user?.phone ?? "";
  const canDelete = confirmText.trim() === identifier && identifier.length > 0;

  const handleClose = () => {
    setConfirmText("");
    closeModal();
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to delete account");

      toast.success("Your account has been deleted");
      handleClose();
      await signOut();
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Delete your account
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm text-sw-charcoal">
          <p>This permanently deletes your mysplitwise login. This cannot be undone.</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>You will no longer be able to log in with this account.</li>
            <li>
              Expenses, friends, and groups stored in this browser will remain on
              this device, but you won&apos;t be able to sign back in to access
              them through the app.
            </li>
            <li>If you're a staff member, your admin access is removed too.</li>
          </ul>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="confirm-delete">
              Type <span className="font-bold">{identifier}</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={identifier}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canDelete || deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting…" : "Permanently delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
