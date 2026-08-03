import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, SEASONS } from "@/lib/taxonomy";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AIUnavailableError("ANTHROPIC_API_KEY is not set");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/** Thrown whenever the Claude call can't be trusted — callers should fall back to local logic. */
export class AIUnavailableError extends Error {}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fall through
      }
    }
    throw new AIUnavailableError("Claude did not return parseable JSON");
  }
}

export type AITags = {
  category: string;
  subcategory: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: string | null;
  season: string[];
  formality: number | null;
  material: string | null;
  brandGuess: string | null;
  confidence: number;
};

export async function tagClothingImage(imageBase64: string, mediaType: string): Promise<AITags> {
  const anthropic = getClient();

  const prompt = `You are cataloging a single clothing item photo for a personal wardrobe app. Look at the photo and return ONLY a JSON object (no markdown fences, no prose) with this exact shape:

{
  "category": one of ${JSON.stringify(CATEGORIES)},
  "subcategory": a short specific name, e.g. "Oxford shirt", "Wide-leg trousers", or null if unclear,
  "primaryColor": the dominant colour as a simple word, e.g. "navy", "olive", "cream",
  "secondaryColor": a second notable colour, or null,
  "pattern": e.g. "solid", "striped", "floral", "checked", "printed", or null,
  "season": an array using only values from ${JSON.stringify(SEASONS)} (can be more than one),
  "formality": an integer 1-5 where 1 is very casual (gym wear) and 5 is very formal (black tie),
  "material": your best guess, e.g. "cotton", "denim", "wool", or null if unclear,
  "brandGuess": a visible brand/logo name if legible, else null,
  "confidence": a number 0-1 for how confident you are in this reading overall
}

If the photo does not clearly show a single wearable clothing item, still return your best-effort guess but set "confidence" low (below 0.4).`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: imageBase64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new AIUnavailableError("No text in Claude response");

  const parsed = extractJson(textBlock.text) as Partial<AITags>;
  return {
    category: typeof parsed.category === "string" && (CATEGORIES as readonly string[]).includes(parsed.category)
      ? parsed.category
      : "Top",
    subcategory: parsed.subcategory ?? null,
    primaryColor: parsed.primaryColor ?? null,
    secondaryColor: parsed.secondaryColor ?? null,
    pattern: parsed.pattern ?? null,
    season: Array.isArray(parsed.season) ? parsed.season.filter((s) => (SEASONS as readonly string[]).includes(s)) : [],
    formality: typeof parsed.formality === "number" ? Math.max(1, Math.min(5, Math.round(parsed.formality))) : null,
    material: parsed.material ?? null,
    brandGuess: parsed.brandGuess ?? null,
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
  };
}

export type WardrobeItemSummary = {
  id: string;
  category: string;
  subcategory: string | null;
  primaryColor: string | null;
  formality: number | null;
  season: string[];
  favorite: boolean;
};

export async function suggestOutfitWithAI(
  wardrobe: WardrobeItemSummary[],
  occasion?: string,
  weatherNote?: string
): Promise<{ itemIds: string[]; reasoning: string }> {
  const anthropic = getClient();

  const prompt = `Here is a person's wardrobe as JSON, each item with an "id" you must reference exactly:
${JSON.stringify(wardrobe)}

Suggest ONE complete outfit from these items (do not invent items). ${occasion ? `Occasion: ${occasion}.` : "No specific occasion given — pick something versatile."}
${weatherNote ? `${weatherNote}\n` : ""}Respond with ONLY JSON (no markdown fences):
{ "itemIds": ["id1", "id2", ...], "reasoning": "one short sentence explaining the pairing" }
Use only item ids that appear above. Include shoes if any exist in the wardrobe.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new AIUnavailableError("No text in Claude response");

  const parsed = extractJson(textBlock.text) as { itemIds?: unknown; reasoning?: unknown };
  const validIds = new Set(wardrobe.map((w) => w.id));
  const itemIds = Array.isArray(parsed.itemIds) ? parsed.itemIds.filter((id) => validIds.has(id)) : [];

  if (itemIds.length < 1) throw new AIUnavailableError("Claude returned too few valid item ids");

  return {
    itemIds,
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "Suggested by Claude.",
  };
}

export async function checkMatchWithAI(
  items: WardrobeItemSummary[]
): Promise<{ matches: boolean; reason: string }> {
  const anthropic = getClient();

  const prompt = `Do these clothing items work well together as an outfit? Items:
${JSON.stringify(items)}

Respond with ONLY JSON (no markdown fences): { "matches": true or false, "reason": "one short sentence" }`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new AIUnavailableError("No text in Claude response");

  const parsed = extractJson(textBlock.text) as { matches?: unknown; reason?: unknown };
  if (typeof parsed.matches !== "boolean") throw new AIUnavailableError("Claude response missing 'matches' boolean");

  return {
    matches: parsed.matches,
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
  };
}
