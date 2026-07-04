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
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { InviteFriend } from "../invite-friend";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AddFriendDialog() {
  const { modal, closeModal } = useUI();
  const open = modal.kind === "addFriend";
  const { addFriend, setView } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setName("");
    setEmail("");
    setSaving(false);
    closeModal();
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Enter your friend's name");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter your friend's email — we use it to connect you if they're already on mysplitwise");
      return;
    }
    setSaving(true);
    try {
      const { id, status } = await addFriend(name, email);
      if (status === "connected") {
        toast.success(`${name.trim()} added — you're now connected!`);
      } else {
        toast.success(`${name.trim()} invited — you'll be connected as soon as they join mysplitwise`);
      }
      setView({ type: "friend", id });
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that friend");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add a friend</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="friend-name">Name</Label>
            <Input
              id="friend-name"
              placeholder="Friend's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="friend-email">Email</Label>
            <Input
              id="friend-email"
              type="email"
              placeholder="friend@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <p className="text-xs text-muted-foreground">
              If they already have a mysplitwise account, you&apos;ll be connected
              instantly. If not, we&apos;ll connect you as soon as they join.
            </p>
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Want to nudge them? Share the app link directly:
          </p>
          <InviteFriend />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="green" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add friend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
