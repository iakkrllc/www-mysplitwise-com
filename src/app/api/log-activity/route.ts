import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { captureRequestMeta } from "@/lib/request-meta";

const EVENT_DESCRIPTIONS: Record<string, string> = {
  login: "Signed in",
  logout: "Signed out",
  signup: "Account created",
  login_failed: "Failed sign-in attempt",
};
const ALLOWED_EVENTS = new Set(Object.keys(EVENT_DESCRIPTIONS));

const FAILED_LOGIN_THRESHOLD = 10;
const FAILED_LOGIN_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const eventType = ALLOWED_EVENTS.has(body?.eventType) ? body.eventType : null;
  if (!eventType) {
    return NextResponse.json({ ok: false, error: "Unsupported event" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const meta = captureRequestMeta(req);

  // A failed login has no session to authenticate with — this is the one event
  // type we accept without a Bearer token. Visibility only; the real defense
  // against brute force is Supabase Auth's own built-in sign-in rate limiting.
  if (eventType === "login_failed") {
    const attemptedEmail = typeof body?.attemptedEmail === "string"
      ? body.attemptedEmail.slice(0, 200)
      : null;

    if (meta.ip) {
      const cutoff = new Date(Date.now() - FAILED_LOGIN_WINDOW_MS).toISOString();
      const { data: recent } = await supabase
        .from("activity_log")
        .select("metadata")
        .eq("event_type", "login_failed")
        .gte("created_at", cutoff)
        .limit(200);
      const countFromSameIp = (recent ?? []).filter(
        (r) => (r.metadata as { ip?: string } | null)?.ip === meta.ip,
      ).length;
      if (countFromSameIp >= FAILED_LOGIN_THRESHOLD) {
        return NextResponse.json({ ok: true });
      }
    }

    await supabase.from("activity_log").insert({
      user_id: null,
      event_type: eventType,
      description: EVENT_DESCRIPTIONS[eventType],
      metadata: { ...meta, attemptedEmail },
    });
    return NextResponse.json({ ok: true });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });

  await supabase.from("activity_log").insert({
    user_id: data.user.id,
    event_type: eventType,
    description: EVENT_DESCRIPTIONS[eventType],
    metadata: meta,
  });

  return NextResponse.json({ ok: true });
}
