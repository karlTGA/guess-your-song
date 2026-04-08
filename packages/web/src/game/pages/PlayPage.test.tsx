import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { http, HttpResponse } from "msw";
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

describe("PlayPage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("displays current round info and audio player", async () => {
        renderPlayPage();

        await waitFor(() => {
            expect(screen.getByText(/round 1/i)).toBeInTheDocument();
        });

        // Should show an audio element
        expect(document.querySelector("audio")).toBeInTheDocument();
    });

    it("player can place song at a position", async () => {
        const placeSpy = vi.spyOn(api, "placeSong");
        const user = userEvent.setup();
        renderPlayPage();

        await waitFor(() => {
            expect(screen.getByText(/round 1/i)).toBeInTheDocument();
        });

        // Click "Place Here" button (for position 0 in empty timeline)
        const placeButtons = await screen.findAllByRole("button", {
            name: /place here/i,
        });
        await user.click(placeButtons[0]);

        await waitFor(() => {
            expect(placeSpy).toHaveBeenCalledWith("ABC123", "Alice", 0);
        });
    });

    it("shows correct/incorrect feedback after placement", async () => {
        renderPlayPage();
        const user = userEvent.setup();

        await waitFor(() => {
            expect(screen.getByText(/round 1/i)).toBeInTheDocument();
        });

        const placeButtons = await screen.findAllByRole("button", {
            name: /place here/i,
        });
        await user.click(placeButtons[0]);

        await waitFor(() => {
            expect(screen.getAllByText(/correct/i).length).toBeGreaterThan(0);
        });
    });

    it("navigates to results page when game finishes after placement", async () => {
        // Override the place handler to return status: "finished"
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
            expect(
                screen.getAllByText(/round 1/i).length,
            ).toBeGreaterThan(0);
        });

        const placeButtons = await screen.findAllByRole("button", {
            name: /place here/i,
        });
        await user.click(placeButtons[0]);

        // Should navigate to results page
        await waitFor(() => {
            expect(screen.getByText("Results Page")).toBeInTheDocument();
        });
    });
});
