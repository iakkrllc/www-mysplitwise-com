import { NextRequest, NextResponse } from "next/server";
import { requireCallerStaff, logActivity } from "@/lib/staff-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Department } from "@/lib/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await requireCallerStaff(req);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (!result.permissions.includes("manage_staff")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const supabase = getSupabaseAdmin();

    const patch: { department?: Department; status?: "active" | "suspended" } = {};
    if (body?.department) patch.department = body.department;
    if (body?.status) patch.status = body.status;

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("staff_members").update(patch).eq("user_id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body?.permissionOverrides) {
      const overrides = body.permissionOverrides as Record<string, boolean>;
      for (const [key, granted] of Object.entries(overrides)) {
        await supabase
          .from("staff_permission_overrides")
          .upsert({ staff_user_id: id, permission_key: key, granted });
      }
    }

    await logActivity(
      result.user.id,
      "admin_action",
      `${result.staff.name} updated staff member ${id}`,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await requireCallerStaff(req);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (!result.permissions.includes("manage_staff")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (id === result.user.id) {
      return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("staff_members").delete().eq("user_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity(
      result.user.id,
      "admin_action",
      `${result.staff.name} removed staff member ${id}`,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
