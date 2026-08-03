import { mkdir, writeFile, unlink as fsUnlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import convertHeic from "heic-convert";
import { put, del } from "@vercel/blob";

const DATA_DIR = path.join(process.cwd(), "data", "photos");
const ORIGINALS_DIR = path.join(DATA_DIR, "originals");
const DISPLAY_DIR = path.join(DATA_DIR, "display");

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

// Local disk works great for local dev but doesn't persist on Vercel's
// serverless filesystem, so photos live in Vercel Blob whenever a token is
// configured (production, and locally too once `vercel blob create-store`
// or `vercel env pull` has populated BLOB_READ_WRITE_TOKEN) — otherwise
// everything falls back to local files, so the app still works standalone
// with zero cloud setup.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

// `Buffer.from(arrayBuffer)` creates a zero-copy view rather than copying
// bytes. On Vercel, `file.arrayBuffer()` and the HEIC WASM decoder can hand
// back a buffer backed by a real SharedArrayBuffer, which undici's fetch
// (used by @vercel/blob's put()) rejects outright ("SharedArrayBuffer is
// not allowed"). Forcing a copy here guarantees a plain, non-shared buffer.
function toSafeBuffer(input: ArrayBuffer | Uint8Array): Buffer {
  return Buffer.from(new Uint8Array(input));
}

/**
 * iPhones upload photos as HEIC/HEIF. sharp's built-in HEIF decoder enforces
 * a strict security limit on the number of internal image references and
 * rejects many real iPhone photos with "Security limit exceeded... iref
 * box" — and even when it doesn't, Chrome/Firefox can't render HEIC as an
 * <img> anyway. Detect by real content (magic bytes), not just the
 * browser-reported MIME type, since that's sometimes blank (e.g. Safari).
 */
function isHeic(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/heic" || mimeType === "image/heif") return true;
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buffer.toString("ascii", 8, 12).trim().toLowerCase();
  return HEIC_BRANDS.has(brand);
}

/**
 * Saves an uploaded photo as-is (originals/<id>.<ext>). Returns the raw
 * buffer too, so callers can run further processing (AI tagging, garment
 * segmentation) on it before deciding what the display version should be.
 * HEIC/HEIF input is transcoded to JPEG first — via a permissive decoder
 * that doesn't hit sharp's HEIF security limits — so both the saved
 * original and everything downstream are in a browser-renderable format.
 */
export async function saveOriginalPhoto(id: string, file: File): Promise<{ imagePath: string; buffer: Buffer }> {
  let buffer = toSafeBuffer(await file.arrayBuffer());
  let mimeType = file.type;

  if (isHeic(buffer, mimeType)) {
    const jpegBuffer = await convertHeic({ buffer, format: "JPEG", quality: 0.92 });
    buffer = toSafeBuffer(jpegBuffer);
    mimeType = "image/jpeg";
  }

  const ext = extensionFor(mimeType);
  const originalRelative = `originals/${id}${ext}`;

  if (useBlob) {
    const blob = await put(originalRelative, buffer, { access: "public", contentType: mimeType });
    return { imagePath: blob.url, buffer };
  }

  await mkdir(ORIGINALS_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, originalRelative), buffer);
  return { imagePath: originalRelative, buffer };
}

/**
 * Writes a normalized, resized, WebP-compressed display version
 * (display/<id>.webp) from a given image buffer — auto-rotating from EXIF
 * when the source hasn't already been processed (segmented output has none).
 */
export async function writeDisplayImage(
  id: string,
  buffer: Buffer,
  autoRotate = true
): Promise<{ displayPath: string; webpBuffer: Buffer }> {
  const displayRelative = `display/${id}.webp`;
  let pipeline = sharp(buffer);
  if (autoRotate) pipeline = pipeline.rotate();
  const webpBuffer = await pipeline
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  if (useBlob) {
    const blob = await put(displayRelative, webpBuffer, { access: "public", contentType: "image/webp" });
    return { displayPath: blob.url, webpBuffer };
  }

  await mkdir(DISPLAY_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, displayRelative), webpBuffer);
  return { displayPath: displayRelative, webpBuffer };
}

/** Deletes a stored photo — a Blob URL when using cloud storage, a local file otherwise. */
export async function deletePhoto(pathOrUrl: string): Promise<void> {
  if (isUrl(pathOrUrl)) {
    await del(pathOrUrl).catch(() => {});
  } else {
    await fsUnlink(path.join(DATA_DIR, pathOrUrl)).catch(() => {});
  }
}

export function isUrl(pathOrUrl: string): boolean {
  return pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://");
}

export function photoAbsolutePath(relativePath: string): string {
  return path.join(DATA_DIR, relativePath);
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}
