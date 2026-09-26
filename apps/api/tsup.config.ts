import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  // O pacote compartilhado exporta TypeScript puro: embute no bundle.
  noExternal: ["@router-map/shared"],
});
