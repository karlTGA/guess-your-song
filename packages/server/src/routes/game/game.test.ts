import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../../test/helpers";

const TEST_UPLOAD_DIR = "./test-uploads-game";

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
        expect(state.currentRound.audioFilename).toBeDefined();
        expect(state.player).toBeDefined();
        expect(state.player.name).toBe("Alice");
        expect(state.player.timeline).toEqual([]);
        expect(state.player.score).toBe(0);
        expect(state.totalRounds).toBe(3);
        expect(state.currentRoundIndex).toBe(0);
    });
});

describe("public game creation", () => {
    let app: FastifyInstance;
    let token: string;

    beforeEach(async () => {
        app = await buildTestApp();
        token = await registerAndLogin(app);
    });

    it("user can list available playlists", async () => {
        // Create songs and playlist via admin
        const songs = [];
        for (const s of [
            { title: "Song A", artist: "A", year: 1980 },
            { title: "Song B", artist: "B", year: 1990 },
        ]) {
            const res = await app.inject({
                method: "POST",
                url: "/api/admin/songs",
                headers: { authorization: `Bearer ${token}` },
                payload: s,
            });
            songs.push(res.json());
        }

        await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                name: "Test Playlist",
                songs: songs.map((s) => s._id),
            },
        });

        // Public endpoint — no auth needed
        const response = await app.inject({
            method: "GET",
            url: "/api/game/playlists",
        });

        expect(response.statusCode).toBe(200);
        const playlists = response.json();
        expect(playlists).toHaveLength(1);
        expect(playlists[0].name).toBe("Test Playlist");
        expect(playlists[0].songCount).toBe(2);
    });

    it("user can create and auto-start a game by choosing a playlist", async () => {
        // Create songs and playlist via admin
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
                name: "Game Playlist",
                songs: songs.map((s) => s._id),
            },
        });
        const playlistId = playlistRes.json()._id;

        // Any user can create a game — no auth required
        const response = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: {
                playlistId,
                playerName: "Alice",
            },
        });

        expect(response.statusCode).toBe(201);
        const session = response.json();
        expect(session.code).toBeDefined();
        expect(session.code).toHaveLength(6);
        expect(session.status).toBe("playing");
        expect(session.players).toHaveLength(1);
        expect(session.players[0].name).toBe("Alice");
        expect(session.currentRoundIndex).toBe(0);
        expect(session.rounds).toHaveLength(1);
    });

    it("public game creation populates songOrder with all playlist songs", async () => {
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
                name: "Game Playlist 2",
                songs: songs.map((s) => s._id),
            },
        });
        const playlistId = playlistRes.json()._id;

        const response = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: { playlistId, playerName: "Bob" },
        });

        expect(response.statusCode).toBe(201);
        const session = response.json();
        expect(session.songOrder).toBeDefined();
        expect(session.songOrder).toHaveLength(3);
        const songIds = songs.map((s) => s._id);
        expect([...session.songOrder].sort()).toEqual([...songIds].sort());
        // First round uses first element of songOrder
        expect(session.rounds[0].songId).toBe(session.songOrder[0]);
    });

    it("cannot create a game with non-existent playlist", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: {
                playlistId: "000000000000000000000000",
                playerName: "Alice",
            },
        });

        expect(response.statusCode).toBe(404);
    });

    it("cannot create a game with an empty playlist", async () => {
        const playlistRes = await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "Empty Playlist", songs: [] },
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: {
                playlistId: playlistRes.json()._id,
                playerName: "Alice",
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it("user can create a game with a custom numberOfSongs", async () => {
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
                name: "Game Playlist",
                songs: songs.map((s) => s._id),
            },
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: {
                playlistId: playlistRes.json()._id,
                playerName: "Alice",
                numberOfSongs: 2,
            },
        });

        expect(response.statusCode).toBe(201);
        const session = response.json();
        expect(session.config.numberOfSongs).toBe(2);
        // songOrder still contains all playlist songs
        expect(session.songOrder).toHaveLength(3);
    });

    it("numberOfSongs defaults to playlist size when omitted", async () => {
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
                name: "Game Playlist",
                songs: songs.map((s) => s._id),
            },
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: {
                playlistId: playlistRes.json()._id,
                playerName: "Alice",
            },
        });

        expect(response.statusCode).toBe(201);
        const session = response.json();
        expect(session.config.numberOfSongs).toBe(3);
    });

    it("cannot create a game with numberOfSongs exceeding playlist size", async () => {
        const songs = [];
        for (const s of [
            { title: "Song A", artist: "A", year: 1980 },
            { title: "Song B", artist: "B", year: 1990 },
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
                name: "Game Playlist",
                songs: songs.map((s) => s._id),
            },
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: {
                playlistId: playlistRes.json()._id,
                playerName: "Alice",
                numberOfSongs: 5,
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it("cannot create a game with numberOfSongs less than 1", async () => {
        const songs = [];
        for (const s of [
            { title: "Song A", artist: "A", year: 1980 },
            { title: "Song B", artist: "B", year: 1990 },
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
                name: "Game Playlist",
                songs: songs.map((s) => s._id),
            },
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: {
                playlistId: playlistRes.json()._id,
                playerName: "Alice",
                numberOfSongs: 0,
            },
        });

        expect(response.statusCode).toBe(400);
    });
});

function createMultipartPayload(
    fields: Record<string, string>,
    file?: {
        fieldname: string;
        filename: string;
        content: Buffer;
        contentType: string;
    },
) {
    const boundary = `----TestBoundary${Date.now()}`;
    const parts: Buffer[] = [];

    for (const [key, value] of Object.entries(fields)) {
        parts.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
            ),
        );
    }

    if (file) {
        parts.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
            ),
        );
        parts.push(file.content);
        parts.push(Buffer.from("\r\n"));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));

    return {
        body: Buffer.concat(parts),
        contentType: `multipart/form-data; boundary=${boundary}`,
    };
}

describe("game endpoints include thumbnails", () => {
    let app: FastifyInstance;
    let token: string;

    beforeEach(async () => {
        app = await buildTestApp({ uploadDir: TEST_UPLOAD_DIR });
        token = await registerAndLogin(app);
    });

    afterEach(async () => {
        await app.close();
        if (fs.existsSync(TEST_UPLOAD_DIR)) {
            fs.rmSync(TEST_UPLOAD_DIR, { recursive: true });
        }
    });

    async function createSongWithThumbnail(
        title: string,
        artist: string,
        year: number,
    ) {
        const songRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title, artist, year },
        });
        const song = songRes.json();

        const fakeImage = Buffer.from("fake-thumb");
        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "thumbnail",
                filename: "cover.jpg",
                content: fakeImage,
                contentType: "image/jpeg",
            },
        );
        const thumbRes = await app.inject({
            method: "PUT",
            url: `/api/admin/songs/${song._id}/thumbnail`,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });
        return thumbRes.json();
    }

    it("game state includes thumbnailFilename for current round song", async () => {
        const song1 = await createSongWithThumbnail("Song A", "A", 1980);
        const song2 = await createSongWithThumbnail("Song B", "B", 1990);

        const playlistRes = await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                name: "Thumb Playlist",
                songs: [song1._id, song2._id],
            },
        });

        const sessionRes = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: {
                playlistId: playlistRes.json()._id,
                playerName: "Alice",
            },
        });
        const code = sessionRes.json().code;

        const stateRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${code}/state?playerName=Alice`,
        });

        expect(stateRes.statusCode).toBe(200);
        const state = stateRes.json();
        expect(state.currentRound.thumbnailFilename).toBeDefined();
        expect(state.currentRound.thumbnailFilename).toMatch(/\.jpg$/);
    });

    it("place response includes thumbnailFilename in song and timeline", async () => {
        const song1 = await createSongWithThumbnail("Song A", "A", 1980);
        const song2 = await createSongWithThumbnail("Song B", "B", 1990);

        const playlistRes = await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                name: "Thumb Playlist",
                songs: [song1._id, song2._id],
            },
        });

        const sessionRes = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: {
                playlistId: playlistRes.json()._id,
                playerName: "Alice",
            },
        });
        const code = sessionRes.json().code;

        const placeRes = await app.inject({
            method: "POST",
            url: `/api/game/sessions/${code}/place`,
            payload: { playerName: "Alice", position: 0 },
        });

        expect(placeRes.statusCode).toBe(200);
        const result = placeRes.json();
        expect(result.song.thumbnailFilename).toBeDefined();
        expect(result.player.timeline[0].thumbnailFilename).toBeDefined();
    });

    it("results include thumbnailFilename in player timelines", async () => {
        const song1 = await createSongWithThumbnail("Song A", "A", 1980);

        const playlistRes = await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                name: "Thumb Playlist",
                songs: [song1._id],
            },
        });

        const sessionRes = await app.inject({
            method: "POST",
            url: "/api/game/sessions",
            payload: {
                playlistId: playlistRes.json()._id,
                playerName: "Alice",
                numberOfSongs: 1,
            },
        });
        const code = sessionRes.json().code;

        // Place song (game finishes with 1 song)
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${code}/place`,
            payload: { playerName: "Alice", position: 0 },
        });

        const resultsRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${code}/results`,
        });

        expect(resultsRes.statusCode).toBe(200);
        const results = resultsRes.json();
        expect(results.players[0].timeline[0].thumbnailFilename).toBeDefined();
    });

    it("game playlists include thumbnailFilename and firstSongThumbnail", async () => {
        const song1 = await createSongWithThumbnail("Song A", "A", 1980);

        // Create playlist with its own thumbnail
        const playlistRes = await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                name: "Thumb Playlist",
                songs: [song1._id],
            },
        });
        const playlist = playlistRes.json();

        const fakeImage = Buffer.from("playlist-thumb");
        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "thumbnail",
                filename: "pl-cover.png",
                content: fakeImage,
                contentType: "image/png",
            },
        );
        await app.inject({
            method: "PUT",
            url: `/api/admin/playlists/${playlist._id}/thumbnail`,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/game/playlists",
        });

        expect(response.statusCode).toBe(200);
        const playlists = response.json();
        expect(playlists[0].thumbnailFilename).toBeDefined();
        expect(playlists[0].firstSongThumbnail).toBeDefined();
        expect(playlists[0].firstSongThumbnail).toMatch(/\.jpg$/);
    });
});
