import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
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
        await user.click(
            screen.getAllByRole("button", { name: /start/i })[0],
        );

        await waitFor(() => {
            expect(screen.getByText("Play Page")).toBeInTheDocument();
        });

        // Verify localStorage was set
        expect(localStorage.getItem("playerName")).toBe("Alice");
        expect(localStorage.getItem("gameCode")).toBe("NEW123");
    });
});
