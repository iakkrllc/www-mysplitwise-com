export type Department =
  | "owner"
  | "it"
  | "support"
  | "legal"
  | "finance"
  | "audit";

export const DEPARTMENTS: { id: Department; label: string }[] = [
  { id: "owner", label: "Business Owner" },
  { id: "it", label: "IT" },
  { id: "support", label: "Support" },
  { id: "legal", label: "Legal" },
  { id: "finance", label: "Finance" },
  { id: "audit", label: "Audit" },
];

export type PermissionKey =
  | "manage_staff"
  | "view_user_accounts"
  | "view_activity_log"
  | "view_payment_info";

export const PERMISSIONS: { id: PermissionKey; label: string; description: string }[] = [
  {
    id: "manage_staff",
    label: "Manage staff",
    description: "Add/remove employees, assign departments, change permissions.",
  },
  {
    id: "view_user_accounts",
    label: "View user accounts",
    description: "See registered accounts: name, email/phone, signup date.",
  },
  {
    id: "view_activity_log",
    label: "View activity log",
    description: "See login/logout history and admin actions across the system.",
  },
  {
    id: "view_payment_info",
    label: "View payment info",
    description: "See users' configured payment handles (Venmo/PayPal/Cash App), where available.",
  },
];

/** Default permission set per department. The owner can override per-employee. */
export const DEPARTMENT_DEFAULTS: Record<Department, PermissionKey[]> = {
  owner: ["manage_staff", "view_user_accounts", "view_activity_log", "view_payment_info"],
  it: ["manage_staff", "view_user_accounts", "view_activity_log"],
  support: ["view_user_accounts"],
  legal: ["view_user_accounts", "view_activity_log"],
  finance: ["view_payment_info"],
  audit: ["view_activity_log"],
};

export interface StaffMember {
  user_id: string;
  name: string;
  email: string;
  department: Department;
  status: "active" | "suspended";
  created_at: string;
}
