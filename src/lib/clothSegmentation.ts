import { createWriteStream } from "node:fs";
import { mkdir, rename, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import * as ort from "onnxruntime-node";
import sharp from "sharp";

// Isolates the garment region from a "wearing it" photo — removes the
// person's body and the background, keeping just the clothing as it looked
// worn. Uses u2net_cloth_seg (danielgatis/rembg), a free model trained to
// classify each pixel as background / upper-body garment / lower-body
// garment / full-body garment (dress). Runs entirely locally via ONNX.
//
// Exact preprocessing (resize to 768x768, divide by the image's own max
// pixel value rather than a flat 255, then ImageNet mean/std normalize) is
// copied from the reference implementation's base.py so results match.

const MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_cloth_seg.onnx";
// Vercel's deployed function bundle is read-only — only /tmp is writable,
// and it persists only for the life of that warm container, so each cold
// start re-downloads the model once and reuses it for subsequent requests
// on that same instance.
const MODEL_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "models") : path.join(process.cwd(), "data", "models");
const MODEL_PATH = path.join(MODEL_DIR, "u2net_cloth_seg.onnx");
const MIN_MODEL_BYTES = 100 * 1024 * 1024; // sanity check — real file is ~176MB

const INPUT_SIZE = 768;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let downloadPromise: Promise<void> | null = null;

async function ensureModelDownloaded(): Promise<void> {
  try {
    const s = await stat(MODEL_PATH);
    if (s.size >= MIN_MODEL_BYTES) return;
  } catch {
    // not present, fall through to download
  }

  if (!downloadPromise) {
    downloadPromise = (async () => {
      await mkdir(MODEL_DIR, { recursive: true });
      const tmpPath = `${MODEL_PATH}.download`;
      const res = await fetch(MODEL_URL);
      if (!res.ok || !res.body) throw new Error(`Failed to download cloth segmentation model: ${res.status}`);
      // Stream straight to disk instead of buffering all ~176MB in memory —
      // matters on a serverless function with a tight memory ceiling.
      await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(tmpPath));
      await rename(tmpPath, MODEL_PATH);
    })();
  }
  await downloadPromise;
}

async function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    // Vercel's serverless functions cap memory at 2048MB (Hobby plan). ORT's default
    // arena allocator pre-reserves and reuses large memory blocks across the graph,
    // which spiked peak usage past that ceiling (SIGKILL) on this model. Disabling
    // the arena/mem-pattern planner trades some speed for a much smaller footprint.
    sessionPromise = ensureModelDownloaded().then(() =>
      ort.InferenceSession.create(MODEL_PATH, {
        graphOptimizationLevel: "basic",
        enableCpuMemArena: false,
        enableMemPattern: false,
        executionMode: "sequential",
      })
    );
  }
  return sessionPromise;
}

export class SegmentationNotFoundError extends Error {}

/**
 * Returns a WebP buffer (with alpha) containing just the garment region,
 * cropped to its bounding box. Throws SegmentationNotFoundError if no
 * clothing region was confidently detected, so the caller can fall back to
 * the original photo instead of the upload failing outright.
 */
export async function extractGarment(inputBuffer: Buffer): Promise<Buffer> {
  const session = await getSession();

  const original = sharp(inputBuffer).rotate();
  const meta = await original.metadata();
  const width = meta.width!;
  const height = meta.height!;

  const { data: rgbData } = await original
    .clone()
    .removeAlpha()
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // rgbData is HWC uint8. Replicate rembg's exact normalization: divide by
  // the image's own max pixel value (not a flat 255), then ImageNet mean/std.
  let maxVal = 1e-6;
  for (let i = 0; i < rgbData.length; i++) if (rgbData[i] > maxVal) maxVal = rgbData[i];

  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  const chw = new Float32Array(3 * pixelCount);
  for (let p = 0; p < pixelCount; p++) {
    for (let c = 0; c < 3; c++) {
      const v = rgbData[p * 3 + c] / maxVal;
      chw[c * pixelCount + p] = (v - MEAN[c]) / STD[c];
    }
  }

  const inputName = session.inputNames[0];
  const tensor = new ort.Tensor("float32", chw, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const outputs = await session.run({ [inputName]: tensor });
  const outputTensor = outputs[session.outputNames[0]];
  const logits = outputTensor.data as Float32Array;
  const numClasses = outputTensor.dims[1]; // expected 4: background, upper, lower, full

  // Per-pixel argmax + softmax confidence, and a running count per class to
  // find the dominant garment class (upper/lower/full) in this photo.
  const classAtPixel = new Uint8Array(pixelCount);
  const confidenceAtPixel = new Float32Array(pixelCount);
  const classCounts = new Array(numClasses).fill(0);

  for (let p = 0; p < pixelCount; p++) {
    let maxLogit = -Infinity;
    let maxClass = 0;
    for (let c = 0; c < numClasses; c++) {
      const v = logits[c * pixelCount + p];
      if (v > maxLogit) {
        maxLogit = v;
        maxClass = c;
      }
    }
    let sumExp = 0;
    for (let c = 0; c < numClasses; c++) sumExp += Math.exp(logits[c * pixelCount + p] - maxLogit);
    confidenceAtPixel[p] = 1 / sumExp; // softmax prob of the winning class
    classAtPixel[p] = maxClass;
    classCounts[maxClass]++;
  }

  let dominantClass = 0;
  let dominantCount = 0;
  for (let c = 1; c < numClasses; c++) {
    if (classCounts[c] > dominantCount) {
      dominantCount = classCounts[c];
      dominantClass = c;
    }
  }

  if (dominantClass === 0 || dominantCount < pixelCount * 0.02) {
    throw new SegmentationNotFoundError("No clothing region confidently detected");
  }

  const alpha768 = Buffer.alloc(pixelCount);
  for (let p = 0; p < pixelCount; p++) {
    alpha768[p] = classAtPixel[p] === dominantClass ? Math.round(confidenceAtPixel[p] * 255) : 0;
  }

  // Upscale the alpha mask back to the original (pre-stretch) resolution —
  // using the same forced fill so it exactly cancels the earlier stretch.
  const alphaFull = await sharp(alpha768, { raw: { width: INPUT_SIZE, height: INPUT_SIZE, channels: 1 } })
    .resize(width, height, { fit: "fill", kernel: "lanczos3" })
    .raw()
    .toBuffer();

  const rgbFull = await original.clone().removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    rgba[p * 4] = rgbFull[p * 3];
    rgba[p * 4 + 1] = rgbFull[p * 3 + 1];
    rgba[p * 4 + 2] = rgbFull[p * 3 + 2];
    rgba[p * 4 + 3] = alphaFull[p];
  }

  // Bounding box of visible (alpha > threshold) pixels, with a small margin.
  const threshold = 15;
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alphaFull[y * width + x] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const marginX = Math.round((maxX - minX) * 0.04);
  const marginY = Math.round((maxY - minY) * 0.04);
  const left = Math.max(0, minX - marginX);
  const top = Math.max(0, minY - marginY);
  const right = Math.min(width, maxX + marginX + 1);
  const bottom = Math.min(height, maxY + marginY + 1);

  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: right - left, height: bottom - top })
    .webp({ quality: 90 })
    .toBuffer();
}
