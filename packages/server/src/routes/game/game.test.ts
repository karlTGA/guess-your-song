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

async function createSessionWithPlaylist(app: FastifyInstance, token: string) {
    const songs = [];
    for (const s of [
        { title: "Song 1980", artist: "A", year: 1980 },
        { title: "Song 1990", artist: "B", year: 1990 },
        { title: "Song 2000", artist: "C", year: 2000 },
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
        payload: { name: "Game Playlist", songs: songs.map((s) => s._id) },
    });

    const sessionRes = await app.inject({
        method: "POST",
        url: "/api/admin/sessions",
        headers: { authorization: `Bearer ${token}` },
        payload: { playlistId: playlistRes.json()._id },
    });

    return { session: sessionRes.json(), songs };
}

describe("game public API", () => {
    let app: FastifyInstance;
    let token: string;
    let sessionCode: string;
    let _songs: { _id: string; title: string; year: number }[];

    beforeEach(async () => {
        app = await buildTestApp();
        token = await registerAndLogin(app);
        const result = await createSessionWithPlaylist(app, token);
        sessionCode = result.session.code;
        _songs = result.songs;
    });

    it("player can join a session with code and name", async () => {
        const response = await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/join`,
            payload: { playerName: "Alice" },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.players).toHaveLength(1);
        expect(body.players[0].name).toBe("Alice");
        expect(body.players[0].score).toBe(0);
        expect(body.players[0].timeline).toEqual([]);
    });

    it("multiple players can join the same session", async () => {
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/join`,
            payload: { playerName: "Alice" },
        });
        const response = await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/join`,
            payload: { playerName: "Bob" },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().players).toHaveLength(2);
    });

    it("cannot join with duplicate name", async () => {
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/join`,
            payload: { playerName: "Alice" },
        });
        const response = await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/join`,
            payload: { playerName: "Alice" },
        });

        expect(response.statusCode).toBe(409);
    });

    it("cannot join a non-existent session", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/game/sessions/XXXXXX/join",
            payload: { playerName: "Alice" },
        });

        expect(response.statusCode).toBe(404);
    });

    it("player can retrieve session info by code", async () => {
        const response = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${sessionCode}`,
        });

        expect(response.statusCode).toBe(200);
        const session = response.json();
        expect(session.code).toBe(sessionCode);
        expect(session.status).toBe("waiting");
    });

    it("player can get current game state during play", async () => {
        // Join
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/join`,
            payload: { playerName: "Alice" },
        });

        // Admin starts the game
        await app.inject({
            method: "POST",
            url: `/api/admin/sessions/${sessionCode}/start`,
            headers: { authorization: `Bearer ${token}` },
        });

        const response = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${sessionCode}/state?playerName=Alice`,
        });

        expect(response.statusCode).toBe(200);
        const state = response.json();
        expect(state.status).toBe("playing");
        expect(state.currentRound).toBeDefined();
        expect(state.currentRound.songId).toBeDefined();
        expect(state.player).toBeDefined();
        expect(state.player.name).toBe("Alice");
        expect(state.player.timeline).toEqual([]);
        expect(state.player.score).toBe(0);
        expect(state.totalRounds).toBe(3);
        expect(state.currentRoundIndex).toBe(0);
    });
});
