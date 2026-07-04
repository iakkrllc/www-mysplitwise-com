import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rowToUser } from "@/app/api/_lib/serialize";

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const callerId = user.id;

    const body = await req.json().catch(() => ({}));
    const name: string = (body?.name ?? "").trim();
    const email: string = (body?.email ?? "").trim().toLowerCase();
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const { data: existing } = await admin
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (existing && existing.id === callerId) {
      return NextResponse.json({ error: "That's your own email" }, { status: 400 });
    }

    let targetProfile = existing;
    let status: "connected" | "invited";

    if (existing) {
      status = existing.is_placeholder ? "invited" : "connected";
    } else {
      const { data: created } = await admin
        .from("profiles")
        .insert({ id: crypto.randomUUID(), email, name, is_placeholder: true })
        .select("*")
        .single();
      if (!created) {
        return NextResponse.json({ error: "Couldn't add that friend" }, { status: 500 });
      }
      targetProfile = created;
      status = "invited";
    }

    const [userA, userB] = pairKey(callerId, targetProfile.id);
    await admin
      .from("friendships")
      .upsert(
        { user_a: userA, user_b: userB, created_by: callerId },
        { onConflict: "user_a,user_b", ignoreDuplicates: true },
      );

    return NextResponse.json({ status, friend: rowToUser(targetProfile) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
