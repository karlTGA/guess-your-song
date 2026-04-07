import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import JoinPage from "./JoinPage.js";

function renderJoinPage() {
    return render(
        <ConfigProvider theme={{ motion: false }}>
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route path="/" element={<JoinPage />} />
                    <Route
                        path="/game/:code/play"
                        element={<div>Play Page</div>}
                    />
                </Routes>
            </MemoryRouter>
        </ConfigProvider>,
    );
}

describe("JoinPage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("shows form to enter game code and player name", () => {
        renderJoinPage();
        expect(screen.getByLabelText(/game code/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
        expect(
            screen.getAllByRole("button", { name: /join/i }).length,
        ).toBeGreaterThan(0);
    });

    it("joins session and navigates to play page on success", async () => {
        const user = userEvent.setup();
        renderJoinPage();

        await user.type(screen.getByLabelText(/game code/i), "ABC123");
        await user.type(screen.getByLabelText(/your name/i), "Alice");
        await user.click(screen.getAllByRole("button", { name: /join/i })[0]);

        await waitFor(() => {
            expect(screen.getByText("Play Page")).toBeInTheDocument();
        });
    });

    it("shows error for invalid game code", async () => {
        const user = userEvent.setup();
        renderJoinPage();

        await user.type(screen.getByLabelText(/game code/i), "BADCODE");
        await user.type(screen.getByLabelText(/your name/i), "Alice");
        await user.click(screen.getAllByRole("button", { name: /join/i })[0]);

        await waitFor(() => {
            expect(
                screen.getAllByText(/not found|invalid|error/i).length,
            ).toBeGreaterThan(0);
        });
    });
});
