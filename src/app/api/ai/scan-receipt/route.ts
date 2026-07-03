import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getAnthropic, AI_MODEL } from "@/lib/anthropic";
import { CATEGORIES } from "@/lib/categories";

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
const SUPPORTED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const image: string | undefined = body?.image;
    if (!image || typeof image !== "string" || !image.startsWith("data:")) {
      return NextResponse.json({ error: "Missing receipt image" }, { status: 400 });
    }
    const match = image.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
    if (!match || !SUPPORTED_MEDIA_TYPES.has(match[1])) {
      return NextResponse.json({ error: "Unsupported image format" }, { status: 400 });
    }
    const [, mediaType, base64Data] = match;

    const client = getAnthropic();
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `Read this receipt photo and extract its details. Pick the single best category id from this list: ${CATEGORY_IDS.join(", ")}. Amount fields are plain numbers with no currency symbols. If tax or tip aren't shown, use 0. If the date isn't visible, use null.`,
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              merchant: { type: "string" },
              date: {
                type: ["string", "null"],
                description: "YYYY-MM-DD if visible on the receipt, else null",
              },
              category: { type: "string", enum: CATEGORY_IDS },
              tax: { type: "number" },
              tip: { type: "number" },
              total: { type: "number" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    amount: { type: "number" },
                  },
                  required: ["name", "amount"],
                  additionalProperties: false,
                },
              },
            },
            required: ["merchant", "date", "category", "tax", "tip", "total", "items"],
            additionalProperties: false,
          },
        },
      },
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "Couldn't read that receipt" }, { status: 502 });
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Couldn't read that receipt" }, { status: 502 });
    }
    const receipt = JSON.parse(textBlock.text);
    return NextResponse.json({ receipt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
