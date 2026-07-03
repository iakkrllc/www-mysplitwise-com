import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getAnthropic, AI_MODEL } from "@/lib/anthropic";
import { CATEGORIES } from "@/lib/categories";

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

interface NamedRef {
  id: string;
  name: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const transcript: string = (body?.transcript ?? "").trim();
    const friends: NamedRef[] = Array.isArray(body?.friends) ? body.friends : [];
    const groups: NamedRef[] = Array.isArray(body?.groups) ? body.groups : [];
    if (!transcript) return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
    if (transcript.length > 500) {
      return NextResponse.json({ error: "That's a bit long to parse" }, { status: 400 });
    }

    const client = getAnthropic();
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Parse this spoken sentence into a structured shared expense.

Sentence: "${transcript}"

Known friends (id: name): ${friends.map((f) => `${f.id}: ${f.name}`).join(", ") || "none"}
Known groups (id: name): ${groups.map((g) => `${g.id}: ${g.name}`).join(", ") || "none"}
Categories: ${CATEGORY_IDS.join(", ")}

Match any friend or group names mentioned in the sentence to their id from the lists above (case-insensitive, first-name matches OK). If no friend is clearly named, leave friendIds empty. If no group is named, use null for groupId. description should be a short 2-5 word label (e.g. "Dinner", "Groceries"), not the full sentence.`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              description: { type: "string" },
              amount: { type: "number" },
              category: { type: "string", enum: CATEGORY_IDS },
              friendIds: { type: "array", items: { type: "string" } },
              groupId: { type: ["string", "null"] },
            },
            required: ["description", "amount", "category", "friendIds", "groupId"],
            additionalProperties: false,
          },
        },
      },
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "Couldn't understand that" }, { status: 502 });
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Couldn't understand that" }, { status: 502 });
    }
    const expense = JSON.parse(textBlock.text);
    if (!expense.amount || expense.amount <= 0) {
      return NextResponse.json(
        { error: "Couldn't catch an amount — try again mentioning the price" },
        { status: 422 },
      );
    }
    return NextResponse.json({ expense });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
