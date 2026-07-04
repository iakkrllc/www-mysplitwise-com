import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assertShareParticipants, isGroupMember, AuthzError } from "@/app/api/_lib/authz";
import { rowToGroup } from "@/app/api/_lib/serialize";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const callerId = user.id;
    const { id: groupId } = await params;

    if (!(await isGroupMember(admin, groupId, callerId))) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.type === "string") patch.type = body.type;
    if (typeof body.simplifyDebts === "boolean") patch.simplify_debts = body.simplifyDebts;
    if (body.monthlyBudget !== undefined) patch.monthly_budget = body.monthlyBudget ?? null;

    if (Object.keys(patch).length > 0) {
      await admin.from("groups").update(patch).eq("id", groupId);
    }

    if (Array.isArray(body.memberIds)) {
      const memberIds: string[] = body.memberIds;
      await assertShareParticipants(admin, callerId, memberIds, groupId);
      const finalMemberIds = Array.from(new Set([callerId, ...memberIds]));
      const { data: currentMembers } = await admin
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);
      const currentIds = new Set((currentMembers ?? []).map((m) => m.user_id as string));
      const toAdd = finalMemberIds.filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !finalMemberIds.includes(id));
      if (toAdd.length > 0) {
        await admin
          .from("group_members")
          .insert(toAdd.map((userId) => ({ group_id: groupId, user_id: userId })));
      }
      if (toRemove.length > 0) {
        await admin
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .in("user_id", toRemove);
      }
    }

    const [{ data: group }, { data: members }] = await Promise.all([
      admin.from("groups").select("*").eq("id", groupId).single(),
      admin.from("group_members").select("user_id").eq("group_id", groupId),
    ]);
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    return NextResponse.json({
      group: rowToGroup(group, (members ?? []).map((m) => m.user_id as string)),
    });
  } catch (err) {
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const { id: groupId } = await params;

    if (!(await isGroupMember(admin, groupId, user.id))) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    await admin.from("groups").delete().eq("id", groupId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
