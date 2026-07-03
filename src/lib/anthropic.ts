import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Server-only Anthropic client. Never import this from client components. */
export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/** Fast, cheap model used for all mysplitwise AI features. */
export const AI_MODEL = "claude-haiku-4-5";
