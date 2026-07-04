import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const callerId = user.id;
    const { id: friendId } = await params;

    const [userA, userB] = pairKey(callerId, friendId);
    await admin.from("friendships").delete().eq("user_a", userA).eq("user_b", userB);

    // Remove the friend from any groups the caller and the friend are both in.
    const { data: myGroups } = await admin
      .from("group_members")
      .select("group_id")
      .eq("user_id", callerId);
    const groupIds = (myGroups ?? []).map((g) => g.group_id as string);
    if (groupIds.length > 0) {
      await admin
        .from("group_members")
        .delete()
        .eq("user_id", friendId)
        .in("group_id", groupIds);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
