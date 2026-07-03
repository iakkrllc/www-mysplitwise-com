"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { downloadFile } from "@/lib/export";
import { UserAvatar } from "../user-avatar";
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
import { Check, RotateCcw, Globe, Download, Upload } from "lucide-react";
import { toast } from "sonner";

const COLORS = [
  "#7C3AED", "#FF8A5B", "#6C8AE4", "#C566B5", "#E4694A",
  "#5BA0C5", "#7FB069", "#E4A85B", "#B05BC5", "#5BC5C0",
  "#E45B6E", "#9C7B5A",
];

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
    if (importState(text)) toast.success("Data restored from backup");
    else toast.error("That doesn't look like a valid backup file");
    if (fileRef.current) fileRef.current.value = "";
  };
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [color, setColor] = useState(currentUser.avatarColor);

  const dirty =
    name !== currentUser.name ||
    email !== currentUser.email ||
    color !== currentUser.avatarColor;

  const save = () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    updateProfile({ name: name.trim(), email: email.trim(), avatarColor: color });
    toast.success("Profile updated");
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-sw-charcoal sm:text-3xl">
        Your account
      </h1>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <UserAvatar user={{ name, avatarColor: color }} size={72} />
          <div>
            <p className="text-lg font-bold text-sw-charcoal">{name || "Your name"}</p>
            <p className="text-sm text-muted-foreground">{email || "your@email.com"}</p>
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
            <Input
              id="acc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
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

        <div className="mt-6 flex justify-end">
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

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Friends" value={state.users.length - 1} />
        <Stat label="Groups" value={state.groups.length} />
        <Stat label="Expenses" value={state.expenses.length} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-5">
        <h2 className="font-bold text-sw-charcoal">Data &amp; backup</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your data is stored locally in this browser only. Download a backup to
          keep it safe or move it to another device.
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
              if (!window.confirm("Clear all your data? This can't be undone.")) return;
              resetData();
              toast.success("All data cleared");
            }}
          >
            <RotateCcw className="h-4 w-4" /> Clear all data
          </Button>
        </div>
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
