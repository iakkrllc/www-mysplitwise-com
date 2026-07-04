import { NextRequest, NextResponse } from "next/server";
import { requireCallerStaff } from "@/lib/staff-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const result = await requireCallerStaff(req);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (!result.permissions.includes("view_payment_info")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { data: settlements, error } = await admin
      .from("expenses")
      .select("id, amount, currency, dispute_reason, disputed_at, created_by, disputed_by")
      .eq("is_settlement", true)
      .eq("disputed", true)
      .order("disputed_at", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const userIds = Array.from(
      new Set((settlements ?? []).flatMap((s) => [s.created_by, s.disputed_by].filter(Boolean))),
    ) as string[];
    let nameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      nameById = new Map((profiles ?? []).map((p) => [p.id, p.name || p.email]));
    }

    const disputes = (settlements ?? []).map((s) => ({
      id: s.id,
      amount: s.amount,
      currency: s.currency,
      reason: s.dispute_reason,
      disputedAt: s.disputed_at,
      loggedBy: nameById.get(s.created_by) ?? s.created_by,
      disputedBy: s.disputed_by ? nameById.get(s.disputed_by) ?? s.disputed_by : null,
    }));

    return NextResponse.json({ disputes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
