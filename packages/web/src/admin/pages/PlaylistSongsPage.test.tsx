import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api";
import { AuthProvider } from "../../contexts/AuthContext";
import PlaylistSongsPage from "./PlaylistSongsPage";
import PlaylistsPage from "./PlaylistsPage";

function renderWithRouter(initialRoute = "/admin/playlists") {
    localStorage.setItem("token", "fake-jwt-token");
    return render(
        <ConfigProvider theme={{ token: { motion: false } }}>
            <AuthProvider>
                <MemoryRouter initialEntries={[initialRoute]}>
                    <Routes>
                        <Route
                            path="/admin/playlists"
                            element={<PlaylistsPage />}
                        />
                        <Route
                            path="/admin/playlists/:playlistId/songs"
                            element={<PlaylistSongsPage />}
                        />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        </ConfigProvider>,
    );
}

describe("PlaylistSongsPage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("navigates to playlist songs page when clicking Manage Songs", async () => {
        const user = userEvent.setup();
        renderWithRouter();

        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        await user.click(
            screen.getAllByRole("button", { name: /manage songs/i })[0],
        );

        await waitFor(() => {
            expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
            expect(screen.getByText("Billie Jean")).toBeInTheDocument();
        });
    });

    it("displays playlist name and songs in a table", async () => {
        renderWithRouter("/admin/playlists/pl1/songs");

        await waitFor(() => {
            expect(screen.getByText("Classic Hits")).toBeInTheDocument();
        });

        // Table headers
        expect(screen.getByText("Title")).toBeInTheDocument();
        expect(screen.getByText("Artist")).toBeInTheDocument();
        expect(screen.getByText("Year")).toBeInTheDocument();

        // Song data
        expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
        expect(screen.getByText("Queen")).toBeInTheDocument();
        expect(screen.getByText("1975")).toBeInTheDocument();
        expect(screen.getByText("Billie Jean")).toBeInTheDocument();
        expect(screen.getByText("Michael Jackson")).toBeInTheDocument();
        expect(screen.getByText("1982")).toBeInTheDocument();
    });

    it("shows audio player for songs with audio", async () => {
        renderWithRouter("/admin/playlists/pl1/songs");

        await waitFor(() => {
            expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
        });

        // Both mock songs have audioFilename, so should show audio players
        const audioElements = document.querySelectorAll("audio");
        expect(audioElements).toHaveLength(2);
        expect(audioElements[0].getAttribute("src")).toBe("/audio/abc.mp3");
        expect(audioElements[1].getAttribute("src")).toBe("/audio/def.mp3");
    });

    it("admin can remove a song from the playlist", async () => {
        const updateSpy = vi.spyOn(api, "updatePlaylist");
        const user = userEvent.setup();
        renderWithRouter("/admin/playlists/pl1/songs");

        await waitFor(() => {
            expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
        });

        // Each song row should have a "Remove" button
        const removeButtons = screen.getAllByRole("button", {
            name: /remove/i,
        });
        expect(removeButtons.length).toBe(2);

        // Click remove on the first song
        await user.click(removeButtons[0]);

        // Confirm removal
        await waitFor(() => {
            expect(screen.getAllByText("Yes").length).toBeGreaterThan(0);
        });
        await user.click(screen.getAllByText("Yes")[0]);

        await waitFor(() => {
            expect(updateSpy).toHaveBeenCalledWith("pl1", {
                songs: ["song2"],
            });
        });
    });

    it("admin can add a song to the playlist", async () => {
        const updateSpy = vi.spyOn(api, "updatePlaylist");
        const user = userEvent.setup();

        // Mock getSongs to return available songs
        vi.spyOn(api, "getSongs").mockResolvedValue([
            {
                _id: "song1",
                title: "Bohemian Rhapsody",
                artist: "Queen",
                year: 1975,
                audioFilename: "abc.mp3",
            },
            {
                _id: "song2",
                title: "Billie Jean",
                artist: "Michael Jackson",
                year: 1982,
                audioFilename: "def.mp3",
            },
            {
                _id: "song3",
                title: "Imagine",
                artist: "John Lennon",
                year: 1971,
                audioFilename: "ghi.mp3",
            },
        ]);

        renderWithRouter("/admin/playlists/pl1/songs");

        await waitFor(() => {
            expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
        });

        // Click "Add Song" button
        await user.click(screen.getByRole("button", { name: /add song/i }));

        // A select should appear with songs not yet in the playlist
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const modal = screen.getByRole("dialog");
        const songSelect = within(modal).getByRole("combobox");
        await user.click(songSelect);

        // Only "Imagine" should be available (song1 and song2 are already in playlist)
        await waitFor(() => {
            expect(
                screen.getByTitle("Imagine - John Lennon (1971)"),
            ).toBeInTheDocument();
        });

        await user.click(screen.getByTitle("Imagine - John Lennon (1971)"));

        // Submit
        await user.click(within(modal).getByRole("button", { name: /ok/i }));

        await waitFor(() => {
            expect(updateSpy).toHaveBeenCalledWith("pl1", {
                songs: ["song1", "song2", "song3"],
            });
        });
    }, 15000);

    it("back button navigates to playlists page", async () => {
        const user = userEvent.setup();
        renderWithRouter("/admin/playlists/pl1/songs");

        await waitFor(() => {
            expect(screen.getByText("Classic Hits")).toBeInTheDocument();
        });

        await user.click(
            screen.getByRole("button", { name: /back to playlists/i }),
        );

        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /add playlist/i }),
            ).toBeInTheDocument();
        });
    });

    it("admin can select multiple songs and batch remove them", async () => {
        const updateSpy = vi.spyOn(api, "updatePlaylist");
        const user = userEvent.setup();
        renderWithRouter("/admin/playlists/pl1/songs");

        await waitFor(() => {
            expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
        });

        // Select both songs via checkboxes
        const checkboxes = screen.getAllByRole("checkbox");
        await user.click(checkboxes[0]); // "Select all" checkbox
        expect(checkboxes[1]).toBeChecked();
        expect(checkboxes[2]).toBeChecked();

        // A "Remove Selected" button should appear
        const removeSelectedBtn = screen.getByRole("button", {
            name: /remove selected/i,
        });
        expect(removeSelectedBtn).toBeInTheDocument();

        await user.click(removeSelectedBtn);

        // Confirm
        await waitFor(() => {
            expect(screen.getAllByText("Yes").length).toBeGreaterThan(0);
        });
        await user.click(screen.getAllByText("Yes")[0]);

        await waitFor(() => {
            expect(updateSpy).toHaveBeenCalledWith("pl1", {
                songs: [],
            });
        });
    });

    it("shows thumbnail images for songs with thumbnailFilename", async () => {
        renderWithRouter("/admin/playlists/pl1/songs");

        await waitFor(() => {
            expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
        });

        const thumbnails = screen.getAllByRole("img", {
            name: /thumbnail/i,
        });
        expect(thumbnails.length).toBe(2);
        expect(thumbnails[0]).toHaveAttribute("src", "/thumbnails/thumb1.jpg");
        expect(thumbnails[1]).toHaveAttribute("src", "/thumbnails/thumb2.jpg");
    });
});
