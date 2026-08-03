import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serializeItem } from "@/lib/serialize";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const outfits = await prisma.outfit.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { item: true } } },
  });

  return NextResponse.json(
    outfits.map((o) => ({
      id: o.id,
      name: o.name,
      occasion: o.occasion,
      aiGenerated: o.aiGenerated,
      aiReasoning: o.aiReasoning,
      favorite: o.favorite,
      createdAt: o.createdAt,
      items: o.items.map((oi) => serializeItem({ ...oi.item, wearLogs: [], _count: { wearLogs: 0 } })),
    }))
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const itemIds: string[] = Array.isArray(body.itemIds) ? body.itemIds : [];

  if (itemIds.length < 1) {
    return NextResponse.json({ error: "An outfit needs at least 1 item" }, { status: 400 });
  }

  const owned = await prisma.clothingItem.count({ where: { id: { in: itemIds }, userId: user.id } });
  if (owned !== itemIds.length) {
    return NextResponse.json({ error: "One or more items were not found" }, { status: 404 });
  }

  const outfit = await prisma.outfit.create({
    data: {
      userId: user.id,
      name: body.name ?? null,
      occasion: body.occasion ?? null,
      aiGenerated: !!body.aiGenerated,
      aiReasoning: body.aiReasoning ?? null,
      items: { create: itemIds.map((itemId: string) => ({ itemId })) },
    },
    include: { items: { include: { item: true } } },
  });

  return NextResponse.json(
    {
      id: outfit.id,
      name: outfit.name,
      occasion: outfit.occasion,
      aiGenerated: outfit.aiGenerated,
      aiReasoning: outfit.aiReasoning,
      favorite: outfit.favorite,
      createdAt: outfit.createdAt,
      items: outfit.items.map((oi) => serializeItem({ ...oi.item, wearLogs: [], _count: { wearLogs: 0 } })),
    },
    { status: 201 }
  );
}
