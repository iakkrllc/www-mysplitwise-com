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
import { toast } from "sonner";

export function AddFriendDialog() {
  const { modal, closeModal } = useUI();
  const open = modal.kind === "addFriend";
  const { addFriend, setView } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const close = () => {
    setName("");
    setEmail("");
    closeModal();
  };

  const save = () => {
    if (!name.trim()) {
      toast.error("Enter your friend's name");
      return;
    }
    const id = addFriend(name, email || `${name.trim().toLowerCase().replace(/\s+/g, ".")}@friends.app`);
    toast.success(`${name.trim()} added`);
    setView({ type: "friend", id });
    close();
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
            <Label htmlFor="friend-email">Email (optional)</Label>
            <Input
              id="friend-email"
              type="email"
              placeholder="friend@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Not on mysplitwise yet? Invite them instead:
          </p>
          <InviteFriend />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="green" onClick={save}>
            Add friend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
