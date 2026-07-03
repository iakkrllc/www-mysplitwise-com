import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-broadcast-secret");
  if (!process.env.BROADCAST_SECRET || secret !== process.env.BROADCAST_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const message = body?.message;
  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { ok: false, error: "Provide a JSON body with a 'message' string" },
      { status: 400 },
    );
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" },
      { status: 500 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: subs, error } = await supabase
    .from("telegram_subscribers")
    .select("chat_id");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: s.chat_id, text: message }),
      });
      sent++;
    } catch {
      // ignore individual delivery failures
    }
  }

  return NextResponse.json({ ok: true, sent, total: subs?.length ?? 0 });
}
