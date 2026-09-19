import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [tsconfigPaths()],
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
      fileParallelism: false,
      env,
    },
  };
});
