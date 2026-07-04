import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assertShareParticipants, AuthzError } from "@/app/api/_lib/authz";
import { rowToRecurring } from "@/app/api/_lib/serialize";
import type { ExpenseShare } from "@/lib/types";

async function assertCanTouchRecurring(
  admin: ReturnType<typeof getSupabaseAdmin>,
  recurringId: string,
  callerId: string,
): Promise<{ groupId: string | null } | null> {
  const { data: row } = await admin
    .from("recurring_expenses")
    .select("id, group_id, created_by, payer_id")
    .eq("id", recurringId)
    .maybeSingle();
  if (!row) return null;

  const { data: myShare } = await admin
    .from("recurring_expense_shares")
    .select("user_id")
    .eq("recurring_id", recurringId)
    .eq("user_id", callerId)
    .maybeSingle();
  if (myShare || row.created_by === callerId || row.payer_id === callerId) {
    return { groupId: row.group_id };
  }
  if (row.group_id) {
    const { data: membership } = await admin
      .from("group_members")
      .select("user_id")
      .eq("group_id", row.group_id)
      .eq("user_id", callerId)
      .maybeSingle();
    if (membership) return { groupId: row.group_id };
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
    const { id: recurringId } = await params;

    const access = await assertCanTouchRecurring(admin, recurringId, user.id);
    if (!access) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (typeof body.description === "string") patch.description = body.description;
    if (typeof body.amount === "number") patch.amount = body.amount;
    if (typeof body.currency === "string") patch.currency = body.currency;
    if (typeof body.category === "string") patch.category = body.category;
    if (body.groupId !== undefined) patch.group_id = body.groupId;
    if (typeof body.payerId === "string") patch.payer_id = body.payerId;
    if (typeof body.frequency === "string") patch.frequency = body.frequency;
    if (typeof body.startDate === "string") patch.start_date = body.startDate;
    if (typeof body.nextDue === "string") patch.next_due = body.nextDue;
    if (typeof body.active === "boolean") patch.active = body.active;

    const effectiveGroupId: string | null =
      body.groupId !== undefined ? body.groupId : access.groupId;

    if (Array.isArray(body.shares)) {
      const shares: ExpenseShare[] = body.shares;
      await assertShareParticipants(admin, user.id, shares.map((s) => s.userId), effectiveGroupId);
    }

    if (Object.keys(patch).length > 0) {
      await admin.from("recurring_expenses").update(patch).eq("id", recurringId);
    }
    if (Array.isArray(body.shares)) {
      await admin.from("recurring_expense_shares").delete().eq("recurring_id", recurringId);
      await admin.from("recurring_expense_shares").insert(
        (body.shares as ExpenseShare[]).map((s) => ({
          recurring_id: recurringId,
          user_id: s.userId,
          paid: s.paid,
          owed: s.owed,
        })),
      );
    }

    const [{ data: row }, { data: shareRows }] = await Promise.all([
      admin.from("recurring_expenses").select("*").eq("id", recurringId).single(),
      admin.from("recurring_expense_shares").select("recurring_id, user_id, paid, owed").eq("recurring_id", recurringId),
    ]);
    if (!row) return NextResponse.json({ error: "Recurring bill not found" }, { status: 404 });

    return NextResponse.json({ recurring: rowToRecurring(row, shareRows ?? []) });
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
    const { id: recurringId } = await params;

    const access = await assertCanTouchRecurring(admin, recurringId, user.id);
    if (!access) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    await admin.from("recurring_expenses").delete().eq("id", recurringId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
