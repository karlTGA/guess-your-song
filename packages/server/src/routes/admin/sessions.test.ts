import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../../test/helpers.js";

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
});
