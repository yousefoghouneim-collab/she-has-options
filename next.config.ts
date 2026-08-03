import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Allow reaching the dev server from other devices on the same WiFi
  // (e.g. a phone), not just localhost.
  allowedDevOrigins: ["192.168.1.189"],
};

export default nextConfig;
