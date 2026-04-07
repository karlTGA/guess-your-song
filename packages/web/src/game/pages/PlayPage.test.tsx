import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConfigProvider } from "antd";
import PlayPage from "./PlayPage.js";
import * as api from "../../api.js";

function renderPlayPage() {
    localStorage.setItem("playerName", "Alice");
    localStorage.setItem("gameCode", "ABC123");
    return render(
        <ConfigProvider theme={{ motion: false }}>
            <MemoryRouter initialEntries={["/game/ABC123/play"]}>
                <Routes>
                    <Route path="/game/:code/play" element={<PlayPage />} />
                    <Route path="/game/:code/results" element={<div>Results Page</div>} />
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
        const placeButtons = await screen.findAllByRole("button", { name: /place here/i });
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

        const placeButtons = await screen.findAllByRole("button", { name: /place here/i });
        await user.click(placeButtons[0]);

        await waitFor(() => {
            expect(screen.getAllByText(/correct/i).length).toBeGreaterThan(0);
        });
    });
});
