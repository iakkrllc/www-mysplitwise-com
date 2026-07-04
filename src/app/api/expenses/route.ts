import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assertShareParticipants, AuthzError } from "@/app/api/_lib/authz";
import { rowToExpense } from "@/app/api/_lib/serialize";
import type { ExpenseShare, LineItem } from "@/lib/types";

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();
  let insertedExpenseId: string | null = null;
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const callerId = user.id;

    const body = await req.json().catch(() => ({}));
    const shares: ExpenseShare[] = Array.isArray(body?.shares) ? body.shares : [];
    const items: LineItem[] = Array.isArray(body?.items) ? body.items : [];
    const groupId: string | null = body?.groupId ?? null;
    if (!body?.description || !shares.length) {
      return NextResponse.json({ error: "Missing description or shares" }, { status: 400 });
    }

    await assertShareParticipants(
      admin,
      callerId,
      shares.map((s) => s.userId),
      groupId,
    );

    const { data: expenseRow, error } = await admin
      .from("expenses")
      .insert({
        description: body.description,
        amount: body.amount,
        currency: body.currency ?? "USD",
        category: body.category ?? "general",
        date: body.date,
        group_id: groupId,
        created_by: callerId,
        is_settlement: !!body.isSettlement,
        notes: body.notes ?? null,
        receipt_url: body.receiptUrl ?? null,
        recurring_id: body.recurringId ?? null,
        tax: body.tax ?? null,
        tip: body.tip ?? null,
        payment_method: body.paymentMethod ?? null,
      })
      .select("*")
      .single();
    if (error || !expenseRow) throw new Error(error?.message ?? "Couldn't create expense");
    insertedExpenseId = expenseRow.id;

    await admin.from("expense_shares").insert(
      shares.map((s) => ({
        expense_id: expenseRow.id,
        user_id: s.userId,
        paid: s.paid,
        owed: s.owed,
      })),
    );

    const insertedItems: { id: string; name: string; amount: number; participantIds: string[] }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { data: itemRow } = await admin
        .from("line_items")
        .insert({ expense_id: expenseRow.id, name: item.name, amount: item.amount, sort_order: i })
        .select("id")
        .single();
      if (!itemRow) continue;
      if (item.participantIds.length > 0) {
        await admin
          .from("line_item_participants")
          .insert(item.participantIds.map((userId) => ({ line_item_id: itemRow.id, user_id: userId })));
      }
      insertedItems.push({ id: itemRow.id, name: item.name, amount: item.amount, participantIds: item.participantIds });
    }

    const expense = rowToExpense(expenseRow, shares.map((s) => ({ user_id: s.userId, paid: s.paid, owed: s.owed })), insertedItems, []);
    return NextResponse.json({ expense });
  } catch (err) {
    if (insertedExpenseId) {
      await admin.from("expenses").delete().eq("id", insertedExpenseId);
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
