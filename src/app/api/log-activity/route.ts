import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_EVENTS = new Set(["logout"]);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const eventType = ALLOWED_EVENTS.has(body?.eventType) ? body.eventType : null;
  if (!eventType) {
    return NextResponse.json({ ok: false, error: "Unsupported event" }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: data.user.id,
    event_type: eventType,
    description: "Signed out",
  });

  return NextResponse.json({ ok: true });
}
