import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
        globalSetup: ["src/test/global-setup.ts"],
        setupFiles: ["src/test/setup.ts"],
        testTimeout: 30000,
        fileParallelism: false,
    },
});
