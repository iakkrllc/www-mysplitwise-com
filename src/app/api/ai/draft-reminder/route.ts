import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getAnthropic, AI_MODEL } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const friendName: string = (body?.friendName ?? "").trim();
    const amountText: string = (body?.amountText ?? "").trim();
    const context: string = (body?.context ?? "").trim().slice(0, 300);
    if (!friendName || !amountText) {
      return NextResponse.json({ error: "Missing friend or amount" }, { status: 400 });
    }

    const client = getAnthropic();
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Write a short, casual, friendly text message reminding my friend ${friendName} that they owe me ${amountText} on mysplitwise${context ? ` (context: ${context})` : ""}. Keep it under 300 characters. No subject line, no formal greeting like "Dear" — just a natural text message a friend would actually send. Light and easygoing, not pushy or guilt-trippy. Return only the message text, nothing else.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const message = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (response.stop_reason === "refusal" || !message) {
      return NextResponse.json({ error: "Couldn't draft a reminder" }, { status: 502 });
    }
    return NextResponse.json({ message });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
