import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getAnthropic, AI_MODEL } from "@/lib/anthropic";
import { CATEGORIES } from "@/lib/categories";

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

// Cheap, instant matches — skips the AI call entirely for obvious descriptions.
const KEYWORD_MAP: [RegExp, string][] = [
  [/uber|lyft|taxi|\bcab\b/i, "transit"],
  [/netflix|spotify|hulu|disney\+|\bmovie\b|cinema/i, "entertainment"],
  [/\brent\b/i, "rent"],
  [/walmart|costco|kroger|groceries?\b|whole foods|trader joe|safeway/i, "groceries"],
  [/starbucks|\bcoffee\b|\bcafe\b/i, "coffee"],
  [/shell|chevron|exxon|gas station|\bfuel\b|\bgas\b/i, "gas"],
  [/electric(ity)? bill|power bill/i, "electricity"],
  [/water bill/i, "water"],
  [/internet|wifi|broadband/i, "internet"],
  [/\bflight\b|airbnb|\bhotel\b/i, "travel"],
  [/\bvet\b|\bpet\b|petco|petsmart/i, "pets"],
  [/doctor|pharmacy|hospital|clinic|dentist/i, "medical"],
  [/\bgym\b|fitness/i, "sports"],
  [/\bwine\b|\bliquor\b|\bbeer\b/i, "liquor"],
  [/\bgift\b|birthday present/i, "gifts"],
];

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const description: string = (body?.description ?? "").trim();
    if (!description) {
      return NextResponse.json({ error: "Missing description" }, { status: 400 });
    }

    for (const [re, category] of KEYWORD_MAP) {
      if (re.test(description)) {
        return NextResponse.json({ category, source: "keyword" });
      }
    }

    const client = getAnthropic();
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Pick the single best category id for this shared-expense description: "${description}". Categories: ${CATEGORY_IDS.join(", ")}.`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { category: { type: "string", enum: CATEGORY_IDS } },
            required: ["category"],
            additionalProperties: false,
          },
        },
      },
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ category: "general", source: "fallback" });
    }
    const textBlock = response.content.find((b) => b.type === "text");
    const parsed =
      textBlock && textBlock.type === "text" ? JSON.parse(textBlock.text) : null;
    return NextResponse.json({ category: parsed?.category ?? "general", source: "ai" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
