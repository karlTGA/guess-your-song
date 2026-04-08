import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";
import type { AppConfig } from "../config";

export function getTestConfig(overrides?: Partial<AppConfig>): AppConfig {
    return {
        port: 0,
        host: "127.0.0.1",
        mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/test",
        jwtSecret: "test-secret",
        uploadDir: "./test-uploads",
        ...overrides,
    };
}

export async function buildTestApp(
    overrides?: Partial<AppConfig>,
): Promise<FastifyInstance> {
    const config = getTestConfig(overrides);
    const app = await buildApp(config);
    return app;
}
