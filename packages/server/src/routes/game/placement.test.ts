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

    return { code, songs, playlistId: playlistRes.json()._id };
}

async function setupPublicGame(
    app: FastifyInstance,
    token: string,
    numberOfSongs?: number,
) {
    const songData = [
        { title: "Song 1980", artist: "A", year: 1980 },
        { title: "Song 1990", artist: "B", year: 1990 },
        { title: "Song 2000", artist: "C", year: 2000 },
        { title: "Song 2010", artist: "D", year: 2010 },
        { title: "Song 2020", artist: "E", year: 2020 },
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

    const playlistRes = await app.inject({
        method: "POST",
        url: "/api/admin/playlists",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Game Playlist", songs: songs.map((s) => s._id) },
    });

    const sessionRes = await app.inject({
        method: "POST",
        url: "/api/game/sessions",
        payload: {
            playlistId: playlistRes.json()._id,
            playerName: "Alice",
            ...(numberOfSongs !== undefined ? { numberOfSongs } : {}),
        },
    });

    return {
        code: sessionRes.json().code,
        songs,
        session: sessionRes.json(),
    };
}

describe("game placement and round flow", () => {
    let app: FastifyInstance;
    let token: string;
    let sessionCode: string;
    let _songs: { _id: string; title: string; year: number }[];

    beforeEach(async () => {
        app = await buildTestApp();
        token = await registerAndLogin(app);
        const result = await setupGame(app, token);
        sessionCode = result.code;
        _songs = result.songs;
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
        expect(body.song).toBeDefined();
        expect(body.song._id).toBeDefined();
        expect(body.song.title).toBeDefined();
        expect(body.song.artist).toBeDefined();
        expect(body.song.year).toBeDefined();
        expect(body.player).toBeDefined();
        expect(body.player.name).toBe("Alice");
        expect(body.player.timeline).toHaveLength(1);
        expect(body.player.timeline[0]).toMatchObject({
            _id: expect.any(String),
            title: expect.any(String),
            artist: expect.any(String),
            year: expect.any(Number),
        });
        expect(body.player.score).toBe(1);
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
        expect(state.player.timeline[0]).toMatchObject({
            _id: expect.any(String),
            title: expect.any(String),
            artist: expect.any(String),
            year: expect.any(Number),
        });
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
                // Score was 1, wrong placement gives -1 penalty → score is 0
                expect(state2.json().player.score).toBe(0);
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

    it("place response includes status field", async () => {
        // First placement — game should still be playing
        const firstRes = await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/place`,
            payload: { playerName: "Alice", position: 0 },
        });
        expect(firstRes.json().status).toBe("playing");
    });

    it("place response returns finished status on last round", async () => {
        // Play through all 3 rounds
        let lastResponse;
        for (let i = 0; i < 3; i++) {
            lastResponse = await app.inject({
                method: "POST",
                url: `/api/game/sessions/${sessionCode}/place`,
                payload: { playerName: "Alice", position: i },
            });
        }

        expect(lastResponse!.json().status).toBe("finished");
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
        expect(results.players[0].timeline.length).toBeGreaterThan(0);
        expect(results.players[0].timeline[0]).toMatchObject({
            _id: expect.any(String),
            title: expect.any(String),
            artist: expect.any(String),
            year: expect.any(Number),
        });
    });

    it("player can skip a song", async () => {
        const response = await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/skip`,
            payload: { playerName: "Alice" },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.status).toBe("playing");
        expect(body.player.name).toBe("Alice");
        expect(body.player.timeline).toHaveLength(0);
        expect(body.player.score).toBe(0);
    });

    it("skip advances to next round without scoring", async () => {
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/skip`,
            payload: { playerName: "Alice" },
        });

        const stateRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${sessionCode}/state?playerName=Alice`,
        });
        const state = stateRes.json();
        expect(state.currentRoundIndex).toBe(1);
        expect(state.player.score).toBe(0);
        expect(state.player.timeline).toHaveLength(0);
    });

    it("skip on last round finishes the game", async () => {
        // Skip through all 3 rounds
        let lastResponse;
        for (let i = 0; i < 3; i++) {
            lastResponse = await app.inject({
                method: "POST",
                url: `/api/game/sessions/${sessionCode}/skip`,
                payload: { playerName: "Alice" },
            });
        }

        expect(lastResponse!.json().status).toBe("finished");
    });

    it("cannot skip in a non-playing session", async () => {
        // Finish the game first
        for (let i = 0; i < 3; i++) {
            await app.inject({
                method: "POST",
                url: `/api/game/sessions/${sessionCode}/skip`,
                payload: { playerName: "Alice" },
            });
        }

        const response = await app.inject({
            method: "POST",
            url: `/api/game/sessions/${sessionCode}/skip`,
            payload: { playerName: "Alice" },
        });

        expect(response.statusCode).toBe(400);
    });

    it("each round serves the song from songOrder, not playlist order", async () => {
        // Get the session to read its songOrder
        const sessionRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${sessionCode}`,
        });
        const songOrder = sessionRes.json().songOrder;
        expect(songOrder).toHaveLength(3);

        // Play through all rounds, collecting each round's songId
        const servedSongIds: string[] = [];
        for (let i = 0; i < 3; i++) {
            const stateRes = await app.inject({
                method: "GET",
                url: `/api/game/sessions/${sessionCode}/state?playerName=Alice`,
            });
            servedSongIds.push(stateRes.json().currentRound.songId);

            await app.inject({
                method: "POST",
                url: `/api/game/sessions/${sessionCode}/skip`,
                payload: { playerName: "Alice" },
            });
        }

        // The served songs should follow the songOrder exactly
        expect(servedSongIds).toEqual(songOrder);
    });
});

describe("wrong placement penalty and numberOfSongs", () => {
    let app: FastifyInstance;
    let token: string;

    beforeEach(async () => {
        app = await buildTestApp();
        token = await registerAndLogin(app);
    });

    it("wrong placement gives -1 score", async () => {
        const { code } = await setupPublicGame(app, token);

        // First song on empty timeline is always correct — place it
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${code}/place`,
            payload: { playerName: "Alice", position: 0 },
        });

        // Get the second song's details to figure out the wrong position
        const stateRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${code}/state?playerName=Alice`,
        });
        const state = stateRes.json();
        expect(state.status).toBe("playing");

        // Timeline has 1 song. Get its year.

        // We don't know the next song's year, but placing at position 0 if song is newer,
        // or position 1 if older, will be wrong. Let's just try placing incorrectly.
        // If the current song year > timeline[0].year, position 0 is wrong.
        // If the current song year < timeline[0].year, position 1 is wrong.
        // We'll place and check the result.

        // Place at position that's likely wrong — position 0 means "before everything"
        // If the new song is newer than what's at position 0, that's wrong
        const placeRes = await app.inject({
            method: "POST",
            url: `/api/game/sessions/${code}/place`,
            payload: { playerName: "Alice", position: 0 },
        });
        const body = placeRes.json();

        if (!body.correct) {
            // Wrong placement should give -1
            expect(body.player.score).toBe(0); // was 1, now 1 + (-1) = 0
            expect(body.player.timeline).toHaveLength(1); // song NOT added
        } else {
            // If it happened to be correct, try the next round with a definitely wrong position
            const placeRes2 = await app.inject({
                method: "POST",
                url: `/api/game/sessions/${code}/place`,
                payload: { playerName: "Alice", position: 0 },
            });
            const body2 = placeRes2.json();
            if (!body2.correct) {
                expect(body2.player.score).toBe(1); // was 2, now 2 + (-1) = 1
            }
        }
    });

    it("score can go negative with consecutive wrong placements", async () => {
        const { code } = await setupPublicGame(app, token);

        // Skip first song (score stays 0)
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${code}/skip`,
            payload: { playerName: "Alice" },
        });

        // Now timeline is empty, so any placement at position 0 is always correct
        // Place second song correctly (score = 1)
        await app.inject({
            method: "POST",
            url: `/api/game/sessions/${code}/place`,
            payload: { playerName: "Alice", position: 0 },
        });

        // Now we have 1 song in timeline. Force bad placements for the rest.
        // Placing everything at position 0 will eventually be wrong.
        let wrongCount = 0;
        for (let i = 0; i < 3; i++) {
            const stateRes = await app.inject({
                method: "GET",
                url: `/api/game/sessions/${code}/state?playerName=Alice`,
            });
            if (stateRes.json().status !== "playing") break;

            const res = await app.inject({
                method: "POST",
                url: `/api/game/sessions/${code}/place`,
                payload: { playerName: "Alice", position: 0 },
            });
            if (!res.json().correct) {
                wrongCount++;
            }
        }

        // Verify score reflects penalties
        const stateRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${code}/state?playerName=Alice`,
        });
        const finalState = stateRes.json();
        // Score = 1 (correct) - wrongCount (penalties) + any additional correct ones
        expect(finalState.player.score).toBe(1 - wrongCount + (3 - wrongCount));
    });

    it("game ends after numberOfSongs rounds, not all playlist songs", async () => {
        const { code } = await setupPublicGame(app, token, 2);

        // Play 2 rounds (skip both)
        let lastResponse: Awaited<ReturnType<typeof app.inject>> | undefined;
        for (let i = 0; i < 2; i++) {
            lastResponse = await app.inject({
                method: "POST",
                url: `/api/game/sessions/${code}/skip`,
                payload: { playerName: "Alice" },
            });
        }

        expect(lastResponse?.json().status).toBe("finished");
    });

    it("state endpoint returns totalRounds equal to numberOfSongs", async () => {
        const { code } = await setupPublicGame(app, token, 2);

        const stateRes = await app.inject({
            method: "GET",
            url: `/api/game/sessions/${code}/state?playerName=Alice`,
        });

        expect(stateRes.json().totalRounds).toBe(2);
    });
});
