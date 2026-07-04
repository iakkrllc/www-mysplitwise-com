import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assertShareParticipants, AuthzError } from "@/app/api/_lib/authz";
import { rowToRecurring } from "@/app/api/_lib/serialize";
import type { ExpenseShare } from "@/lib/types";

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();
  let insertedId: string | null = null;
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const callerId = user.id;

    const body = await req.json().catch(() => ({}));
    const shares: ExpenseShare[] = Array.isArray(body?.shares) ? body.shares : [];
    const groupId: string | null = body?.groupId ?? null;
    if (!body?.description || !shares.length) {
      return NextResponse.json({ error: "Missing description or shares" }, { status: 400 });
    }

    await assertShareParticipants(admin, callerId, shares.map((s) => s.userId), groupId);

    const { data: created, error } = await admin
      .from("recurring_expenses")
      .insert({
        description: body.description,
        amount: body.amount,
        currency: body.currency ?? "USD",
        category: body.category ?? "general",
        group_id: groupId,
        payer_id: body.payerId ?? callerId,
        created_by: callerId,
        frequency: body.frequency,
        start_date: body.startDate,
        next_due: body.nextDue,
        active: body.active ?? true,
      })
      .select("*")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Couldn't create recurring bill");
    insertedId = created.id;

    await admin.from("recurring_expense_shares").insert(
      shares.map((s) => ({ recurring_id: created.id, user_id: s.userId, paid: s.paid, owed: s.owed })),
    );

    const recurring = rowToRecurring(created, shares.map((s) => ({ user_id: s.userId, paid: s.paid, owed: s.owed })));
    return NextResponse.json({ recurring });
  } catch (err) {
    if (insertedId) {
      await admin.from("recurring_expenses").delete().eq("id", insertedId);
    }
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
