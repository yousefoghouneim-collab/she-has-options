import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { suggestOutfitWithAI, AIUnavailableError, type WardrobeItemSummary } from "@/lib/anthropic";
import { generateLocalOutfit } from "@/lib/outfitEngine";
import { serializeItem } from "@/lib/serialize";
import { getCurrentWeather } from "@/lib/weather";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const occasion: string | undefined = typeof body.occasion === "string" ? body.occasion : undefined;
  const excludeItemIds: string[] = Array.isArray(body.excludeItemIds)
    ? body.excludeItemIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  const weather = await getCurrentWeather().catch(() => null);

  const wardrobe = await prisma.clothingItem.findMany({
    where: { userId: user.id, status: "active", needsWash: false },
    include: { wearLogs: { orderBy: { wornAt: "desc" }, take: 1 }, _count: { select: { wearLogs: true } } },
  });

  if (wardrobe.length < 1) {
    return NextResponse.json(
      { error: "Add at least 1 clean, active wardrobe item before requesting a suggestion" },
      { status: 400 }
    );
  }

  const summaries: WardrobeItemSummary[] = wardrobe.map((w) => ({
    id: w.id,
    category: w.category,
    subcategory: w.subcategory,
    primaryColor: w.primaryColor,
    formality: w.formality,
    season: safeParseSeason(w.season),
    favorite: w.favorite,
  }));

  const weatherNote = weather
    ? `Current weather in ${weather.location}: ${weather.tempC}°C, ${weather.condition}. ${
        weather.isVeryHot
          ? "It is very hot — favor light, breathable pieces and skip heavy outerwear."
          : weather.isHot
            ? "It is warm — lean toward lighter pieces."
            : "Conditions are mild."
      }`
    : undefined;

  let itemIds: string[];
  let reasoning: string;
  let source: "ai" | "local";

  try {
    const result = await suggestOutfitWithAI(summaries, occasion, weatherNote, excludeItemIds);
    itemIds = result.itemIds;
    reasoning = result.reasoning;
    source = "ai";
  } catch (err) {
    if (!(err instanceof AIUnavailableError) && !(err instanceof Error)) throw err;
    const local = generateLocalOutfit(
      wardrobe.map((w) => ({
        id: w.id,
        category: w.category,
        subcategory: w.subcategory,
        primaryColor: w.primaryColor,
        secondaryColor: w.secondaryColor,
        formality: w.formality,
        favorite: w.favorite,
        season: safeParseSeason(w.season),
      })),
      weather ? { isHot: weather.isHot, isVeryHot: weather.isVeryHot } : undefined,
      new Set(excludeItemIds)
    );
    if (!local) {
      return NextResponse.json(
        { error: "Couldn't build an outfit — try adding a few more items (e.g. a top, a bottom, and shoes)." },
        { status: 400 }
      );
    }
    itemIds = local.itemIds;
    reasoning = local.reason;
    source = "local";
  }

  const byId = new Map(wardrobe.map((w) => [w.id, w]));
  const items = itemIds
    .map((id) => byId.get(id))
    .filter((w): w is NonNullable<typeof w> => !!w)
    .map((w) => serializeItem(w));

  return NextResponse.json({ items, reasoning, source, weather });
}

function safeParseSeason(json: string): string[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}
