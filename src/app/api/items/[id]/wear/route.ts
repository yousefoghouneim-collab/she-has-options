import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serializeItem } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.clothingItem.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.wearLog.create({ data: { itemId: id } });

  const item = await prisma.clothingItem.update({
    where: { id },
    data: { needsWash: true },
    include: { wearLogs: { orderBy: { wornAt: "desc" }, take: 1 }, _count: { select: { wearLogs: true } } },
  });

  return NextResponse.json(serializeItem(item));
}
