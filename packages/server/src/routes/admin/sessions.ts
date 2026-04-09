import crypto from "node:crypto";
import { DEFAULT_GAME_CONFIG } from "@guess-your-song/shared";
import type { FastifyInstance } from "fastify";
import { GameSessionModel } from "../../models/GameSession";
import { PlaylistModel } from "../../models/Playlist";
import { authenticate } from "../../plugins/auth";

function generateCode(): string {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}

async function generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
        const code = generateCode();
        const existing = await GameSessionModel.findOne({ code });
        if (!existing) return code;
    }
    throw new Error("Failed to generate unique code after 10 attempts");
}

export async function sessionRoutes(app: FastifyInstance) {
    app.addHook("onRequest", authenticate);

    app.get("/api/admin/sessions", async (_request, reply) => {
        const sessions = await GameSessionModel.find({
            status: { $in: ["waiting", "playing"] },
        }).populate("playlist", "name songs");

        const result = sessions.map((s) => {
            const playlist = s.playlist as unknown as {
                _id: string;
                name: string;
                songs: unknown[];
            };
            return {
                _id: s._id,
                code: s.code,
                status: s.status,
                playlist: { _id: playlist._id, name: playlist.name },
                playerCount: s.players.length,
                currentRoundIndex: s.currentRoundIndex,
                totalRounds: playlist.songs.length,
                config: s.config,
                createdAt: s.createdAt,
            };
        });

        return reply.send(result);
    });

    app.post("/api/admin/sessions", async (request, reply) => {
        const { playlistId, config } = request.body as {
            playlistId: string;
            config?: { roundTimerSeconds?: number; maxPlayers?: number };
        };

        const playlist = await PlaylistModel.findById(playlistId);
        if (!playlist) {
            return reply.status(404).send({ error: "Playlist not found" });
        }

        const code = await generateUniqueCode();
        const sessionConfig = {
            ...DEFAULT_GAME_CONFIG,
            ...config,
        };

        const session = await GameSessionModel.create({
            code,
            playlist: playlistId,
            config: sessionConfig,
        });

        return reply.status(201).send(session);
    });

    app.post("/api/admin/sessions/:code/start", async (request, reply) => {
        const { code } = request.params as { code: string };

        const session = await GameSessionModel.findOne({ code });
        if (!session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        if (session.status !== "waiting") {
            return reply
                .status(400)
                .send({ error: "Session already started or finished" });
        }

        const playlist = await PlaylistModel.findById(session.playlist);
        if (!playlist || playlist.songs.length === 0) {
            return reply.status(400).send({ error: "Playlist has no songs" });
        }

        session.status = "playing";
        session.currentRoundIndex = 0;
        session.rounds = [
            {
                songId: playlist.songs[0],
                startedAt: new Date(),
            },
        ];
        await session.save();

        return reply.send(session);
    });

    app.delete("/api/admin/sessions/:code", async (request, reply) => {
        const { code } = request.params as { code: string };

        const session = await GameSessionModel.findOneAndDelete({ code });
        if (!session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        return reply.status(204).send();
    });
}
