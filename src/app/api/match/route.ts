import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkMatchWithAI, AIUnavailableError, type WardrobeItemSummary } from "@/lib/anthropic";
import { localMatchCheck } from "@/lib/outfitEngine";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const itemIds: string[] = Array.isArray(body.itemIds) ? body.itemIds : [];

  if (itemIds.length < 2) {
    return NextResponse.json({ error: "Pick at least 2 items to check" }, { status: 400 });
  }

  const items = await prisma.clothingItem.findMany({ where: { id: { in: itemIds }, userId: user.id } });
  if (items.length < 2) {
    return NextResponse.json({ error: "Couldn't find those items" }, { status: 404 });
  }

  const summaries: WardrobeItemSummary[] = items.map((w) => ({
    id: w.id,
    category: w.category,
    subcategory: w.subcategory,
    primaryColor: w.primaryColor,
    formality: w.formality,
    season: safeParseSeason(w.season),
    favorite: w.favorite,
  }));

  try {
    const result = await checkMatchWithAI(summaries);
    return NextResponse.json({ ...result, source: "ai" });
  } catch (err) {
    if (!(err instanceof AIUnavailableError) && !(err instanceof Error)) throw err;
    const local = localMatchCheck(
      items.map((w) => ({
        id: w.id,
        category: w.category,
        subcategory: w.subcategory,
        primaryColor: w.primaryColor,
        secondaryColor: w.secondaryColor,
        formality: w.formality,
        favorite: w.favorite,
        season: safeParseSeason(w.season),
      }))
    );
    return NextResponse.json({ matches: local.matches, reason: local.reason, source: "local" });
  }
}

function safeParseSeason(json: string): string[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}
