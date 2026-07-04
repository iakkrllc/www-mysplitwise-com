import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assertShareParticipants, AuthzError } from "@/app/api/_lib/authz";
import { rowToExpense } from "@/app/api/_lib/serialize";
import type { ExpenseShare, LineItem } from "@/lib/types";

async function assertCanTouchExpense(
  admin: ReturnType<typeof getSupabaseAdmin>,
  expenseId: string,
  callerId: string,
): Promise<{ groupId: string | null } | null> {
  const { data: expenseRow } = await admin
    .from("expenses")
    .select("id, group_id, created_by")
    .eq("id", expenseId)
    .maybeSingle();
  if (!expenseRow) return null;

  const { data: myShare } = await admin
    .from("expense_shares")
    .select("user_id")
    .eq("expense_id", expenseId)
    .eq("user_id", callerId)
    .maybeSingle();
  if (myShare || expenseRow.created_by === callerId) return { groupId: expenseRow.group_id };

  if (expenseRow.group_id) {
    const { data: membership } = await admin
      .from("group_members")
      .select("user_id")
      .eq("group_id", expenseRow.group_id)
      .eq("user_id", callerId)
      .maybeSingle();
    if (membership) return { groupId: expenseRow.group_id };
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = getSupabaseAdmin();
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: expenseId } = await params;

    const access = await assertCanTouchExpense(admin, expenseId, user.id);
    if (!access) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (typeof body.description === "string") patch.description = body.description;
    if (typeof body.amount === "number") patch.amount = body.amount;
    if (typeof body.currency === "string") patch.currency = body.currency;
    if (typeof body.category === "string") patch.category = body.category;
    if (typeof body.date === "string") patch.date = body.date;
    if (body.groupId !== undefined) patch.group_id = body.groupId;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.receiptUrl !== undefined) patch.receipt_url = body.receiptUrl;
    if (body.tax !== undefined) patch.tax = body.tax;
    if (body.tip !== undefined) patch.tip = body.tip;
    if (body.paymentMethod !== undefined) patch.payment_method = body.paymentMethod;

    const effectiveGroupId: string | null =
      body.groupId !== undefined ? body.groupId : access.groupId;

    if (Array.isArray(body.shares)) {
      const shares: ExpenseShare[] = body.shares;
      await assertShareParticipants(admin, user.id, shares.map((s) => s.userId), effectiveGroupId);
    }

    if (Object.keys(patch).length > 0) {
      await admin.from("expenses").update(patch).eq("id", expenseId);
    }

    if (Array.isArray(body.shares)) {
      await admin.from("expense_shares").delete().eq("expense_id", expenseId);
      await admin.from("expense_shares").insert(
        (body.shares as ExpenseShare[]).map((s) => ({
          expense_id: expenseId,
          user_id: s.userId,
          paid: s.paid,
          owed: s.owed,
        })),
      );
    }

    if (Array.isArray(body.items)) {
      await admin.from("line_items").delete().eq("expense_id", expenseId); // cascades participants
      const items: LineItem[] = body.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const { data: itemRow } = await admin
          .from("line_items")
          .insert({ expense_id: expenseId, name: item.name, amount: item.amount, sort_order: i })
          .select("id")
          .single();
        if (!itemRow || item.participantIds.length === 0) continue;
        await admin
          .from("line_item_participants")
          .insert(item.participantIds.map((userId) => ({ line_item_id: itemRow.id, user_id: userId })));
      }
    }

    const [{ data: expenseRow }, { data: shareRows }, { data: itemRows }, { data: commentRows }] =
      await Promise.all([
        admin.from("expenses").select("*").eq("id", expenseId).single(),
        admin.from("expense_shares").select("expense_id, user_id, paid, owed").eq("expense_id", expenseId),
        admin.from("line_items").select("*").eq("expense_id", expenseId).order("sort_order"),
        admin.from("expense_comments").select("*").eq("expense_id", expenseId).order("created_at"),
      ]);
    if (!expenseRow) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    const itemIds = (itemRows ?? []).map((it) => it.id as string);
    let participantRows: { line_item_id: string; user_id: string }[] = [];
    if (itemIds.length > 0) {
      const { data } = await admin
        .from("line_item_participants")
        .select("line_item_id, user_id")
        .in("line_item_id", itemIds);
      participantRows = data ?? [];
    }
    const items = (itemRows ?? []).map((it) => ({
      ...it,
      participantIds: participantRows.filter((p) => p.line_item_id === it.id).map((p) => p.user_id),
    }));

    const expense = rowToExpense(expenseRow, shareRows ?? [], items, commentRows ?? []);
    return NextResponse.json({ expense });
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
    const { id: expenseId } = await params;

    const access = await assertCanTouchExpense(admin, expenseId, user.id);
    if (!access) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    await admin.from("expenses").delete().eq("id", expenseId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
