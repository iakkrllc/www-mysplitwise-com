import { NextRequest, NextResponse } from "next/server";
import { requireCallerStaff, logActivity } from "@/lib/staff-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Department } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const result = await requireCallerStaff(req);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (!result.permissions.includes("manage_staff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("staff_members")
    .select("*")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

export async function POST(req: NextRequest) {
  const result = await requireCallerStaff(req);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (!result.permissions.includes("manage_staff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = body?.email as string | undefined;
  const department = body?.department as Department | undefined;
  if (!email || !department) {
    return NextResponse.json(
      { error: "email and department are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  // NOTE: MVP lookup — fine at current user counts, but listUsers is paginated
  // and doesn't support server-side email filtering, so this scans up to 1000
  // accounts. Revisit if the user base grows past that.
  const { data: usersPage, error: userErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });

  const target = usersPage.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!target) {
    return NextResponse.json(
      { error: "No mysplitwise account found with that email" },
      { status: 404 },
    );
  }

  const name = (target.user_metadata?.name as string) || target.email || "Staff member";
  const { error: insertErr } = await supabase.from("staff_members").upsert({
    user_id: target.id,
    name,
    email: target.email,
    department,
    status: "active",
  });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  await logActivity(
    result.user.id,
    "admin_action",
    `${result.staff.name} added ${target.email} to ${department}`,
  );

  return NextResponse.json({ ok: true });
}
