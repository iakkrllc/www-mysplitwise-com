import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getAnthropic, AI_MODEL } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const question: string = (body?.question ?? "").trim();
    const summary: string = (body?.summary ?? "").trim();
    if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });
    if (question.length > 500) {
      return NextResponse.json({ error: "Question is too long" }, { status: 400 });
    }
    if (summary.length > 16000) {
      return NextResponse.json({ error: "Too much data to analyze" }, { status: 400 });
    }

    const client = getAnthropic();
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 600,
      system:
        "You are \"Ask mysplitwise\", a friendly assistant inside a bill-splitting app. You are given a compact summary of the signed-in user's expenses, balances, and groups. Answer the user's question using only that data. Be concise — a few sentences, or short bullet points for lists. If the data doesn't cover their question, say so plainly instead of guessing or inventing numbers.",
      messages: [
        {
          role: "user",
          content: `Here is my data:\n${summary}\n\nQuestion: ${question}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const answer = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (response.stop_reason === "refusal" || !answer) {
      return NextResponse.json({ error: "Couldn't answer that one" }, { status: 502 });
    }
    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
