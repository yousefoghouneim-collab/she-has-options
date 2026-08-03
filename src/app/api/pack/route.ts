import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generatePackingList } from "@/lib/outfitEngine";
import { getCurrentWeather } from "@/lib/weather";
import { serializeItem } from "@/lib/serialize";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const days = Math.max(1, Math.min(30, Number(body.days) || 3));

  const weather = await getCurrentWeather().catch(() => null);

  const wardrobe = await prisma.clothingItem.findMany({
    where: { userId: user.id, status: "active", needsWash: false },
    include: { wearLogs: { orderBy: { wornAt: "desc" }, take: 1 }, _count: { select: { wearLogs: true } } },
  });

  const result = generatePackingList(
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
    days,
    weather ? { isHot: weather.isHot, isVeryHot: weather.isVeryHot } : undefined
  );

  const byId = new Map(wardrobe.map((w) => [w.id, w]));
  const daysWithItems = result.days.map((d) => ({
    day: d.day,
    items: d.itemIds.map((id) => byId.get(id)).filter((w): w is NonNullable<typeof w> => !!w).map(serializeItem),
  }));
  const packItems = result.packItemIds.map((id) => byId.get(id)).filter((w): w is NonNullable<typeof w> => !!w).map(serializeItem);

  return NextResponse.json({ days: daysWithItems, packItems, warnings: result.warnings, weather });
}

function safeParseSeason(json: string): string[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}
