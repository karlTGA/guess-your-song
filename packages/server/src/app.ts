import fs from "node:fs";
import path from "node:path";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppConfig } from "./config.js";
import { authRoutes } from "./routes/admin/auth.js";
import { playlistRoutes } from "./routes/admin/playlists.js";
import { sessionRoutes } from "./routes/admin/sessions.js";
import { songRoutes } from "./routes/admin/songs.js";
import { gameRoutes } from "./routes/game/game.js";
import { StorageService } from "./services/storageService.js";

declare module "fastify" {
    interface FastifyInstance {
        storageService: StorageService;
    }
}

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
    const app = Fastify({
        logger: process.env.NODE_ENV !== "test",
    });

    const storageService = new StorageService(config.uploadDir);
    app.decorate("storageService", storageService);

    await app.register(cors, { origin: true });
    await app.register(jwt, { secret: config.jwtSecret });
    await app.register(multipart);
    await app.register(fastifyStatic, {
        root: path.resolve(config.uploadDir),
        prefix: "/audio/",
        decorateReply: false,
    });

    app.get("/api/health", async () => {
        return { status: "ok" };
    });

    await app.register(authRoutes);
    await app.register(songRoutes);
    await app.register(playlistRoutes);
    await app.register(sessionRoutes);
    await app.register(gameRoutes);

    // Serve web frontend in production
    const webDistPath = config.webDistDir
        ? path.resolve(config.webDistDir)
        : null;
    if (webDistPath && fs.existsSync(webDistPath)) {
        await app.register(fastifyStatic, {
            root: webDistPath,
            prefix: "/",
            decorateReply: false,
            wildcard: false,
        });

        app.setNotFoundHandler((_request, reply) => {
            return reply.sendFile("index.html", webDistPath);
        });
    }

    return app;
}
