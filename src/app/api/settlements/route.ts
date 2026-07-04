import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assertShareParticipants, AuthzError } from "@/app/api/_lib/authz";
import { rowToExpense } from "@/app/api/_lib/serialize";
import { round2 } from "@/lib/calculations";
import { todayISO } from "@/lib/dates";

interface Payment {
  fromId: string;
  toId: string;
  amount: number;
  currency: string;
  groupId: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const callerId = user.id;

    const body = await req.json().catch(() => ({}));
    const payments: Payment[] = Array.isArray(body?.payments) ? body.payments : [];
    if (payments.length === 0) return NextResponse.json({ expenses: [] });

    for (const p of payments) {
      await assertShareParticipants(admin, callerId, [p.fromId, p.toId], p.groupId);
    }

    const today = todayISO();
    const expenses = [];
    for (const p of payments) {
      const amount = round2(p.amount);
      const { data: expenseRow, error } = await admin
        .from("expenses")
        .insert({
          description: "Payment",
          amount,
          currency: p.currency,
          category: "payment",
          date: today,
          group_id: p.groupId,
          created_by: callerId,
          is_settlement: true,
        })
        .select("*")
        .single();
      if (error || !expenseRow) throw new Error(error?.message ?? "Couldn't record settlement");

      const shares = [
        { user_id: p.fromId, paid: amount, owed: 0 },
        { user_id: p.toId, paid: 0, owed: amount },
      ];
      await admin.from("expense_shares").insert(shares.map((s) => ({ expense_id: expenseRow.id, ...s })));
      expenses.push(rowToExpense(expenseRow, shares, [], []));
    }

    return NextResponse.json({ expenses });
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
