"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { useAdminAccess, callAdminApi } from "@/lib/use-admin-access";
import {
  DEPARTMENTS,
  PERMISSIONS,
  DEPARTMENT_DEFAULTS,
  type Department,
  type PermissionKey,
  type StaffMember,
} from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MysplitwiseMark } from "@/components/mysplitwise-logo";
import { Loader2, ShieldCheck, LogOut, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export function AdminDashboard() {
  const { loading, staff, permissions, error } = useAdminAccess();
  const { signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm font-medium">Checking access…</p>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-extrabold text-sw-charcoal">No admin access</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error === "Not a staff member"
            ? "Your account isn't set up as a staff member yet. Run the initial owner SQL from supabase/admin-schema.sql, or ask an admin to add you."
            : (error ?? "Something went wrong.")}
        </p>
        <Link href="/app" className="mt-2 text-sm font-bold text-primary hover:underline">
          ← Back to mysplitwise
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-5 py-3.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <MysplitwiseMark size={30} />
          <div>
            <p className="font-extrabold text-sw-charcoal">mysplitwise Admin</p>
            <p className="text-xs text-muted-foreground">
              {staff.name} ·{" "}
              <span className="font-semibold text-primary">
                {DEPARTMENTS.find((d) => d.id === staff.department)?.label}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {permissions.includes("manage_staff") && <StaffSection currentUserId={staff.user_id} />}
        {permissions.includes("view_user_accounts") && <UsersSection />}
        {permissions.includes("view_activity_log") && <ActivitySection />}
        {permissions.includes("view_payment_info") && <PaymentInfoSection />}
      </main>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-bold text-sw-charcoal">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StaffSection({ currentUserId }: { currentUserId: string }) {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<Department>("support");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    callAdminApi("/api/admin/staff")
      .then((json) => setStaff(json.staff))
      .catch((err) => toast.error(err.message));
  };

  useEffect(load, []);

  const addStaff = async () => {
    if (!email.trim()) {
      toast.error("Enter the employee's email");
      return;
    }
    setSubmitting(true);
    try {
      await callAdminApi("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), department }),
      });
      toast.success("Staff member added");
      setEmail("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add staff member");
    }
    setSubmitting(false);
  };

  const updateDepartment = async (userId: string, dept: Department) => {
    try {
      await callAdminApi(`/api/admin/staff/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ department: dept }),
      });
      toast.success("Department updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const removeStaff = async (userId: string) => {
    if (!window.confirm("Remove this staff member's admin access?")) return;
    try {
      await callAdminApi(`/api/admin/staff/${userId}`, { method: "DELETE" });
      toast.success("Staff member removed");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  return (
    <Card
      title="Staff members"
      subtitle="Give existing mysplitwise accounts a department and admin access."
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="employee@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.filter((d) => d.id !== "owner").map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="green" disabled={submitting} onClick={addStaff}>
          Add
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        The person must already have a mysplitwise account (sign up first, then add them here).
      </p>

      <div className="mt-5 space-y-2">
        {staff === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No staff members yet.</p>
        ) : (
          staff.map((s) => (
            <div key={s.user_id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-sw-charcoal">
                    {s.name}{" "}
                    {s.user_id === currentUserId && (
                      <span className="text-xs font-normal text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                </div>
                <Select
                  value={s.department}
                  onValueChange={(v) => updateDepartment(s.user_id, v as Department)}
                  disabled={s.department === "owner"}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === s.user_id ? null : s.user_id)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Permissions
                </button>
                {s.department !== "owner" && s.user_id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => removeStaff(s.user_id)}
                    className="text-xs font-bold text-destructive hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              {expanded === s.user_id && (
                <PermissionOverrides staff={s} onSaved={load} />
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function PermissionOverrides({ staff, onSaved }: { staff: StaffMember; onSaved: () => void }) {
  const defaults = new Set(DEPARTMENT_DEFAULTS[staff.department]);
  const [checked, setChecked] = useState<Record<PermissionKey, boolean>>(() => {
    const init = {} as Record<PermissionKey, boolean>;
    for (const p of PERMISSIONS) init[p.id] = defaults.has(p.id);
    return init;
  });

  const save = async () => {
    try {
      await callAdminApi(`/api/admin/staff/${staff.user_id}`, {
        method: "PATCH",
        body: JSON.stringify({ permissionOverrides: checked }),
      });
      toast.success("Permissions updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {PERMISSIONS.map((p) => (
        <label key={p.id} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={checked[p.id]}
            onChange={(e) => setChecked((c) => ({ ...c, [p.id]: e.target.checked }))}
          />
          <span>
            <span className="font-semibold text-sw-charcoal">{p.label}</span>
            <span className="block text-xs text-muted-foreground">{p.description}</span>
          </span>
        </label>
      ))}
      <Button variant="outline" size="sm" onClick={save}>
        Save permissions
      </Button>
    </div>
  );
}

interface AppUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

function UsersSection() {
  const [users, setUsers] = useState<AppUser[] | null>(null);

  useEffect(() => {
    callAdminApi("/api/admin/users")
      .then((json) => setUsers(json.users))
      .catch((err) => toast.error(err.message));
  }, []);

  return (
    <Card
      title="User accounts"
      subtitle="Account-level info only — expenses, friends and balances live in each user's own browser, not here."
    >
      {users === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-3">Name</th>
                <th className="pb-2 pr-3">Email / phone</th>
                <th className="pb-2 pr-3">Signed up</th>
                <th className="pb-2">Last login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60">
                  <td className="py-2 pr-3">{u.name ?? "—"}</td>
                  <td className="py-2 pr-3">{u.email ?? u.phone ?? "—"}</td>
                  <td className="py-2 pr-3">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-2">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

interface ActivityRow {
  id: number;
  user_label: string | null;
  event_type: string;
  description: string | null;
  created_at: string;
}

function ActivitySection() {
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    callAdminApi("/api/admin/activity")
      .then((json) => setActivity(json.activity))
      .catch((err) => toast.error(err.message));
  }, []);

  return (
    <Card title="Activity log" subtitle="Signups, logins, sign-outs, and admin actions.">
      {activity === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <div className="max-h-96 space-y-1 overflow-y-auto">
          {activity.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 text-sm">
              <div className="min-w-0">
                <span className="font-semibold uppercase text-xs text-primary">{a.event_type}</span>{" "}
                <span className="text-sw-charcoal">{a.description}</span>
                {a.user_label && (
                  <span className="text-muted-foreground"> · {a.user_label}</span>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PaymentInfoSection() {
  return (
    <Card title="Payment info" subtitle="Finance access">
      <p className="text-sm text-muted-foreground">
        There's no centrally-stored payment data yet — users' Venmo/PayPal/Cash App
        handles live in each person's own browser, not in a shared database. This
        section will populate once account data is moved to central storage.
      </p>
    </Card>
  );
}
