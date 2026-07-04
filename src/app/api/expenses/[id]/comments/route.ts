import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const { id: expenseId } = await params;
    const callerId = user.id;

    const { data: expenseRow } = await admin
      .from("expenses")
      .select("id, group_id, created_by")
      .eq("id", expenseId)
      .maybeSingle();
    if (!expenseRow) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    const { data: myShare } = await admin
      .from("expense_shares")
      .select("user_id")
      .eq("expense_id", expenseId)
      .eq("user_id", callerId)
      .maybeSingle();
    let authorized = !!myShare || expenseRow.created_by === callerId;
    if (!authorized && expenseRow.group_id) {
      const { data: membership } = await admin
        .from("group_members")
        .select("user_id")
        .eq("group_id", expenseRow.group_id)
        .eq("user_id", callerId)
        .maybeSingle();
      authorized = !!membership;
    }
    if (!authorized) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const text: string = (body?.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Missing comment text" }, { status: 400 });

    const { data: created, error } = await admin
      .from("expense_comments")
      .insert({ expense_id: expenseId, user_id: callerId, text })
      .select("*")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Couldn't add comment");

    return NextResponse.json({
      comment: { id: created.id, userId: created.user_id, text: created.text, createdAt: created.created_at },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
