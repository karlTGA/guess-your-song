import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../../test/helpers";

async function registerAndLogin(app: FastifyInstance) {
    await app.inject({
        method: "POST",
        url: "/api/admin/register",
        payload: { username: "admin", password: "testpass123" },
    });
    const loginRes = await app.inject({
        method: "POST",
        url: "/api/admin/login",
        payload: { username: "admin", password: "testpass123" },
    });
    return loginRes.json().token as string;
}

async function createPlaylistWithSongs(app: FastifyInstance, token: string) {
    const songs = [];
    for (const s of [
        { title: "Song A", artist: "A", year: 1980 },
        { title: "Song B", artist: "B", year: 1990 },
        { title: "Song C", artist: "C", year: 2000 },
    ]) {
        const res = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: s,
        });
        songs.push(res.json());
    }

    const playlistRes = await app.inject({
        method: "POST",
        url: "/api/admin/playlists",
        headers: { authorization: `Bearer ${token}` },
        payload: {
            name: "Test Playlist",
            songs: songs.map((s) => s._id),
        },
    });
    return playlistRes.json();
}

describe("admin game sessions API", () => {
    let app: FastifyInstance;
    let token: string;
    let playlist: { _id: string };

    beforeEach(async () => {
        app = await buildTestApp();
        token = await registerAndLogin(app);
        playlist = await createPlaylistWithSongs(app, token);
    });

    it("admin can create a game session from a playlist and gets join code", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/admin/sessions",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                playlistId: playlist._id,
            },
        });

        expect(response.statusCode).toBe(201);
        const session = response.json();
        expect(session.code).toBeDefined();
        expect(session.code).toHaveLength(6);
        expect(session.playlist).toBe(playlist._id);
        expect(session.status).toBe("waiting");
        expect(session.players).toEqual([]);
        expect(session.rounds).toEqual([]);
        expect(session.config.roundTimerSeconds).toBe(30);
        expect(session.config.maxPlayers).toBe(20);
    });

    it("admin can create a game session with custom config", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/admin/sessions",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                playlistId: playlist._id,
                config: { roundTimerSeconds: 60, maxPlayers: 10 },
            },
        });

        expect(response.statusCode).toBe(201);
        const session = response.json();
        expect(session.config.roundTimerSeconds).toBe(60);
        expect(session.config.maxPlayers).toBe(10);
    });

    it("join code is unique across sessions", async () => {
        const codes = new Set<string>();
        for (let i = 0; i < 5; i++) {
            const res = await app.inject({
                method: "POST",
                url: "/api/admin/sessions",
                headers: { authorization: `Bearer ${token}` },
                payload: { playlistId: playlist._id },
            });
            codes.add(res.json().code);
        }
        expect(codes.size).toBe(5);
    });

    it("admin can start a game session", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/sessions",
            headers: { authorization: `Bearer ${token}` },
            payload: { playlistId: playlist._id },
        });
        const session = createRes.json();

        const response = await app.inject({
            method: "POST",
            url: `/api/admin/sessions/${session.code}/start`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        const started = response.json();
        expect(started.status).toBe("playing");
        expect(started.currentRoundIndex).toBe(0);
        expect(started.rounds).toHaveLength(1);
        expect(started.rounds[0].startedAt).toBeDefined();
    });

    it("admin can list active sessions with player count and playlist name", async () => {
        // Create a waiting session
        const waitingRes = await app.inject({
            method: "POST",
            url: "/api/admin/sessions",
            headers: { authorization: `Bearer ${token}` },
            payload: { playlistId: playlist._id },
        });
        const waitingSession = waitingRes.json();

        // Create a playing session (start it)
        const playingRes = await app.inject({
            method: "POST",
            url: "/api/admin/sessions",
            headers: { authorization: `Bearer ${token}` },
            payload: { playlistId: playlist._id },
        });
        const playingSession = playingRes.json();
        await app.inject({
            method: "POST",
            url: `/api/admin/sessions/${playingSession.code}/start`,
            headers: { authorization: `Bearer ${token}` },
        });

        // Have a player join the playing session via game route
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${playingSession.code}/join`,
            payload: { playerName: "Alice" },
        });

        // Create a finished session (create, start, then play through all rounds)
        const finishedRes = await app.inject({
            method: "POST",
            url: "/api/admin/sessions",
            headers: { authorization: `Bearer ${token}` },
            payload: { playlistId: playlist._id },
        });
        const finishedSession = finishedRes.json();
        await app.inject({
            method: "POST",
            url: `/api/admin/sessions/${finishedSession.code}/start`,
            headers: { authorization: `Bearer ${token}` },
        });
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${finishedSession.code}/join`,
            payload: { playerName: "Bob" },
        });
        // Skip through all 3 rounds to finish the game
        for (let i = 0; i < 3; i++) {
            await app.inject({
                method: "POST",
                url: `/api/game/sessions/${finishedSession.code}/skip`,
                payload: { playerName: "Bob" },
            });
        }

        // GET active sessions
        const response = await app.inject({
            method: "GET",
            url: "/api/admin/sessions",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        const activeSessions = response.json();

        // Should only include waiting + playing, not finished
        expect(activeSessions).toHaveLength(2);

        const codes = activeSessions.map((s: { code: string }) => s.code);
        expect(codes).toContain(waitingSession.code);
        expect(codes).toContain(playingSession.code);
        expect(codes).not.toContain(finishedSession.code);

        // Check that each session has the expected shape
        for (const session of activeSessions) {
            expect(session.code).toBeDefined();
            expect(session.status).toMatch(/^(waiting|playing)$/);
            expect(session.playlist).toEqual(
                expect.objectContaining({
                    _id: playlist._id,
                    name: "Test Playlist",
                }),
            );
            expect(typeof session.playerCount).toBe("number");
            expect(typeof session.currentRoundIndex).toBe("number");
            expect(typeof session.totalRounds).toBe("number");
            expect(session.totalRounds).toBe(3); // playlist has 3 songs
            expect(session.config).toBeDefined();
            expect(session.createdAt).toBeDefined();
        }

        // Check player count for playing session (1 player joined)
        const playing = activeSessions.find(
            (s: { code: string }) => s.code === playingSession.code,
        );
        expect(playing.playerCount).toBe(1);
        expect(playing.status).toBe("playing");

        // Check waiting session has 0 players
        const waiting = activeSessions.find(
            (s: { code: string }) => s.code === waitingSession.code,
        );
        expect(waiting.playerCount).toBe(0);
        expect(waiting.status).toBe("waiting");
    });

    it("admin can delete a session", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/sessions",
            headers: { authorization: `Bearer ${token}` },
            payload: { playlistId: playlist._id },
        });
        const session = createRes.json();

        const response = await app.inject({
            method: "DELETE",
            url: `/api/admin/sessions/${session.code}`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(204);

        // Session should no longer exist
        const listRes = await app.inject({
            method: "GET",
            url: "/api/admin/sessions",
            headers: { authorization: `Bearer ${token}` },
        });
        const sessions = listRes.json();
        expect(
            sessions.find((s: { code: string }) => s.code === session.code),
        ).toBeUndefined();
    });

    it("delete returns 404 for non-existent session", async () => {
        const response = await app.inject({
            method: "DELETE",
            url: "/api/admin/sessions/NOPE99",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(404);
    });
});
