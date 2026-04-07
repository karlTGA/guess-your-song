import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { AuthProvider } from "../../contexts/AuthContext.js";
import SessionsPage from "./SessionsPage.js";
import * as api from "../../api.js";

function renderSessionsPage() {
    localStorage.setItem("token", "fake-jwt-token");
    return render(
        <ConfigProvider theme={{ motion: false }}>
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
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(0);
        });

        // Click create session button
        await user.click(screen.getAllByRole("button", { name: /create session/i })[0]);

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
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(0);
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
});
