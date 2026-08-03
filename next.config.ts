import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Allow reaching the dev server from other devices on the same WiFi
  // (e.g. a phone), not just localhost.
  allowedDevOrigins: ["192.168.1.189"],
  // Photos live in Vercel Blob when a token is configured (see src/lib/storage.ts) —
  // next/image refuses to optimize any remote host that isn't explicitly allowlisted.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  env: {
    // Garment extraction is unreliable on Vercel's serverless functions (large
    // ONNX model, tight memory ceiling) — keep it available for local dev only
    // until that's sorted out. Unchecked/default uploads always save the
    // original photo either way.
    NEXT_PUBLIC_GARMENT_EXTRACTION_AVAILABLE: process.env.VERCEL ? "false" : "true",
  },
  // onnxruntime-node (used for garment extraction) ships prebuilt native
  // binaries for every OS/arch — left to its own defaults, Next's output
  // tracing can pull all of them into the deployed function and blow past
  // Vercel's function size limit. Only linux/x64 runs on Vercel, so include
  // just that and drop the rest.
  outputFileTracingIncludes: {
    "/api/items": ["./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**/*"],
  },
  outputFileTracingExcludes: {
    "/api/items": [
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/arm64/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v6/darwin/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v6/win32/**/*",
    ],
  },
};

export default nextConfig;
