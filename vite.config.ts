import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync } from "node:fs";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    {
      // Studio 的扩展目录校验要求 dist/index.mjs，而按旧约定取 dist/index.js 的宿主也存在。
      // 构建后把同名副本再写一份，让两种取法都能拿到产物（内容完全相同）。
      name: "emit-legacy-entry-name",
      closeBundle() {
        copyFileSync(
          path.resolve(__dirname, "dist/index.mjs"),
          path.resolve(__dirname, "dist/index.js"),
        );
      },
    },
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
      formats: ["es"],
      fileName: () => "index.mjs",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@avg-studio/sdk",
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
  },
});
