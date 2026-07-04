import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { advanceDate, todayISO } from "@/lib/dates";
import { round2 } from "@/lib/calculations";

type Admin = ReturnType<typeof getSupabaseAdmin>;

interface RecurringForMaterialize {
  id: string;
  description: string;
  amount: string | number;
  currency: string;
  category: string;
  group_id: string | null;
  created_by: string;
  frequency: "weekly" | "monthly" | "yearly";
  next_due: string;
  active: boolean;
}

/**
 * Generates any overdue expenses for recurring bills the caller participates
 * in (as a share participant or a fellow group member), advancing next_due
 * as it goes. Uses an optimistic-lock update (next_due must still match what
 * we just read) so two participants pulling at the same instant can't
 * double-generate the same occurrence — whichever request loses the race
 * simply skips, since the winner already created it.
 */
export async function materializeDueRecurring(
  admin: Admin,
  callerId: string,
): Promise<void> {
  const today = todayISO();

  const [{ data: shareRows }, { data: groupRows }] = await Promise.all([
    admin.from("recurring_expense_shares").select("recurring_id").eq("user_id", callerId),
    admin.from("group_members").select("group_id").eq("user_id", callerId),
  ]);

  const recurringIds = new Set((shareRows ?? []).map((r) => r.recurring_id as string));
  const groupIds = (groupRows ?? []).map((g) => g.group_id as string);
  if (recurringIds.size === 0 && groupIds.length === 0) return;

  let query = admin
    .from("recurring_expenses")
    .select(
      "id, description, amount, currency, category, group_id, created_by, frequency, next_due, active",
    )
    .eq("active", true)
    .lte("next_due", today);

  const orParts: string[] = [];
  if (recurringIds.size > 0) orParts.push(`id.in.(${[...recurringIds].join(",")})`);
  if (groupIds.length > 0) orParts.push(`group_id.in.(${groupIds.join(",")})`);
  query = query.or(orParts.join(","));

  const { data: due } = await query;
  if (!due || due.length === 0) return;

  for (const r of due as RecurringForMaterialize[]) {
    const { data: shares } = await admin
      .from("recurring_expense_shares")
      .select("user_id, paid, owed")
      .eq("recurring_id", r.id);
    if (!shares || shares.length === 0) continue;

    const generatedDates: string[] = [];
    let next = r.next_due;
    let guard = 0;
    while (next <= today && guard < 120) {
      generatedDates.push(next);
      next = advanceDate(next, r.frequency);
      guard++;
    }
    if (generatedDates.length === 0) continue;

    const { data: locked } = await admin
      .from("recurring_expenses")
      .update({ next_due: next })
      .eq("id", r.id)
      .eq("next_due", r.next_due)
      .select("id");
    if (!locked || locked.length === 0) continue; // lost the race — someone else already advanced it

    for (const date of generatedDates) {
      const { data: expenseRow } = await admin
        .from("expenses")
        .insert({
          description: r.description,
          amount: Number(r.amount),
          currency: r.currency,
          category: r.category,
          date,
          group_id: r.group_id,
          created_by: r.created_by,
          is_settlement: false,
          recurring_id: r.id,
        })
        .select("id")
        .single();
      if (!expenseRow) continue;
      await admin.from("expense_shares").insert(
        shares.map((s) => ({
          expense_id: expenseRow.id,
          user_id: s.user_id,
          paid: round2(Number(s.paid)),
          owed: round2(Number(s.owed)),
        })),
      );
    }
  }
}
