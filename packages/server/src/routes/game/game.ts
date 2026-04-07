import type { FastifyInstance } from "fastify";
import { GameSessionModel } from "../../models/GameSession.js";
import { PlaylistModel } from "../../models/Playlist.js";
import { SongModel } from "../../models/Song.js";
import { validatePlacement } from "../../services/gameService.js";

export async function gameRoutes(app: FastifyInstance) {
    app.get("/api/game/sessions/:code", async (request, reply) => {
        const { code } = request.params as { code: string };

        const session = await GameSessionModel.findOne({ code });
        if (!session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        return reply.send(session);
    });

    app.post("/api/game/sessions/:code/join", async (request, reply) => {
        const { code } = request.params as { code: string };
        const { playerName } = request.body as { playerName: string };

        const session = await GameSessionModel.findOne({ code });
        if (!session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        const existingPlayer = session.players.find(
            (p) => p.name === playerName,
        );
        if (existingPlayer) {
            return reply
                .status(409)
                .send({ error: "Player name already taken" });
        }

        session.players.push({
            name: playerName,
            joinedAt: new Date(),
            timeline: [],
            score: 0,
        });
        await session.save();

        return reply.send(session);
    });

    app.get("/api/game/sessions/:code/state", async (request, reply) => {
        const { code } = request.params as { code: string };
        const { playerName } = request.query as { playerName: string };

        const session = await GameSessionModel.findOne({ code });
        if (!session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        const player = session.players.find((p) => p.name === playerName);
        if (!player) {
            return reply.status(404).send({ error: "Player not found" });
        }

        const playlist = await PlaylistModel.findById(session.playlist);
        const totalRounds = playlist?.songs.length ?? 0;

        const currentRound =
            session.rounds.length > 0
                ? session.rounds[session.currentRoundIndex]
                : null;

        return reply.send({
            status: session.status,
            currentRound: currentRound ? { songId: currentRound.songId } : null,
            player: {
                name: player.name,
                timeline: player.timeline,
                score: player.score,
            },
            totalRounds,
            currentRoundIndex: session.currentRoundIndex,
        });
    });

    app.post("/api/game/sessions/:code/place", async (request, reply) => {
        const { code } = request.params as { code: string };
        const { playerName, position } = request.body as {
            playerName: string;
            position: number;
        };

        const session = await GameSessionModel.findOne({ code });
        if (!session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        if (session.status !== "playing") {
            return reply.status(400).send({ error: "Game is not in progress" });
        }

        const player = session.players.find((p) => p.name === playerName);
        if (!player) {
            return reply.status(404).send({ error: "Player not found" });
        }

        const currentRound = session.rounds[session.currentRoundIndex];
        if (!currentRound) {
            return reply.status(400).send({ error: "No active round" });
        }

        // Look up the current song's year
        const currentSong = await SongModel.findById(currentRound.songId);
        if (!currentSong) {
            return reply.status(500).send({ error: "Song not found" });
        }

        // Build timeline with years for validation
        const timelineWithYears: { songId: string; year: number }[] = [];
        for (const entry of player.timeline) {
            const song = await SongModel.findById(entry.songId);
            if (!song) {
                return reply
                    .status(500)
                    .send({ error: "Timeline song not found" });
            }
            timelineWithYears.push({
                songId: entry.songId.toString(),
                year: song.year,
            });
        }

        const result = validatePlacement({
            timeline: timelineWithYears,
            newSongYear: currentSong.year,
            position,
        });

        if (result.correct) {
            // Add to player's timeline at the correct position
            player.timeline.splice(position, 0, {
                songId: currentRound.songId,
                position,
            });
            player.score += 1;
        }

        // Advance to next round
        currentRound.endedAt = new Date();

        const playlist = await PlaylistModel.findById(session.playlist);
        if (!playlist) {
            return reply.status(500).send({ error: "Playlist not found" });
        }
        const totalSongs = playlist.songs.length;
        const nextRoundIndex = session.currentRoundIndex + 1;

        if (nextRoundIndex < totalSongs) {
            session.currentRoundIndex = nextRoundIndex;
            session.rounds.push({
                songId: playlist.songs[nextRoundIndex],
                startedAt: new Date(),
            });
        } else {
            session.status = "finished";
        }

        await session.save();

        return reply.send({
            correct: result.correct,
            songYear: currentSong.year,
            message: result.correct
                ? "Correct placement!"
                : `Wrong! The song was from ${currentSong.year}.`,
        });
    });

    app.get("/api/game/sessions/:code/results", async (request, reply) => {
        const { code } = request.params as { code: string };

        const session = await GameSessionModel.findOne({ code });
        if (!session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        return reply.send({
            status: session.status,
            players: session.players.map((p) => ({
                name: p.name,
                score: p.score,
                timeline: p.timeline,
            })),
        });
    });
}
