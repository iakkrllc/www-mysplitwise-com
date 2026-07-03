import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer /, "");
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = data.user.id;

    // Log the deletion before removing the user (activity_log.user_id is
    // ON DELETE SET NULL, so this row survives with a null user_id afterward).
    await supabase.from("activity_log").insert({
      user_id: userId,
      event_type: "account_deleted",
      description: "Account permanently deleted by user",
    });

    // Remove any staff/admin access tied to this account.
    await supabase.from("staff_members").delete().eq("user_id", userId);

    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
