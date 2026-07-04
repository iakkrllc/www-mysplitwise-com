"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { downloadFile } from "@/lib/export";
import { uploadAvatar } from "@/lib/avatar-upload";
import { UserAvatar } from "../user-avatar";
import { InviteFriend } from "../invite-friend";
import { TrendsPanel } from "../trends-panel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  Check,
  RotateCcw,
  Globe,
  Download,
  Upload,
  Wallet,
  Camera,
  Loader2,
  X,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const COLORS = [
  "#7C3AED", "#FF8A5B", "#6C8AE4", "#C566B5", "#E4694A",
  "#5BA0C5", "#7FB069", "#E4A85B", "#B05BC5", "#5BC5C0",
  "#E45B6E", "#9C7B5A",
];

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export function AccountView() {
  const {
    currentUser,
    updateProfile,
    resetData,
    state,
    setBaseCurrency,
    exportState,
    importState,
  } = useStore();
  const { openModal } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);

  const backup = () => {
    downloadFile(
      `mysplitwise-backup-${new Date().toISOString().slice(0, 10)}.json`,
      exportState(),
      "application/json",
    );
    toast.success("Backup downloaded");
  };

  const onRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (!importState(text)) toast.error("That doesn't look like a valid backup file");
    if (fileRef.current) fileRef.current.value = "";
  };
  const [name, setName] = useState(currentUser.name);
  const [color, setColor] = useState(currentUser.avatarColor);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(currentUser.id, file);
      updateProfile({ avatarUrl: url });
      toast.success("Photo updated");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Couldn't upload photo: ${detail}`);
    }
    setAvatarUploading(false);
    if (photoRef.current) photoRef.current.value = "";
  };

  const removePhoto = () => {
    updateProfile({ avatarUrl: undefined });
    toast.success("Photo removed");
  };

  const dirty = name !== currentUser.name || color !== currentUser.avatarColor;

  const save = () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    updateProfile({ name: name.trim(), avatarColor: color });
    toast.success("Profile updated");
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-sw-charcoal sm:text-3xl">
        Your account
      </h1>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserAvatar
              user={{ name, avatarColor: color, avatarUrl: currentUser.avatarUrl }}
              size={72}
            />
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhoto}
            />
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
              aria-label="Change photo"
            >
              {avatarUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-sw-charcoal">{name || "Your name"}</p>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
            {currentUser.avatarUrl && (
              <button
                type="button"
                onClick={removePhoto}
                className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" /> Remove photo
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Name</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-email">Email</Label>
            <Input id="acc-email" type="email" value={currentUser.email} disabled />
            <p className="text-xs text-muted-foreground">
              This is your mysplitwise login — friends find you by it, so it can&apos;t
              be changed here.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Label>Avatar color</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-110",
                  color === c && "ring-2 ring-sw-charcoal",
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              >
                {color === c && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => openModal({ kind: "paymentInfo", userId: currentUser.id })}
          >
            <Wallet className="mr-2 h-4 w-4" /> mysplitwise Pay settings
          </Button>
          <Button variant="green" disabled={!dirty} onClick={save}>
            Save changes
          </Button>
        </div>
      </div>

      {/* Preferences */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-bold text-sw-charcoal">
          <Globe className="h-4 w-4 text-primary" /> Preferences
        </h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-sw-charcoal">
              Base currency
            </p>
            <p className="text-xs text-muted-foreground">
              Balances are shown converted to this currency.
            </p>
          </div>
          <Select value={state.baseCurrency} onValueChange={setBaseCurrency}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="font-semibold">{c.symbol}</span> {c.code} —{" "}
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Trends */}
      <div className="mt-6">
        <TrendsPanel />
      </div>

      {/* Invite + updates */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-bold text-sw-charcoal">Invite friends</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share mysplitwise with friends on WhatsApp or Telegram.
        </p>
        <InviteFriend className="mt-3" />

        {TELEGRAM_BOT_USERNAME && (
          <>
            <div className="my-4 h-px bg-border" />
            <h2 className="flex items-center gap-2 font-bold text-sw-charcoal">
              <Send className="h-4 w-4 text-primary" /> Get app updates
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow our Telegram bot for new feature announcements and
              updates.
            </p>
            <Button variant="outline" className="mt-3 gap-2" asChild>
              <a
                href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send className="h-4 w-4" /> Open @{TELEGRAM_BOT_USERNAME}
              </a>
            </Button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Friends" value={state.users.length - 1} />
        <Stat label="Groups" value={state.groups.length} />
        <Stat label="Expenses" value={state.expenses.length} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-5">
        <h2 className="font-bold text-sw-charcoal">Data &amp; backup</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your expenses, friends, and groups are saved online and shared with
          the people you split bills with. Download a backup any time as an
          extra copy, or resync if something looks out of date.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onRestore}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="green" className="gap-2" onClick={backup}>
            <Download className="h-4 w-4" /> Download backup
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Restore from file
          </Button>
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground"
            onClick={() => {
              resetData();
              toast.success("Resynced with the server");
            }}
          >
            <RotateCcw className="h-4 w-4" /> Resync data
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Resync only refreshes what&apos;s shown on this device — it doesn&apos;t delete
          anything from the shared history you and your friends can see.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="font-bold text-destructive">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete your mysplitwise login. This can&apos;t be undone.
        </p>
        <Button
          variant="destructive"
          className="mt-4 gap-2"
          onClick={() => openModal({ kind: "deleteAccount" })}
        >
          <Trash2 className="h-4 w-4" /> Delete account
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className="text-2xl font-extrabold text-sw-charcoal">{value}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
