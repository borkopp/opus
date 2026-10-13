import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Pure mobile helpers share this test runner; do not load Expo's sibling config.
  tsconfig: fileURLToPath(new URL("./tsconfig.json", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    restoreMocks: true,
  },
});
