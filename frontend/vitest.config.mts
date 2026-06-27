import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    env: {
      AUTH_SECRET: "test-secret",
      NEXT_PUBLIC_API_URL: "http://backend.test",
    },
    coverage: {
      provider: "v8",
      include: ["app/api/**/*.ts"],
      reporter: ["text", "json-summary"],
    },
  },
});
