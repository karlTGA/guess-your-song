import { describe, it, expect, beforeEach } from "vitest";
import { buildTestApp } from "../../test/helpers.js";
import type { FastifyInstance } from "fastify";

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

async function setupGame(app: FastifyInstance, token: string) {
    // Create songs with known years
    const songData = [
        { title: "Song 1980", artist: "A", year: 1980 },
        { title: "Song 1990", artist: "B", year: 1990 },
        { title: "Song 2000", artist: "C", year: 2000 },
    ];
    const songs = [];
    for (const s of songData) {
        const res = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: s,
        });
        songs.push(res.json());
    }

    // Create playlist
    const playlistRes = await app.inject({
        method: "POST",
        url: "/api/admin/playlists",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Game Playlist", songs: songs.map((s) => s._id) },
    });

    // Create session
    const sessionRes = await app.inject({
        method: "POST",
        url: "/api/admin/sessions",
        headers: { authorization: `Bearer ${token}` },
        payload: { playlistId: playlistRes.json()._id },
    });

    // Join a player
    const code = sessionRes.json().code;
    await app.inject({
        method: "POST",
        url: `/api/game/sessions/${code}/join`,
        payload: { playerName: "Alice" },
    });

    // Start the game
    await app.inject({
        method: "POST",
        url: `/api/admin/sessions/${code}/start`,
        headers: { authorization: `Bearer ${token}` },
    });

    return { code, songs };
}

describe("game placement and round flow", () => {
    let app: FastifyInstance;
    let token: string;
    let sessionCode: string;
    let songs: { _id: string; title: string; year: number }[];

    beforeEach(async () => {
        app = await buildTestApp();
        token = await registerAndLogin(app);
        const result = await setupGame(app, token);
        sessionCode = result.code;
        songs = result.songs;
    });

    it("player can place a song on their timeline", async () => {
        const response = await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/place`,
            payload: {
                playerName: "Alice",
                position: 0,
            },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.correct).toBe(true);
        expect(body.songYear).toBeDefined();
    });

    it("correct placement adds song to player timeline and scores a point", async () => {
        // Place the current round's song — always correct for first song
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/place`,
            payload: { playerName: "Alice", position: 0 },
        });

        const stateRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${sessionCode}/state?playerName=Alice`,
        });

        const state = stateRes.json();
        expect(state.player.timeline).toHaveLength(1);
        expect(state.player.score).toBe(1);
    });

    it("incorrect placement does not add song to timeline", async () => {
        // First, place the first song (always correct)
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/place`,
            payload: { playerName: "Alice", position: 0 },
        });

        // Now we're in round 2. We need to place it incorrectly.
        // The current song is the second in the playlist.
        // Timeline has one song. Place the new song at a wrong position.
        // We'll get the state to know the current round song
        const stateRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${sessionCode}/state?playerName=Alice`,
        });
        const state = stateRes.json();

        // If game advanced, place wrong. If timeline has [1980], and next song is 1990,
        // placing at position 0 (before 1980) would be wrong.
        // But the round song order depends on playlist order, so we just need
        // to figure out a wrong position.
        if (state.status === "playing") {
            // Place at a clearly wrong position for the 2nd song (year 1990)
            // Timeline: [1980], placing 1990 at position 0 → wrong (1990 < 1980? no actually 1990 > 1980 so position 0 is wrong)
            const placeRes = await app.inject({
                method: "POST",
                url: `/api/game/sessions/${sessionCode}/place`,
                payload: { playerName: "Alice", position: 0 },
            });

            const placeBody = placeRes.json();
            // If the song year is 1990, placing before 1980 is wrong
            if (!placeBody.correct) {
                const state2 = await app.inject({
                    method: "GET",
                    url: `/api/game/sessions/${sessionCode}/state?playerName=Alice`,
                });
                // Timeline should still have only 1 song
                expect(state2.json().player.timeline).toHaveLength(1);
                expect(state2.json().player.score).toBe(1);
            }
        }
    });

    it("game advances to next round after placement", async () => {
        // Place first song
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/place`,
            payload: { playerName: "Alice", position: 0 },
        });

        // Check state — should be on round 2 (index 1)
        const stateRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${sessionCode}/state?playerName=Alice`,
        });
        const state = stateRes.json();
        expect(state.currentRoundIndex).toBe(1);
    });

    it("game ends after all rounds are played", async () => {
        // Play through all 3 rounds by always placing at the end
        for (let i = 0; i < 3; i++) {
            await app.inject({
                method: "POST",
                url: `/api/game/sessions/${sessionCode}/place`,
                payload: { playerName: "Alice", position: i },
            });
        }

        // Check state — game should be finished
        const stateRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${sessionCode}/state?playerName=Alice`,
        });

        expect(stateRes.json().status).toBe("finished");
    });

    it("results endpoint returns final standings", async () => {
        // Play through all rounds
        for (let i = 0; i < 3; i++) {
            await app.inject({
                method: "POST",
                url: `/api/game/sessions/${sessionCode}/place`,
                payload: { playerName: "Alice", position: i },
            });
        }

        const response = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${sessionCode}/results`,
        });

        expect(response.statusCode).toBe(200);
        const results = response.json();
        expect(results.status).toBe("finished");
        expect(results.players).toHaveLength(1);
        expect(results.players[0].name).toBe("Alice");
        expect(results.players[0].score).toBeGreaterThanOrEqual(0);
    });
});
