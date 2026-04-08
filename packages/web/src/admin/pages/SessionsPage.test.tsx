import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api";
import { AuthProvider } from "../../contexts/AuthContext";
import SessionsPage from "./SessionsPage";

function renderSessionsPage() {
    localStorage.setItem("token", "fake-jwt-token");
    return render(
        <ConfigProvider theme={{ token: { motion: false } }}>
            <AuthProvider>
                <MemoryRouter>
                    <SessionsPage />
                </MemoryRouter>
            </AuthProvider>
        </ConfigProvider>,
    );
}

describe("SessionsPage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("admin can create a game session and see join code", async () => {
        const createSpy = vi.spyOn(api, "createSession");
        const user = userEvent.setup();
        renderSessionsPage();

        // Wait for playlists to load in select
        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        // Click create session button
        await user.click(
            screen.getAllByRole("button", { name: /create session/i })[0],
        );

        // Modal should appear
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const modal = screen.getByRole("dialog");

        // Select a playlist from dropdown
        const selectInput = within(modal).getByRole("combobox");
        await user.click(selectInput);

        // Wait for dropdown option and click it
        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });
        // Click the option in the dropdown
        const options = screen.getAllByText("Classic Hits");
        await user.click(options[options.length - 1]);

        // Submit
        await user.click(within(modal).getByRole("button", { name: /ok/i }));

        await waitFor(() => {
            expect(createSpy).toHaveBeenCalled();
            expect(createSpy.mock.calls[0][0].playlistId).toBe("pl1");
        });

        // Should display the join code after creation
        await waitFor(() => {
            expect(screen.getAllByText("XYZ789").length).toBeGreaterThan(0);
        });
    });

    it("admin can start a waiting session", async () => {
        const startSpy = vi.spyOn(api, "startSession");
        const createSpy = vi.spyOn(api, "createSession");
        const user = userEvent.setup();
        renderSessionsPage();

        // Wait for playlists to load
        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        // Create a session first
        await user.click(
            screen.getAllByRole("button", { name: /create session/i })[0],
        );
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
        const modal = screen.getByRole("dialog");
        const selectInput = within(modal).getByRole("combobox");
        await user.click(selectInput);
        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });
        const options = screen.getAllByText("Classic Hits");
        await user.click(options[options.length - 1]);
        await user.click(within(modal).getByRole("button", { name: /ok/i }));

        await waitFor(() => {
            expect(createSpy).toHaveBeenCalled();
        });

        // Wait for session to appear with Start Game button
        const startButtons = await screen.findAllByRole("button", {
            name: /start game/i,
        });
        expect(startButtons.length).toBeGreaterThan(0);

        // Click Start Game
        await user.click(startButtons[0]);

        await waitFor(() => {
            expect(startSpy).toHaveBeenCalledWith("XYZ789");
        });

        // After starting, the Start Game button should disappear (status is now "playing")
        await waitFor(() => {
            expect(
                screen.queryByRole("button", { name: /start game/i }),
            ).not.toBeInTheDocument();
        });
    });
});
