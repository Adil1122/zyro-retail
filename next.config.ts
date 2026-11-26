import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '**.run.app',
    '**.google.com',
    '**.googleusercontent.com',
    '127.0.0.1',
    'localhost',
  ],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
