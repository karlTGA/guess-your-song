import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api.js";
import { AuthProvider } from "../../contexts/AuthContext.js";
import PlaylistsPage from "./PlaylistsPage.js";

function renderPlaylistsPage() {
    localStorage.setItem("token", "fake-jwt-token");
    return render(
        <ConfigProvider theme={{ motion: false }}>
            <AuthProvider>
                <MemoryRouter>
                    <PlaylistsPage />
                </MemoryRouter>
            </AuthProvider>
        </ConfigProvider>,
    );
}

describe("PlaylistsPage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("displays playlists from API", async () => {
        renderPlaylistsPage();

        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });
    });

    it("admin can create a playlist", async () => {
        const createSpy = vi.spyOn(api, "createPlaylist");
        const user = userEvent.setup();
        renderPlaylistsPage();

        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        // Click add button
        await user.click(
            screen.getAllByRole("button", { name: /add playlist/i })[0],
        );

        // Modal should appear
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const modal = screen.getByRole("dialog");
        await user.type(
            within(modal).getByLabelText(/name/i),
            "My New Playlist",
        );

        // Submit
        await user.click(within(modal).getByRole("button", { name: /ok/i }));

        await waitFor(() => {
            expect(createSpy).toHaveBeenCalled();
            const callArgs = createSpy.mock.calls[0][0];
            expect(callArgs.name).toBe("My New Playlist");
        });
    });

    it("admin can delete a playlist", async () => {
        const deleteSpy = vi.spyOn(api, "deletePlaylist");
        const user = userEvent.setup();
        renderPlaylistsPage();

        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        const deleteButtons = screen.getAllByRole("button", {
            name: /delete/i,
        });
        await user.click(deleteButtons[0]);

        await waitFor(() => {
            const yesButtons = screen.getAllByText("Yes");
            expect(yesButtons.length).toBeGreaterThan(0);
        });
        await user.click(screen.getAllByText("Yes")[0]);

        await waitFor(() => {
            expect(deleteSpy).toHaveBeenCalledWith("pl1");
        });
    });
});
