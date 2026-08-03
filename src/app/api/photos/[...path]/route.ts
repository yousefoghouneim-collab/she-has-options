import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { photoAbsolutePath } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { path: segments } = await params;

  // Reject any traversal attempt outright.
  if (segments.some((s) => s.includes("..") || s.includes("\0"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const relativePath = segments.join("/");
  const absolutePath = photoAbsolutePath(relativePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] ?? "application/octet-stream";

  try {
    const buffer = await readFile(absolutePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
