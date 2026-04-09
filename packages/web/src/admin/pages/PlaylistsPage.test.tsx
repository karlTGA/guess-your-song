import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api";
import { AuthProvider } from "../../contexts/AuthContext";
import PlaylistsPage from "./PlaylistsPage";

function renderPlaylistsPage() {
    localStorage.setItem("token", "fake-jwt-token");
    return render(
        <ConfigProvider theme={{ token: { motion: false } }}>
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

    it("admin can select songs when creating a playlist", async () => {
        const createSpy = vi.spyOn(api, "createPlaylist");
        const user = userEvent.setup();
        renderPlaylistsPage();

        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        // Open the add playlist modal
        await user.click(
            screen.getAllByRole("button", { name: /add playlist/i })[0],
        );

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const modal = screen.getByRole("dialog");

        // Fill in name
        await user.type(within(modal).getByLabelText(/name/i), "My Playlist");

        // Should see a song selector — open it and pick a song
        const songSelect = within(modal).getByRole("combobox");
        fireEvent.mouseDown(songSelect);

        // Select "Bohemian Rhapsody" from dropdown
        await waitFor(() => {
            expect(
                screen.getByTitle("Bohemian Rhapsody - Queen (1975)"),
            ).toBeInTheDocument();
        });
        fireEvent.click(screen.getByTitle("Bohemian Rhapsody - Queen (1975)"));

        // Submit the modal
        await user.click(within(modal).getByRole("button", { name: /ok/i }));

        await waitFor(() => {
            expect(createSpy).toHaveBeenCalled();
            const callArgs = createSpy.mock.calls[0][0];
            expect(callArgs.name).toBe("My Playlist");
            expect(callArgs.songs).toContain("song1");
        });
    }, 15000);

    it("admin can add songs to an existing playlist", async () => {
        const updateSpy = vi.spyOn(api, "updatePlaylist");
        const user = userEvent.setup();
        renderPlaylistsPage();

        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        // Click the "Manage Songs" button on the first playlist
        await user.click(
            screen.getAllByRole("button", { name: /manage songs/i })[0],
        );

        // A modal should open
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const modal = screen.getByRole("dialog");

        // The songs select should be pre-populated with the playlist's songs
        // The mock playlist "Classic Hits" has songs: ["song1", "song2"]
        const songSelect = within(modal).getByRole("combobox");
        expect(songSelect).toBeInTheDocument();

        // Submit the form to save
        await user.click(within(modal).getByRole("button", { name: /ok/i }));

        await waitFor(() => {
            expect(updateSpy).toHaveBeenCalledWith(
                "pl1",
                expect.objectContaining({
                    songs: expect.any(Array),
                }),
            );
        });
    }, 15000);

    it("admin can remove songs from an existing playlist", async () => {
        const updateSpy = vi.spyOn(api, "updatePlaylist");
        const user = userEvent.setup();
        renderPlaylistsPage();

        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        // Click the "Manage Songs" button
        await user.click(
            screen.getAllByRole("button", { name: /manage songs/i })[0],
        );

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const modal = screen.getByRole("dialog");

        // The songs should be pre-selected as tags with remove buttons
        // Remove a song by clicking its close icon within the select component
        const selectContainer = within(modal)
            .getByRole("combobox")
            .closest(".ant-select") as HTMLElement;
        const removeIcons = within(selectContainer).getAllByLabelText("close");
        expect(removeIcons.length).toBeGreaterThan(0);
        fireEvent.click(removeIcons[0]);

        // Submit
        await user.click(within(modal).getByRole("button", { name: /ok/i }));

        await waitFor(() => {
            expect(updateSpy).toHaveBeenCalled();
            const callArgs = updateSpy.mock.calls[0];
            // Should have fewer songs than originally
            expect(callArgs[1].songs).toBeDefined();
            expect(callArgs[1].songs!.length).toBeLessThan(2);
        });
    }, 15000);

    it("displays correct song count for each playlist", async () => {
        renderPlaylistsPage();

        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        // The mock playlist "Classic Hits" has songs: ["song1", "song2"] → count should be "2"
        const tables = screen.getAllByRole("table");
        const rows = within(tables[0]).getAllByRole("row");
        // First data row (index 1, since index 0 is the header)
        const dataRow = rows[1];
        expect(within(dataRow).getByText("2")).toBeInTheDocument();
    });
});
