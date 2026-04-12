import { HttpResponse, http } from "msw";

// Default mock data
const songs = [
    {
        _id: "song1",
        title: "Bohemian Rhapsody",
        artist: "Queen",
        year: 1975,
        audioFilename: "abc.mp3",
        thumbnailFilename: "thumb1.jpg",
        createdAt: "2024-01-01",
    },
    {
        _id: "song2",
        title: "Billie Jean",
        artist: "Michael Jackson",
        year: 1982,
        audioFilename: "def.mp3",
        thumbnailFilename: "thumb2.jpg",
        createdAt: "2024-01-02",
    },
];

const playlists = [
    {
        _id: "pl1",
        name: "Classic Hits",
        description: "Best classics",
        thumbnailFilename: "pl-thumb1.jpg",
        songs: ["song1", "song2"],
        createdAt: "2024-01-01",
    },
];

const initialSessions = [
    {
        _id: "sess1",
        code: "ABC123",
        status: "waiting",
        playlist: { _id: "pl1", name: "Classic Hits" },
        playerCount: 0,
        currentRoundIndex: 0,
        totalRounds: 2,
        config: { roundTimerSeconds: 30, maxPlayers: 20 },
        createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
        _id: "sess2",
        code: "DEF456",
        status: "playing",
        playlist: { _id: "pl1", name: "Classic Hits" },
        playerCount: 3,
        currentRoundIndex: 1,
        totalRounds: 2,
        config: { roundTimerSeconds: 30, maxPlayers: 20 },
        createdAt: "2024-01-02T00:00:00.000Z",
    },
];

let sessions: Record<string, unknown>[] = structuredClone(initialSessions);

export function resetMockData() {
    sessions = structuredClone(initialSessions);
}

export const handlers = [
    // Auth
    http.post("/api/admin/login", async ({ request }) => {
        const body = (await request.json()) as {
            username: string;
            password: string;
        };
        if (body.username === "admin" && body.password === "password") {
            return HttpResponse.json({
                token: "fake-jwt-token",
                admin: { _id: "admin1", username: "admin" },
            });
        }
        return HttpResponse.json(
            { error: "Invalid credentials" },
            { status: 401 },
        );
    }),

    http.post("/api/admin/register", async () => {
        return HttpResponse.json(
            {
                token: "fake-jwt-token",
                admin: { _id: "admin1", username: "admin" },
            },
            { status: 201 },
        );
    }),

    // Songs
    http.get("/api/admin/songs", () => {
        return HttpResponse.json(songs);
    }),

    http.post("/api/admin/songs", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
            { _id: "song-new", ...body, createdAt: "2024-01-03" },
            { status: 201 },
        );
    }),

    http.put("/api/admin/songs/:id", async ({ request, params }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const existing = songs.find((s) => s._id === params.id);
        return HttpResponse.json({ ...existing, ...body, _id: params.id });
    }),

    http.delete("/api/admin/songs/:id", () => {
        return new HttpResponse(null, { status: 204 });
    }),

    http.post("/api/admin/songs/upload", () => {
        return HttpResponse.json(
            { _id: "song-uploaded", audioFilename: "uploaded.mp3" },
            { status: 201 },
        );
    }),

    http.post("/api/admin/songs/extract-metadata", () => {
        return HttpResponse.json({
            title: "Mock Title",
            artist: "Mock Artist",
            year: 2020,
            duration: 180,
            thumbnail: "data:image/jpeg;base64,/9j/mock",
        });
    }),

    http.put("/api/admin/songs/:id/audio", ({ params }) => {
        return HttpResponse.json({
            _id: params.id,
            title: "Bohemian Rhapsody",
            artist: "Queen",
            year: 1975,
            audioFilename: "new-audio.mp3",
        });
    }),

    http.put("/api/admin/songs/:id/thumbnail", ({ params }) => {
        return HttpResponse.json({
            _id: params.id,
            title: "Bohemian Rhapsody",
            artist: "Queen",
            year: 1975,
            thumbnailFilename: "new-thumb.jpg",
        });
    }),

    // Playlists
    http.get("/api/admin/playlists", () => {
        return HttpResponse.json(playlists);
    }),

    http.get("/api/admin/playlists/:id", ({ params }) => {
        return HttpResponse.json({
            ...playlists[0],
            _id: params.id,
            songs: songs,
        });
    }),

    http.post("/api/admin/playlists", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
            { _id: "pl-new", ...body, createdAt: "2024-01-03" },
            { status: 201 },
        );
    }),

    http.put("/api/admin/playlists/:id", async ({ request, params }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ _id: params.id, ...body });
    }),

    http.delete("/api/admin/playlists/:id", () => {
        return new HttpResponse(null, { status: 204 });
    }),

    http.put("/api/admin/playlists/:id/thumbnail", ({ params }) => {
        return HttpResponse.json({
            _id: params.id,
            name: "Classic Hits",
            thumbnailFilename: "new-pl-thumb.jpg",
        });
    }),

    // Sessions
    http.get("/api/admin/sessions", () => {
        return HttpResponse.json(sessions);
    }),

    http.post("/api/admin/sessions", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const newSession = {
            _id: "sess-new",
            code: "XYZ789",
            status: "waiting",
            playlist: { _id: body.playlistId, name: "Classic Hits" },
            playerCount: 0,
            currentRoundIndex: 0,
            totalRounds: 2,
            config: {
                roundTimerSeconds: 30,
                maxPlayers: 20,
                ...((body.config as object) || {}),
            },
            createdAt: new Date().toISOString(),
        };
        sessions.push(newSession);
        return HttpResponse.json(newSession, { status: 201 });
    }),

    http.post("/api/admin/sessions/:code/start", ({ params }) => {
        const session = sessions.find((s) => s.code === params.code);
        if (session) {
            session.status = "playing";
        }
        return HttpResponse.json({
            _id: "sess-new",
            code: params.code,
            status: "playing",
        });
    }),

    http.delete("/api/admin/sessions/:code", ({ params }) => {
        const index = sessions.findIndex((s) => s.code === params.code);
        if (index !== -1) {
            sessions.splice(index, 1);
        }
        return new HttpResponse(null, { status: 204 });
    }),

    // Game (public)
    http.get("/api/game/playlists", () => {
        return HttpResponse.json([
            {
                _id: "pl1",
                name: "Classic Hits",
                description: "Best classics",
                songCount: 2,
                thumbnailFilename: "pl-thumb1.jpg",
                firstSongThumbnail: "thumb1.jpg",
            },
        ]);
    }),

    http.post("/api/game/sessions", async ({ request }) => {
        const body = (await request.json()) as {
            playlistId: string;
            playerName: string;
            numberOfSongs?: number;
        };
        return HttpResponse.json(
            {
                _id: "sess-new",
                code: "NEW123",
                playlist: body.playlistId,
                status: "playing",
                config: {
                    roundTimerSeconds: 30,
                    maxPlayers: 20,
                    numberOfSongs: body.numberOfSongs ?? 2,
                },
                players: [
                    {
                        name: body.playerName,
                        joinedAt: new Date().toISOString(),
                        timeline: [],
                        score: 0,
                    },
                ],
                rounds: [
                    { songId: "song1", startedAt: new Date().toISOString() },
                ],
                currentRoundIndex: 0,
            },
            { status: 201 },
        );
    }),

    http.get("/api/game/sessions/:code", ({ params }) => {
        if (params.code === "ABC123") {
            return HttpResponse.json({
                code: "ABC123",
                status: "waiting",
                config: { roundTimerSeconds: 30, maxPlayers: 20 },
                playerCount: 0,
            });
        }
        return HttpResponse.json(
            { error: "Session not found" },
            { status: 404 },
        );
    }),

    http.post("/api/game/sessions/:code/join", async ({ params, request }) => {
        const body = (await request.json()) as { playerName: string };
        if (params.code !== "ABC123") {
            return HttpResponse.json(
                { error: "Session not found" },
                { status: 404 },
            );
        }
        return HttpResponse.json({
            message: "Joined successfully",
            player: {
                name: body.playerName,
                joinedAt: new Date().toISOString(),
                timeline: [],
                score: 0,
            },
        });
    }),

    http.get("/api/game/sessions/:code/state", ({ request }) => {
        const url = new URL(request.url);
        const playerName = url.searchParams.get("playerName");
        return HttpResponse.json({
            status: "playing",
            currentRound: {
                songId: "song1",
                audioFilename: "abc.mp3",
                thumbnailFilename: "thumb1.jpg",
                startedAt: new Date().toISOString(),
            },
            player: {
                name: playerName,
                timeline: [],
                score: 0,
            },
            totalRounds: 2,
            currentRoundIndex: 0,
        });
    }),

    http.post("/api/game/sessions/:code/place", async ({ request }) => {
        const body = (await request.json()) as {
            playerName: string;
            position: number;
        };
        return HttpResponse.json({
            correct: true,
            status: "playing",
            song: {
                _id: "song1",
                title: "Bohemian Rhapsody",
                artist: "Queen",
                year: 1975,
                thumbnailFilename: "thumb1.jpg",
            },
            player: {
                name: body.playerName,
                timeline: [
                    {
                        _id: "song1",
                        title: "Bohemian Rhapsody",
                        artist: "Queen",
                        year: 1975,
                        thumbnailFilename: "thumb1.jpg",
                    },
                ],
                score: 1,
            },
        });
    }),

    http.post("/api/game/sessions/:code/skip", async ({ request }) => {
        const body = (await request.json()) as { playerName: string };
        return HttpResponse.json({
            status: "playing",
            player: {
                name: body.playerName,
                timeline: [],
                score: 0,
            },
        });
    }),

    http.get("/api/game/sessions/:code/results", () => {
        return HttpResponse.json({
            status: "finished",
            players: [
                {
                    name: "Alice",
                    score: 2,
                    timeline: [
                        {
                            _id: "song1",
                            title: "Bohemian Rhapsody",
                            artist: "Queen",
                            year: 1975,
                            thumbnailFilename: "thumb1.jpg",
                        },
                        {
                            _id: "song2",
                            title: "Billie Jean",
                            artist: "Michael Jackson",
                            year: 1982,
                            thumbnailFilename: "thumb2.jpg",
                        },
                    ],
                },
            ],
        });
    }),
];
