import fs from "node:fs";
import path from "node:path";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import mongoose from "mongoose";
import type { AppConfig } from "./config";
import { authRoutes } from "./routes/admin/auth";
import { playlistRoutes } from "./routes/admin/playlists";
import { sessionRoutes } from "./routes/admin/sessions";
import { songRoutes } from "./routes/admin/songs";
import { gameRoutes } from "./routes/game/game";
import { StorageService } from "./services/storageService";

declare module "fastify" {
    interface FastifyInstance {
        storageService: StorageService;
        thumbnailStorageService: StorageService;
    }
}

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
    const app = Fastify({
        logger: process.env.NODE_ENV !== "test",
    });

    const wasConnected = mongoose.connection.readyState === 1;
    if (!wasConnected) {
        await mongoose.connect(config.mongoUri);
    }

    const storageService = new StorageService(config.uploadDir);
    app.decorate("storageService", storageService);

    const thumbnailStorageService = new StorageService(
        path.join(config.uploadDir, "thumbnails"),
    );
    app.decorate("thumbnailStorageService", thumbnailStorageService);

    app.addHook("onClose", async () => {
        if (!wasConnected) {
            await mongoose.disconnect();
        }
    });

    await app.register(cors, { origin: true });
    await app.register(jwt, { secret: config.jwtSecret });
    await app.register(multipart);
    await app.register(fastifyStatic, {
        root: path.resolve(config.uploadDir),
        prefix: "/audio/",
        decorateReply: false,
    });
    await app.register(fastifyStatic, {
        root: path.resolve(config.uploadDir, "thumbnails"),
        prefix: "/thumbnails/",
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
