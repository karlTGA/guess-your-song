import { render, screen, waitFor } from "@testing-library/react";
import { ConfigProvider } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import ResultsPage from "./ResultsPage";

function renderResultsPage() {
    localStorage.setItem("playerName", "Alice");
    return render(
        <ConfigProvider theme={{ token: { motion: false } }}>
            <MemoryRouter initialEntries={["/game/ABC123/results"]}>
                <Routes>
                    <Route
                        path="/game/:code/results"
                        element={<ResultsPage />}
                    />
                </Routes>
            </MemoryRouter>
        </ConfigProvider>,
    );
}

describe("ResultsPage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("shows final scores and timeline", async () => {
        renderResultsPage();

        // Wait for player data to load (card title contains player name)
        await waitFor(
            () => {
                expect(screen.getByText(/Alice/)).toBeInTheDocument();
            },
            { timeout: 5000 },
        );

        // Score should be displayed
        expect(screen.getAllByText(/2/).length).toBeGreaterThan(0);

        // Songs should appear in the timeline
        expect(screen.getAllByText(/Bohemian Rhapsody/).length).toBeGreaterThan(
            0,
        );
        expect(screen.getAllByText(/Billie Jean/).length).toBeGreaterThan(0);
    });
});
