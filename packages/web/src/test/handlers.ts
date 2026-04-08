import { HttpResponse, http } from "msw";

// Default mock data
const songs = [
    {
        _id: "song1",
        title: "Bohemian Rhapsody",
        artist: "Queen",
        year: 1975,
        audioFilename: "abc.mp3",
        createdAt: "2024-01-01",
    },
    {
        _id: "song2",
        title: "Billie Jean",
        artist: "Michael Jackson",
        year: 1982,
        audioFilename: "def.mp3",
        createdAt: "2024-01-02",
    },
];

const playlists = [
    {
        _id: "pl1",
        name: "Classic Hits",
        description: "Best classics",
        songs: ["song1", "song2"],
        createdAt: "2024-01-01",
    },
];

const sessions = [
    {
        _id: "sess1",
        code: "ABC123",
        playlist: "pl1",
        status: "waiting",
        config: { roundTimerSeconds: 30, maxPlayers: 20 },
        players: [],
        rounds: [],
        currentRoundIndex: 0,
    },
];

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
        return HttpResponse.json({ _id: params.id, ...body });
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

    // Sessions
    http.get("/api/admin/sessions", () => {
        return HttpResponse.json(sessions);
    }),

    http.post("/api/admin/sessions", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
            {
                _id: "sess-new",
                code: "XYZ789",
                playlist: body.playlistId,
                status: "waiting",
                config: {
                    roundTimerSeconds: 30,
                    maxPlayers: 20,
                    ...((body.config as object) || {}),
                },
                players: [],
                rounds: [],
                currentRoundIndex: 0,
            },
            { status: 201 },
        );
    }),

    http.post("/api/admin/sessions/:code/start", ({ params }) => {
        return HttpResponse.json({
            _id: "sess-new",
            code: params.code,
            status: "playing",
        });
    }),

    // Game (public)
    http.get("/api/game/playlists", () => {
        return HttpResponse.json([
            {
                _id: "pl1",
                name: "Classic Hits",
                description: "Best classics",
                songCount: 2,
            },
        ]);
    }),

    http.post("/api/game/sessions", async ({ request }) => {
        const body = (await request.json()) as {
            playlistId: string;
            playerName: string;
        };
        return HttpResponse.json(
            {
                _id: "sess-new",
                code: "NEW123",
                playlist: body.playlistId,
                status: "playing",
                config: { roundTimerSeconds: 30, maxPlayers: 20 },
                players: [
                    {
                        name: body.playerName,
                        joinedAt: new Date().toISOString(),
                        timeline: [],
                        score: 0,
                    },
                ],
                rounds: [{ songId: "song1", startedAt: new Date().toISOString() }],
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
            },
            player: {
                name: body.playerName,
                timeline: [
                    {
                        _id: "song1",
                        title: "Bohemian Rhapsody",
                        artist: "Queen",
                        year: 1975,
                    },
                ],
                score: 1,
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
                        },
                        {
                            _id: "song2",
                            title: "Billie Jean",
                            artist: "Michael Jackson",
                            year: 1982,
                        },
                    ],
                },
            ],
        });
    }),
];
