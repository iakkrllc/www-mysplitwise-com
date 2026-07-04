import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isFriendOf } from "@/app/api/_lib/authz";
import { rowToUser } from "@/app/api/_lib/serialize";

/**
 * Update a profile's editable fields. You can always edit your own (name,
 * avatar, payment links). For a friend, you can only edit their payment
 * links — unless they're still a not-yet-joined placeholder, in which case
 * you can also fix their name/avatar since it's effectively your own local
 * note about them.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const callerId = user.id;
    const { id: targetId } = await params;

    if (targetId !== callerId && !(await isFriendOf(admin, callerId, targetId))) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: target } = await admin
      .from("profiles")
      .select("id, is_placeholder")
      .eq("id", targetId)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const isSelf = targetId === callerId;
    const canEditIdentity = isSelf || target.is_placeholder;

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (canEditIdentity) {
      if (typeof body.name === "string") patch.name = body.name;
      if (body.avatarColor !== undefined) patch.avatar_color = body.avatarColor;
      if (body.avatarUrl !== undefined) patch.avatar_url = body.avatarUrl;
    }
    if (typeof body.venmo === "string" || body.venmo === null) patch.venmo = body.venmo;
    if (typeof body.paypal === "string" || body.paypal === null) patch.paypal = body.paypal;
    if (typeof body.cashapp === "string" || body.cashapp === null) patch.cashapp = body.cashapp;
    if (isSelf && typeof body.baseCurrency === "string") patch.base_currency = body.baseCurrency;
    if (isSelf && typeof body.notificationsReadAt === "string") {
      patch.notifications_read_at = body.notificationsReadAt;
    }
    if (isSelf && typeof body.onboarded === "boolean") patch.onboarded = body.onboarded;
    if (isSelf && (typeof body.phone === "string" || body.phone === null)) {
      patch.phone = body.phone;
    }
    if (isSelf && body.notificationPrefs && typeof body.notificationPrefs === "object") {
      patch.notification_prefs = body.notificationPrefs;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data: updated, error } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", targetId)
      .select("*")
      .single();
    if (error || !updated) throw new Error(error?.message ?? "Couldn't update profile");

    return NextResponse.json({ user: rowToUser(updated) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
