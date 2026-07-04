import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Called right after a successful sign-up or sign-in (never as a DB trigger
 * on auth.users/auth.sessions — see the note in supabase/expenses-schema.sql).
 * Ensures the caller has a profile row, then re-attributes any placeholder
 * profile that was created for their email (someone added them as a friend
 * before they'd joined) onto their real account.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();

    const email = user.email ?? user.phone ?? "";
    const name = (user.user_metadata?.name as string | undefined) || email || "You";

    await admin
      .from("profiles")
      .upsert(
        { id: user.id, email, name, onboarded: false },
        { onConflict: "id", ignoreDuplicates: true },
      );

    if (email) {
      await admin.rpc("claim_placeholder_profile", {
        p_real_id: user.id,
        p_email: email,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
