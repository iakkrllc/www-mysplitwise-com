import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  rowToUser,
  rowToGroup,
  rowToExpense,
  rowToRecurring,
  type GroupRow,
} from "@/app/api/_lib/serialize";
import { materializeDueRecurring } from "@/app/api/_lib/recurring";
import type { Expense, RecurringExpense } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const callerId = user.id;

    // Normally created by /api/sync/claim-invites right after signup — this
    // is a defensive fallback in case that call hasn't happened yet.
    let { data: ownProfile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", callerId)
      .maybeSingle();
    if (!ownProfile) {
      const name =
        (user.user_metadata?.name as string | undefined) || user.email || user.phone || "You";
      const email = user.email ?? user.phone ?? "";
      const { data: created } = await admin
        .from("profiles")
        .insert({ id: callerId, name, email, onboarded: false })
        .select("*")
        .single();
      ownProfile = created;
    }
    if (!ownProfile) {
      return NextResponse.json({ error: "Couldn't load your profile" }, { status: 500 });
    }

    await materializeDueRecurring(admin, callerId);

    const { data: friendshipRows } = await admin
      .from("friendships")
      .select("user_a, user_b")
      .or(`user_a.eq.${callerId},user_b.eq.${callerId}`);
    const friendIds = (friendshipRows ?? []).map((f) =>
      f.user_a === callerId ? (f.user_b as string) : (f.user_a as string),
    );

    const { data: myMemberships } = await admin
      .from("group_members")
      .select("group_id")
      .eq("user_id", callerId);
    const groupIds = (myMemberships ?? []).map((m) => m.group_id as string);

    let groupRows: GroupRow[] = [];
    let allGroupMemberRows: { group_id: string; user_id: string }[] = [];
    if (groupIds.length > 0) {
      const [{ data: gRows }, { data: gmRows }] = await Promise.all([
        admin.from("groups").select("*").in("id", groupIds),
        admin.from("group_members").select("group_id, user_id").in("group_id", groupIds),
      ]);
      groupRows = (gRows ?? []) as GroupRow[];
      allGroupMemberRows = gmRows ?? [];
    }
    const coMemberIds = allGroupMemberRows.map((r) => r.user_id);

    const allUserIds = Array.from(new Set([callerId, ...friendIds, ...coMemberIds]));
    const { data: profileRows } = await admin.from("profiles").select("*").in("id", allUserIds);
    const users = (profileRows ?? []).map(rowToUser);

    const groups = groupRows.map((g) =>
      rowToGroup(
        g,
        allGroupMemberRows.filter((m) => m.group_id === g.id).map((m) => m.user_id),
      ),
    );

    const { data: myShareRows } = await admin
      .from("expense_shares")
      .select("expense_id")
      .eq("user_id", callerId);
    const expenseIds = new Set((myShareRows ?? []).map((r) => r.expense_id as string));
    if (groupIds.length > 0) {
      const { data: groupExpenseRows } = await admin
        .from("expenses")
        .select("id")
        .in("group_id", groupIds);
      for (const r of groupExpenseRows ?? []) expenseIds.add(r.id as string);
    }

    let expenses: Expense[] = [];
    if (expenseIds.size > 0) {
      const idList = [...expenseIds];
      const [{ data: expenseRows }, { data: shareRows }, { data: itemRows }, { data: commentRows }] =
        await Promise.all([
          admin.from("expenses").select("*").in("id", idList),
          admin
            .from("expense_shares")
            .select("expense_id, user_id, paid, owed")
            .in("expense_id", idList),
          admin.from("line_items").select("*").in("expense_id", idList).order("sort_order"),
          admin.from("expense_comments").select("*").in("expense_id", idList).order("created_at"),
        ]);

      const itemIds = (itemRows ?? []).map((it) => it.id as string);
      let participantRows: { line_item_id: string; user_id: string }[] = [];
      if (itemIds.length > 0) {
        const { data } = await admin
          .from("line_item_participants")
          .select("line_item_id, user_id")
          .in("line_item_id", itemIds);
        participantRows = data ?? [];
      }

      expenses = (expenseRows ?? []).map((row) => {
        const shares = (shareRows ?? []).filter((s) => s.expense_id === row.id);
        const items = (itemRows ?? [])
          .filter((it) => it.expense_id === row.id)
          .map((it) => ({
            ...it,
            participantIds: participantRows
              .filter((p) => p.line_item_id === it.id)
              .map((p) => p.user_id),
          }));
        const comments = (commentRows ?? []).filter((c) => c.expense_id === row.id);
        return rowToExpense(row, shares, items, comments);
      });
    }

    const { data: myRecurringShareRows } = await admin
      .from("recurring_expense_shares")
      .select("recurring_id")
      .eq("user_id", callerId);
    const recurringIds = new Set((myRecurringShareRows ?? []).map((r) => r.recurring_id as string));
    if (groupIds.length > 0) {
      const { data: groupRecurringRows } = await admin
        .from("recurring_expenses")
        .select("id")
        .in("group_id", groupIds);
      for (const r of groupRecurringRows ?? []) recurringIds.add(r.id as string);
    }

    let recurring: RecurringExpense[] = [];
    if (recurringIds.size > 0) {
      const idList = [...recurringIds];
      const [{ data: recurringRows }, { data: recShareRows }] = await Promise.all([
        admin.from("recurring_expenses").select("*").in("id", idList),
        admin
          .from("recurring_expense_shares")
          .select("recurring_id, user_id, paid, owed")
          .in("recurring_id", idList),
      ]);
      recurring = (recurringRows ?? []).map((row) =>
        rowToRecurring(row, (recShareRows ?? []).filter((s) => s.recurring_id === row.id)),
      );
    }

    return NextResponse.json({
      baseCurrency: ownProfile.base_currency,
      onboarded: ownProfile.onboarded,
      notificationsReadAt: ownProfile.notifications_read_at ?? undefined,
      users,
      groups,
      expenses,
      recurring,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
