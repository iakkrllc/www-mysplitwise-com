import { getSupabaseAdmin } from "./supabase-admin";
import { DEPARTMENT_DEFAULTS, type PermissionKey, type StaffMember } from "./permissions";

export async function getStaffMember(userId: string): Promise<StaffMember | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("staff_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as StaffMember | null;
}

export async function getEffectivePermissions(
  staff: StaffMember,
): Promise<PermissionKey[]> {
  const supabase = getSupabaseAdmin();
  const { data: overrides } = await supabase
    .from("staff_permission_overrides")
    .select("permission_key, granted")
    .eq("staff_user_id", staff.user_id);

  const effective = new Set<PermissionKey>(DEPARTMENT_DEFAULTS[staff.department]);
  for (const o of overrides ?? []) {
    if (o.granted) effective.add(o.permission_key as PermissionKey);
    else effective.delete(o.permission_key as PermissionKey);
  }
  return Array.from(effective);
}

interface StaffContext {
  user: { id: string; email?: string };
  staff: StaffMember;
  permissions: PermissionKey[];
}

/** Verify the caller's bearer token belongs to an active staff member. */
export async function requireCallerStaff(
  req: Request,
): Promise<StaffContext | { error: string; status: 401 | 403 }> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) return { error: "Missing authorization", status: 401 };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { error: "Invalid session", status: 401 };

  const staff = await getStaffMember(data.user.id);
  if (!staff || staff.status !== "active") {
    return { error: "Not a staff member", status: 403 };
  }
  const permissions = await getEffectivePermissions(staff);
  return { user: data.user, staff, permissions };
}

export async function logActivity(
  userId: string | null,
  eventType: string,
  description?: string,
  metadata?: Record<string, unknown>,
) {
  const supabase = getSupabaseAdmin();
  await supabase.from("activity_log").insert({
    user_id: userId,
    event_type: eventType,
    description,
    metadata,
  });
}
