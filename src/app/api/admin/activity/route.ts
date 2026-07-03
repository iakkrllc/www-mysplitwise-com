import { NextRequest, NextResponse } from "next/server";
import { requireCallerStaff } from "@/lib/staff-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const result = await requireCallerStaff(req);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (!result.permissions.includes("view_activity_log")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: usersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (usersPage?.users ?? []).map((u) => [u.id, u.email ?? u.phone ?? u.id]),
  );

  const activity = (data ?? []).map((row) => ({
    ...row,
    user_label: row.user_id ? emailById.get(row.user_id) ?? row.user_id : null,
  }));

  return NextResponse.json({ activity });
}
