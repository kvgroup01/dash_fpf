import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Evita que o Turbopack suba a raiz do workspace até um lockfile solto em
  // C:\Users\SCVP-AUXTRAF\package-lock.json (fora deste projeto).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
