import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rowToExpense, rowToRecurring } from "@/app/api/_lib/serialize";
import { advanceDate, todayISO } from "@/lib/dates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const callerId = user.id;
    const { id: recurringId } = await params;

    const { data: row } = await admin
      .from("recurring_expenses")
      .select("*")
      .eq("id", recurringId)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "Recurring bill not found" }, { status: 404 });

    const { data: shareRows } = await admin
      .from("recurring_expense_shares")
      .select("user_id, paid, owed")
      .eq("recurring_id", recurringId);

    const isParticipant = (shareRows ?? []).some((s) => s.user_id === callerId);
    let authorized = isParticipant || row.created_by === callerId || row.payer_id === callerId;
    if (!authorized && row.group_id) {
      const { data: membership } = await admin
        .from("group_members")
        .select("user_id")
        .eq("group_id", row.group_id)
        .eq("user_id", callerId)
        .maybeSingle();
      authorized = !!membership;
    }
    if (!authorized) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const today = todayISO();
    const { data: expenseRow, error } = await admin
      .from("expenses")
      .insert({
        description: row.description,
        amount: row.amount,
        currency: row.currency,
        category: row.category,
        date: today,
        group_id: row.group_id,
        created_by: row.created_by,
        is_settlement: false,
        recurring_id: row.id,
      })
      .select("*")
      .single();
    if (error || !expenseRow) throw new Error(error?.message ?? "Couldn't log this bill");

    await admin.from("expense_shares").insert(
      (shareRows ?? []).map((s) => ({
        expense_id: expenseRow.id,
        user_id: s.user_id,
        paid: s.paid,
        owed: s.owed,
      })),
    );

    const nextDue = advanceDate(today, row.frequency);
    const { data: updatedRecurring } = await admin
      .from("recurring_expenses")
      .update({ next_due: nextDue })
      .eq("id", recurringId)
      .select("*")
      .single();

    return NextResponse.json({
      expense: rowToExpense(expenseRow, shareRows ?? [], [], []),
      recurring: updatedRecurring ? rowToRecurring(updatedRecurring, shareRows ?? []) : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
