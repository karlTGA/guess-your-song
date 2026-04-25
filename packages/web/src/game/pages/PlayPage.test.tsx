import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api";
import { server } from "../../test/server";
import PlayPage from "./PlayPage";

function renderPlayPage() {
    localStorage.setItem("playerName", "Alice");
    localStorage.setItem("gameCode", "ABC123");
    return render(
        <ConfigProvider theme={{ token: { motion: false } }}>
            <MemoryRouter initialEntries={["/game/ABC123/play"]}>
                <Routes>
                    <Route path="/game/:code/play" element={<PlayPage />} />
                    <Route
                        path="/game/:code/results"
                        element={<div>Results Page</div>}
                    />
                </Routes>
            </MemoryRouter>
        </ConfigProvider>,
    );
}

/** Pick the first gap (tap once) then confirm (tap again). */
async function placeAtFirstGap(user: ReturnType<typeof userEvent.setup>) {
    const placeButtons = await screen.findAllByRole("button", {
        name: /place here/i,
    });
    // First tap selects the gap
    await user.click(placeButtons[0]);
    // Second tap on the same (now-active) gap confirms
    const confirm = await screen.findAllByRole("button", {
        name: /place here/i,
    });
    await user.click(confirm[0]);
}

describe("PlayPage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("displays current round info and audio player", async () => {
        renderPlayPage();

        await waitFor(() => {
            expect(screen.getByText(/round 1/i)).toBeInTheDocument();
        });

        // Audio element exists (hidden — we render our own play UI)
        expect(document.querySelector("audio")).toBeInTheDocument();
    });

    it("player can place song at a position (tap-to-pick, tap-to-confirm)", async () => {
        const placeSpy = vi.spyOn(api, "placeSong");
        const user = userEvent.setup();
        renderPlayPage();

        await waitFor(() => {
            expect(screen.getByText(/round 1/i)).toBeInTheDocument();
        });

        await placeAtFirstGap(user);

        await waitFor(() => {
            expect(placeSpy).toHaveBeenCalledWith("ABC123", "Alice", 0);
        });
    });

    it("shows correct/incorrect reveal after placement", async () => {
        renderPlayPage();
        const user = userEvent.setup();

        await waitFor(() => {
            expect(screen.getByText(/round 1/i)).toBeInTheDocument();
        });

        await placeAtFirstGap(user);

        await waitFor(() => {
            // RevealOverlay shows "CORRECT" or "INCORRECT" banner
            expect(screen.getByText(/correct/i)).toBeInTheDocument();
        });
    });

    it("navigates to results page when game finishes after placement", async () => {
        server.use(
            http.post("/api/game/sessions/:code/place", async ({ request }) => {
                const body = (await request.json()) as {
                    playerName: string;
                    position: number;
                };
                return HttpResponse.json({
                    correct: true,
                    status: "finished",
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
        );

        renderPlayPage();
        const user = userEvent.setup();

        await waitFor(() => {
            expect(screen.getAllByText(/round 1/i).length).toBeGreaterThan(0);
        });

        await placeAtFirstGap(user);

        await waitFor(() => {
            expect(screen.getByText("Results Page")).toBeInTheDocument();
        });
    });

    it("shows warning and skip button when audio file is missing", async () => {
        server.use(
            http.get("/api/game/sessions/:code/state", ({ request }) => {
                const url = new URL(request.url);
                const playerName = url.searchParams.get("playerName");
                return HttpResponse.json({
                    status: "playing",
                    currentRound: {
                        songId: "song1",
                        audioFilename: "",
                        startedAt: new Date().toISOString(),
                    },
                    player: { name: playerName, timeline: [], score: 0 },
                    totalRounds: 2,
                    currentRoundIndex: 0,
                });
            }),
        );

        renderPlayPage();

        await waitFor(() => {
            expect(
                screen.getByText(/song audio is unavailable/i),
            ).toBeInTheDocument();
        });

        expect(
            screen.getByRole("button", { name: /skip song/i }),
        ).toBeInTheDocument();

        // No audio element rendered when unavailable
        expect(document.querySelector("audio")).not.toBeInTheDocument();
    });

    it("skip button advances to next round", async () => {
        const skipSpy = vi.spyOn(api, "skipSong");

        server.use(
            http.get("/api/game/sessions/:code/state", ({ request }) => {
                const url = new URL(request.url);
                const playerName = url.searchParams.get("playerName");
                return HttpResponse.json({
                    status: "playing",
                    currentRound: {
                        songId: "song1",
                        audioFilename: "",
                        startedAt: new Date().toISOString(),
                    },
                    player: { name: playerName, timeline: [], score: 0 },
                    totalRounds: 2,
                    currentRoundIndex: 0,
                });
            }),
        );

        renderPlayPage();
        const user = userEvent.setup();

        await waitFor(() => {
            expect(
                screen.getByText(/song audio is unavailable/i),
            ).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: /skip song/i }));

        await waitFor(() => {
            expect(skipSpy).toHaveBeenCalledWith("ABC123", "Alice");
        });
    });

    it("loads new song audio after placing a song", async () => {
        let roundIndex = 0;
        server.use(
            http.get("/api/game/sessions/:code/state", ({ request }) => {
                const url = new URL(request.url);
                const playerName = url.searchParams.get("playerName");
                const isSecondRound = roundIndex > 0;
                return HttpResponse.json({
                    status: "playing",
                    currentRound: {
                        songId: isSecondRound ? "song2" : "song1",
                        audioFilename: isSecondRound ? "def.mp3" : "abc.mp3",
                        startedAt: new Date().toISOString(),
                    },
                    player: {
                        name: playerName,
                        timeline: isSecondRound
                            ? [
                                  {
                                      _id: "song1",
                                      title: "Bohemian Rhapsody",
                                      artist: "Queen",
                                      year: 1975,
                                  },
                              ]
                            : [],
                        score: isSecondRound ? 1 : 0,
                    },
                    totalRounds: 3,
                    currentRoundIndex: roundIndex,
                });
            }),
            http.post("/api/game/sessions/:code/place", async ({ request }) => {
                const body = (await request.json()) as {
                    playerName: string;
                    position: number;
                };
                roundIndex++;
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
        );

        renderPlayPage();
        const user = userEvent.setup();

        await waitFor(() => {
            const audio = document.querySelector("audio") as HTMLAudioElement;
            expect(audio).toBeInTheDocument();
            expect(audio.src).toContain("abc.mp3");
        });

        await placeAtFirstGap(user);

        // Reveal overlay appears — tap to dismiss
        const reveal = await screen.findByText(/correct/i);
        await user.click(reveal);

        // After dismissal, new round loads with new audio
        await waitFor(() => {
            const audio = document.querySelector("audio") as HTMLAudioElement;
            expect(audio).toBeInTheDocument();
            expect(audio.src).toContain("def.mp3");
        });

        expect(screen.getByText(/round 2/i)).toBeInTheDocument();
    });

    it("navigates to results when skip finishes the game", async () => {
        server.use(
            http.get("/api/game/sessions/:code/state", ({ request }) => {
                const url = new URL(request.url);
                const playerName = url.searchParams.get("playerName");
                return HttpResponse.json({
                    status: "playing",
                    currentRound: {
                        songId: "song1",
                        audioFilename: "",
                        startedAt: new Date().toISOString(),
                    },
                    player: { name: playerName, timeline: [], score: 0 },
                    totalRounds: 1,
                    currentRoundIndex: 0,
                });
            }),
            http.post("/api/game/sessions/:code/skip", async ({ request }) => {
                const body = (await request.json()) as { playerName: string };
                return HttpResponse.json({
                    status: "finished",
                    player: {
                        name: body.playerName,
                        timeline: [],
                        score: 0,
                    },
                });
            }),
        );

        renderPlayPage();
        const user = userEvent.setup();

        await waitFor(() => {
            expect(
                screen.getByText(/song audio is unavailable/i),
            ).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: /skip song/i }));

        await waitFor(() => {
            expect(screen.getByText("Results Page")).toBeInTheDocument();
        });
    });

    it("shows thumbnail in timeline cards when available", async () => {
        server.use(
            http.get("/api/game/sessions/:code/state", ({ request }) => {
                const url = new URL(request.url);
                const playerName = url.searchParams.get("playerName");
                return HttpResponse.json({
                    status: "playing",
                    currentRound: {
                        songId: "song2",
                        audioFilename: "def.mp3",
                        thumbnailFilename: "thumb2.jpg",
                        startedAt: new Date().toISOString(),
                    },
                    player: {
                        name: playerName,
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
                    totalRounds: 3,
                    currentRoundIndex: 1,
                });
            }),
        );

        renderPlayPage();

        await waitFor(() => {
            expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
        });

        const thumbnail = screen.getByRole("img", { name: /thumbnail/i });
        expect(thumbnail).toHaveAttribute("src", "/thumbnails/thumb1.jpg");
    });
});
