import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api";
import StartGamePage from "./StartGamePage";

function renderStartGamePage() {
    return render(
        <ConfigProvider theme={{ token: { motion: false } }}>
            <MemoryRouter initialEntries={["/start"]}>
                <Routes>
                    <Route path="/start" element={<StartGamePage />} />
                    <Route
                        path="/game/:code/play"
                        element={<div>Play Page</div>}
                    />
                </Routes>
            </MemoryRouter>
        </ConfigProvider>,
    );
}

describe("StartGamePage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("shows available playlists and a name input", async () => {
        renderStartGamePage();

        await waitFor(() => {
            expect(screen.getByText("Classic Hits")).toBeInTheDocument();
        });
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    });

    it("creates a game and navigates to play page", async () => {
        const user = userEvent.setup();
        renderStartGamePage();

        await waitFor(() => {
            expect(screen.getByText("Classic Hits")).toBeInTheDocument();
        });

        // Select the playlist
        await user.click(screen.getByText("Classic Hits"));

        // Enter player name
        await user.type(screen.getByLabelText(/your name/i), "Alice");

        // Click start
        await user.click(screen.getAllByRole("button", { name: /start/i })[0]);

        await waitFor(() => {
            expect(screen.getByText("Play Page")).toBeInTheDocument();
        });

        // Verify localStorage was set
        expect(localStorage.getItem("playerName")).toBe("Alice");
        expect(localStorage.getItem("gameCode")).toBe("NEW123");
    });

    it("shows a number of songs input after selecting a playlist", async () => {
        const user = userEvent.setup();
        renderStartGamePage();

        await waitFor(() => {
            expect(screen.getByText("Classic Hits")).toBeInTheDocument();
        });

        // Select the playlist
        await user.click(screen.getByText("Classic Hits"));

        // Should see numbered songs input
        await waitFor(() => {
            expect(screen.getByText(/number of songs/i)).toBeInTheDocument();
        });
        expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("sends numberOfSongs when creating a game", async () => {
        const spy = vi.spyOn(api, "createGameSession");
        const user = userEvent.setup();
        renderStartGamePage();

        await waitFor(() => {
            expect(screen.getByText("Classic Hits")).toBeInTheDocument();
        });

        // Select the playlist
        await user.click(screen.getByText("Classic Hits"));

        // Enter player name
        await user.type(screen.getByLabelText(/your name/i), "Alice");

        // Click start (with default numberOfSongs = playlist songCount)
        await user.click(screen.getAllByRole("button", { name: /start/i })[0]);

        await waitFor(() => {
            expect(screen.getByText("Play Page")).toBeInTheDocument();
        });

        expect(spy).toHaveBeenCalledWith("pl1", "Alice", 2);
        spy.mockRestore();
    });

    it("shows playlist thumbnail when available", async () => {
        renderStartGamePage();

        await waitFor(() => {
            expect(screen.getByText("Classic Hits")).toBeInTheDocument();
        });

        const thumbnail = screen.getByRole("img", {
            name: /thumbnail/i,
        });
        expect(thumbnail).toHaveAttribute("src", "/thumbnails/pl-thumb1.jpg");
    });
});
