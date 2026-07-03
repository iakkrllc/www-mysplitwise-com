import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params;
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const message = update?.message;
  const chatId = message?.chat?.id as number | undefined;
  const text = message?.text as string | undefined;

  if (chatId && text?.startsWith("/start")) {
    const supabase = getSupabaseAdmin();
    await supabase.from("telegram_subscribers").upsert({ chat_id: chatId });
    await sendTelegramMessage(
      chatId,
      "You're subscribed to mysplitwise updates! I'll message you here whenever there's a new feature or update. Send /stop anytime to unsubscribe.",
    );
  } else if (chatId && text?.startsWith("/stop")) {
    const supabase = getSupabaseAdmin();
    await supabase.from("telegram_subscribers").delete().eq("chat_id", chatId);
    await sendTelegramMessage(chatId, "You've been unsubscribed. Send /start anytime to rejoin.");
  }

  return NextResponse.json({ ok: true });
}
