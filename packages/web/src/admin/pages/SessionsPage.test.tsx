import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
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
    }, 10000);

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

        // Wait for newly created session to appear in the table
        await waitFor(() => {
            expect(screen.getByText("XYZ789")).toBeInTheDocument();
        });

        // Find the row containing XYZ789 and click its Start Game button
        const row = screen.getByText("XYZ789").closest("tr");
        expect(row).toBeTruthy();
        const startButton = within(row as HTMLElement).getByRole("button", {
            name: /start game/i,
        });
        await user.click(startButton);

        await waitFor(() => {
            expect(startSpy).toHaveBeenCalledWith("XYZ789");
        });

        // After starting, XYZ789's row should no longer have a Start Game button
        await waitFor(() => {
            const updatedRow = screen.getByText("XYZ789").closest("tr");
            expect(updatedRow).toBeTruthy();
            expect(
                within(updatedRow as HTMLElement).queryByRole("button", {
                    name: /start game/i,
                }),
            ).not.toBeInTheDocument();
        });
    }, 10000);

    it("displays active sessions on load with status, code, playlist name, and player count", async () => {
        renderSessionsPage();

        // Should show both active sessions from the mock handler
        await waitFor(() => {
            expect(screen.getByText("ABC123")).toBeInTheDocument();
            expect(screen.getByText("DEF456")).toBeInTheDocument();
        });

        // Should show statuses
        expect(screen.getByText("waiting")).toBeInTheDocument();
        expect(screen.getByText("playing")).toBeInTheDocument();

        // Should show playlist names
        const playlistNames = screen.getAllByText("Classic Hits");
        expect(playlistNames.length).toBeGreaterThanOrEqual(2);

        // Should show player counts
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();

        // Should show round info (currentRound / totalRounds)
        expect(screen.getByText("0 / 2")).toBeInTheDocument();
        expect(screen.getByText("1 / 2")).toBeInTheDocument();

        // Waiting session should have Start Game button
        expect(
            screen.getByRole("button", { name: /start game/i }),
        ).toBeInTheDocument();
    });

    it("auto-refreshes active sessions every 5 seconds", async () => {
        const getActiveSessionsSpy = vi.spyOn(api, "getActiveSessions");

        renderSessionsPage();

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText("ABC123")).toBeInTheDocument();
        });

        const initialCallCount = getActiveSessionsSpy.mock.calls.length;

        // Advance by 5 seconds
        await vi.advanceTimersByTimeAsync(5000);

        await waitFor(() => {
            expect(getActiveSessionsSpy.mock.calls.length).toBeGreaterThan(
                initialCallCount,
            );
        });
    });

    it("admin can delete a session", async () => {
        const deleteSpy = vi.spyOn(api, "deleteSession");
        const user = userEvent.setup();
        renderSessionsPage();

        // Wait for sessions to load
        await waitFor(() => {
            expect(screen.getByText("ABC123")).toBeInTheDocument();
        });

        // Find the row containing ABC123 and click its Delete button
        const row = screen.getByText("ABC123").closest("tr");
        expect(row).toBeTruthy();
        const deleteButton = within(row as HTMLElement).getByRole("button", {
            name: /delete/i,
        });
        await user.click(deleteButton);

        await waitFor(() => {
            expect(deleteSpy).toHaveBeenCalledWith("ABC123");
        });

        // After deleting, ABC123 should no longer appear
        await waitFor(() => {
            expect(screen.queryByText("ABC123")).not.toBeInTheDocument();
        });
    });
});
