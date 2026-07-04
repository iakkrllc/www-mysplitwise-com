import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assertShareParticipants, AuthzError } from "@/app/api/_lib/authz";
import { rowToGroup } from "@/app/api/_lib/serialize";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const callerId = user.id;

    const body = await req.json().catch(() => ({}));
    const name: string = (body?.name ?? "").trim();
    const type: string = body?.type ?? "other";
    const memberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds : [];
    if (!name) return NextResponse.json({ error: "Missing group name" }, { status: 400 });

    await assertShareParticipants(admin, callerId, memberIds, null);

    const { data: created, error } = await admin
      .from("groups")
      .insert({ name, type, created_by: callerId })
      .select("*")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Couldn't create group");

    const finalMemberIds = Array.from(new Set([callerId, ...memberIds]));
    await admin
      .from("group_members")
      .insert(finalMemberIds.map((userId) => ({ group_id: created.id, user_id: userId })));

    return NextResponse.json({ group: rowToGroup(created, finalMemberIds) });
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
