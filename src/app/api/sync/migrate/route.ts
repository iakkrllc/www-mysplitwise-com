import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AppState } from "@/lib/types";

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * One-time upload of a user's existing local (localStorage-only) data. For
 * every locally-fabricated "friend" record: real-account matches get
 * re-attributed (this is what recovers a shared expense once the OTHER
 * party also migrates); unmatched ones become placeholder profiles exactly
 * like a fresh add-by-email would create, so nothing is lost either way.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const callerId = user.id;

    const body = await req.json().catch(() => ({}));
    const state: AppState | undefined = body?.state;
    if (!state || !Array.isArray(state.users)) {
      return NextResponse.json({ error: "Missing local state to migrate" }, { status: 400 });
    }

    const idMap = new Map<string, string>();
    idMap.set(state.currentUserId, callerId);

    let connected = 0;
    let invited = 0;

    for (const u of state.users) {
      if (u.id === state.currentUserId) continue;
      const rawEmail = (u.email ?? "").trim().toLowerCase();
      const isFabricated = rawEmail.endsWith("@friends.app");

      let targetId: string | null = null;
      if (!isFabricated && rawEmail) {
        const { data: existing } = await admin
          .from("profiles")
          .select("id, is_placeholder")
          .eq("email", rawEmail)
          .maybeSingle();
        if (existing) {
          targetId = existing.id;
          if (!existing.is_placeholder) connected++;
          else invited++;
        }
      }

      if (!targetId) {
        const placeholderEmail = isFabricated || !rawEmail
          ? `placeholder-${crypto.randomUUID()}@local.mysplitwise`
          : rawEmail;
        const { data: created } = await admin
          .from("profiles")
          .insert({
            id: crypto.randomUUID(),
            email: placeholderEmail,
            name: u.name || "Friend",
            avatar_color: u.avatarColor,
            is_placeholder: true,
          })
          .select("id")
          .single();
        if (!created) continue;
        targetId = created.id;
        invited++;
      }
      if (!targetId) continue;

      idMap.set(u.id, targetId);
      const [userA, userB] = pairKey(callerId, targetId);
      await admin
        .from("friendships")
        .upsert({ user_a: userA, user_b: userB, created_by: callerId }, { onConflict: "user_a,user_b", ignoreDuplicates: true });
    }

    const groupIdMap = new Map<string, string>();
    for (const g of state.groups) {
      const { data: created } = await admin
        .from("groups")
        .insert({
          name: g.name,
          type: g.type,
          simplify_debts: g.simplifyDebts,
          monthly_budget: g.monthlyBudget ?? null,
          created_by: callerId,
          created_at: g.createdAt,
        })
        .select("id")
        .single();
      if (!created) continue;
      groupIdMap.set(g.id, created.id);
      const memberIds = Array.from(
        new Set(g.memberIds.map((m) => idMap.get(m) ?? callerId)),
      );
      await admin
        .from("group_members")
        .insert(memberIds.map((userId) => ({ group_id: created.id, user_id: userId })));
    }

    let migratedExpenses = 0;
    for (const e of state.expenses) {
      const remappedGroupId = e.groupId ? (groupIdMap.get(e.groupId) ?? null) : null;
      const { data: created } = await admin
        .from("expenses")
        .insert({
          description: e.description,
          amount: e.amount,
          currency: e.currency,
          category: e.category,
          date: e.date,
          group_id: remappedGroupId,
          created_by: idMap.get(e.createdBy) ?? callerId,
          created_at: e.createdAt,
          is_settlement: e.isSettlement,
          notes: e.notes ?? null,
          receipt_url: e.receiptUrl ?? null,
          tax: e.tax ?? null,
          tip: e.tip ?? null,
          payment_method: e.paymentMethod ?? null,
        })
        .select("id")
        .single();
      if (!created) continue;
      migratedExpenses++;

      await admin.from("expense_shares").insert(
        e.shares.map((s) => ({
          expense_id: created.id,
          user_id: idMap.get(s.userId) ?? callerId,
          paid: s.paid,
          owed: s.owed,
        })),
      );

      if (e.items && e.items.length > 0) {
        for (let i = 0; i < e.items.length; i++) {
          const item = e.items[i];
          const { data: itemRow } = await admin
            .from("line_items")
            .insert({ expense_id: created.id, name: item.name, amount: item.amount, sort_order: i })
            .select("id")
            .single();
          if (!itemRow) continue;
          const participantIds = item.participantIds.map((p) => idMap.get(p) ?? callerId);
          await admin
            .from("line_item_participants")
            .insert(participantIds.map((userId) => ({ line_item_id: itemRow.id, user_id: userId })));
        }
      }

      if (e.comments && e.comments.length > 0) {
        await admin.from("expense_comments").insert(
          e.comments.map((c) => ({
            expense_id: created.id,
            user_id: idMap.get(c.userId) ?? callerId,
            text: c.text,
            created_at: c.createdAt,
          })),
        );
      }
    }

    for (const r of state.recurring) {
      const remappedGroupId = r.groupId ? (groupIdMap.get(r.groupId) ?? null) : null;
      const { data: created } = await admin
        .from("recurring_expenses")
        .insert({
          description: r.description,
          amount: r.amount,
          currency: r.currency,
          category: r.category,
          group_id: remappedGroupId,
          payer_id: idMap.get(r.payerId) ?? callerId,
          created_by: idMap.get(r.createdBy) ?? callerId,
          frequency: r.frequency,
          start_date: r.startDate,
          next_due: r.nextDue,
          active: r.active,
          created_at: r.createdAt,
        })
        .select("id")
        .single();
      if (!created) continue;
      await admin.from("recurring_expense_shares").insert(
        r.shares.map((s) => ({
          recurring_id: created.id,
          user_id: idMap.get(s.userId) ?? callerId,
          paid: s.paid,
          owed: s.owed,
        })),
      );
    }

    await admin
      .from("profiles")
      .update({
        base_currency: state.baseCurrency,
        notifications_read_at: state.notificationsReadAt ?? null,
        onboarded: true,
      })
      .eq("id", callerId);

    return NextResponse.json({
      ok: true,
      connected,
      invited,
      migratedExpenses,
      migratedGroups: groupIdMap.size,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
