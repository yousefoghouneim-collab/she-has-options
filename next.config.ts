import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Allow reaching the dev server from other devices on the same WiFi
  // (e.g. a phone), not just localhost.
  allowedDevOrigins: ["192.168.1.189"],
  // Garment extraction needs a 176MB local ONNX model on local disk, which
  // doesn't fit Vercel's serverless model — hide the option in the UI when
  // deployed there (still fully available when run locally).
  env: {
    NEXT_PUBLIC_GARMENT_EXTRACTION_AVAILABLE: process.env.VERCEL ? "false" : "true",
  },
};

export default nextConfig;
