import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O pacote compartilhado é TypeScript puro.
  transpilePackages: ["@router-map/shared"],
};

export default nextConfig;
