import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveOriginalPhoto, writeDisplayImage } from "@/lib/storage";
import { tagClothingImage, AIUnavailableError } from "@/lib/anthropic";
import { serializeItem } from "@/lib/serialize";

// Garment extraction needs a 176MB local ONNX model on local disk — doesn't
// fit Vercel's serverless model, so it's unavailable there (the UI already
// hides the option; this is the server-side backstop). Dynamically imported
// only when actually used, so the heavy dependency isn't loaded otherwise.
const GARMENT_EXTRACTION_AVAILABLE = !process.env.VERCEL;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const status = request.nextUrl.searchParams.get("status") ?? "active";
  const items = await prisma.clothingItem.findMany({
    where: status === "all" ? { userId: user.id } : { userId: user.id, status },
    orderBy: { createdAt: "desc" },
    include: {
      wearLogs: { orderBy: { wornAt: "desc" }, take: 1 },
      _count: { select: { wearLogs: true } },
    },
  });
  return NextResponse.json(items.map(serializeItem));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const formData = await request.formData();
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File);
  const extractGarmentFlag = formData.get("extractGarment") === "true";

  if (!files.length) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  const created = [];

  for (const file of files) {
    const id = randomUUID();
    const { imagePath, buffer } = await saveOriginalPhoto(id, file);

    let displaySourceBuffer = buffer;
    let displayAutoRotate = true;
    let segmentationNote: string | null = null;
    if (extractGarmentFlag && GARMENT_EXTRACTION_AVAILABLE) {
      try {
        const { extractGarment, SegmentationNotFoundError } = await import("@/lib/clothSegmentation");
        try {
          displaySourceBuffer = await extractGarment(buffer);
          displayAutoRotate = false; // extractGarment already handles rotation internally
        } catch (err) {
          segmentationNote =
            err instanceof SegmentationNotFoundError
              ? "Couldn't isolate a garment in this photo — saved the original instead."
              : "Garment extraction failed — saved the original instead.";
        }
      } catch {
        segmentationNote = "Garment extraction isn't available in this deployment — saved the original instead.";
      }
    }

    const { displayPath, webpBuffer } = await writeDisplayImage(id, displaySourceBuffer, displayAutoRotate);

    let tags: Awaited<ReturnType<typeof tagClothingImage>> | null = null;
    let aiError: string | null = null;
    try {
      tags = await tagClothingImage(webpBuffer.toString("base64"), "image/webp");
    } catch (err) {
      aiError = err instanceof AIUnavailableError ? err.message : "AI tagging failed";
    }

    const item = await prisma.clothingItem.create({
      data: {
        id,
        userId: user.id,
        imagePath,
        displayPath,
        category: tags?.category ?? "Top",
        subcategory: tags?.subcategory ?? null,
        primaryColor: tags?.primaryColor ?? null,
        secondaryColor: tags?.secondaryColor ?? null,
        pattern: tags?.pattern ?? null,
        season: JSON.stringify(tags?.season ?? []),
        formality: tags?.formality ?? null,
        material: tags?.material ?? null,
        brand: tags?.brandGuess ?? null,
        aiTagged: !!tags,
        aiConfidence: tags?.confidence ?? null,
        aiRawResponse: tags ? JSON.stringify(tags) : aiError,
      },
    });

    created.push({
      ...serializeItem({ ...item, wearLogs: [], _count: { wearLogs: 0 } }),
      segmentationNote,
    });
  }

  return NextResponse.json(created, { status: 201 });
}
