import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const outfit = await prisma.outfit.findUnique({ where: { id }, include: { items: true } });
  if (!outfit || outfit.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.wearLog.create({ data: { outfitId: id } });
  await prisma.$transaction(outfit.items.map((oi) => prisma.wearLog.create({ data: { itemId: oi.itemId } })));
  await prisma.clothingItem.updateMany({
    where: { id: { in: outfit.items.map((oi) => oi.itemId) } },
    data: { needsWash: true },
  });

  return NextResponse.json({ ok: true });
}
