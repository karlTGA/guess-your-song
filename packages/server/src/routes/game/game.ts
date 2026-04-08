import type { FastifyInstance } from "fastify";
import { GameSessionModel } from "../../models/GameSession";
import { PlaylistModel } from "../../models/Playlist";
import { SongModel } from "../../models/Song";
import { validatePlacement } from "../../services/gameService";

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

        // Hydrate current round with audio filename
        let currentRoundData = null;
        if (currentRound) {
            const roundSong = await SongModel.findById(currentRound.songId);
            currentRoundData = {
                songId: currentRound.songId,
                audioFilename: roundSong?.audioFilename ?? "",
                startedAt: currentRound.startedAt?.toISOString(),
            };
        }

        // Hydrate player timeline with song details
        const hydratedTimeline = await Promise.all(
            player.timeline.map(async (entry) => {
                const song = await SongModel.findById(entry.songId);
                return {
                    _id: entry.songId.toString(),
                    title: song?.title ?? "",
                    artist: song?.artist ?? "",
                    year: song?.year ?? 0,
                };
            }),
        );

        return reply.send({
            status: session.status,
            currentRound: currentRoundData,
            player: {
                name: player.name,
                timeline: hydratedTimeline,
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

        // Hydrate player timeline for response
        const hydratedTimeline = await Promise.all(
            player.timeline.map(async (entry) => {
                const song = await SongModel.findById(entry.songId);
                return {
                    _id: entry.songId.toString(),
                    title: song?.title ?? "",
                    artist: song?.artist ?? "",
                    year: song?.year ?? 0,
                };
            }),
        );

        return reply.send({
            correct: result.correct,
            status: session.status,
            song: {
                _id: currentSong._id.toString(),
                title: currentSong.title,
                artist: currentSong.artist,
                year: currentSong.year,
            },
            player: {
                name: player.name,
                timeline: hydratedTimeline,
                score: player.score,
            },
        });
    });

    app.get("/api/game/sessions/:code/results", async (request, reply) => {
        const { code } = request.params as { code: string };

        const session = await GameSessionModel.findOne({ code });
        if (!session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        const playersWithTimelines = await Promise.all(
            session.players.map(async (p) => {
                const hydratedTimeline = await Promise.all(
                    p.timeline.map(async (entry) => {
                        const song = await SongModel.findById(entry.songId);
                        return {
                            _id: entry.songId.toString(),
                            title: song?.title ?? "",
                            artist: song?.artist ?? "",
                            year: song?.year ?? 0,
                        };
                    }),
                );
                return {
                    name: p.name,
                    score: p.score,
                    timeline: hydratedTimeline,
                };
            }),
        );

        return reply.send({
            status: session.status,
            players: playersWithTimelines,
        });
    });
}
