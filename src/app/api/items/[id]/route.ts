import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { photoAbsolutePath } from "@/lib/storage";
import { serializeItem } from "@/lib/serialize";
import { CATEGORIES, SEASONS } from "@/lib/taxonomy";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.clothingItem.findUnique({
    where: { id },
    include: { wearLogs: { orderBy: { wornAt: "desc" }, take: 1 }, _count: { select: { wearLogs: true } } },
  });
  if (!item || item.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeItem(item));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.clothingItem.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (typeof body.category === "string" && (CATEGORIES as readonly string[]).includes(body.category)) data.category = body.category;
  if ("subcategory" in body) data.subcategory = body.subcategory;
  if ("primaryColor" in body) data.primaryColor = body.primaryColor;
  if ("secondaryColor" in body) data.secondaryColor = body.secondaryColor;
  if ("pattern" in body) data.pattern = body.pattern;
  if (Array.isArray(body.season)) data.season = JSON.stringify(body.season.filter((s: string) => (SEASONS as readonly string[]).includes(s)));
  if ("formality" in body) data.formality = body.formality;
  if ("material" in body) data.material = body.material;
  if ("brand" in body) data.brand = body.brand;
  if ("notes" in body) data.notes = body.notes;
  if (typeof body.favorite === "boolean") data.favorite = body.favorite;
  if (typeof body.needsWash === "boolean") data.needsWash = body.needsWash;
  if (typeof body.status === "string" && ["active", "archived", "retired"].includes(body.status)) data.status = body.status;

  const item = await prisma.clothingItem.update({
    where: { id },
    data,
    include: { wearLogs: { orderBy: { wornAt: "desc" }, take: 1 }, _count: { select: { wearLogs: true } } },
  });
  return NextResponse.json(serializeItem(item));
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.clothingItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.clothingItem.delete({ where: { id } });

  await Promise.allSettled([
    unlink(photoAbsolutePath(item.imagePath)),
    unlink(photoAbsolutePath(item.displayPath)),
  ]);

  return NextResponse.json({ ok: true });
}
