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

    it("shows thumbnail image for playlists with thumbnailFilename", async () => {
        renderPlaylistsPage();

        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        const thumbnails = screen.getAllByRole("img", {
            name: /thumbnail/i,
        });
        expect(thumbnails.length).toBe(1);
        expect(thumbnails[0]).toHaveAttribute(
            "src",
            "/thumbnails/pl-thumb1.jpg",
        );
    });

    it("admin can upload thumbnail for a playlist", async () => {
        const uploadThumbnailSpy = vi.spyOn(api, "uploadPlaylistThumbnail");
        const user = userEvent.setup();
        renderPlaylistsPage();

        await waitFor(() => {
            expect(screen.getAllByText("Classic Hits").length).toBeGreaterThan(
                0,
            );
        });

        const uploadButtons = screen.getAllByRole("button", {
            name: /upload thumbnail/i,
        });
        expect(uploadButtons.length).toBeGreaterThan(0);

        const file = new File(["img-data"], "cover.jpg", {
            type: "image/jpeg",
        });
        const fileInputs = screen.getAllByTestId("thumbnail-upload-input");
        await user.upload(fileInputs[0], file);

        await waitFor(() => {
            expect(uploadThumbnailSpy).toHaveBeenCalledWith("pl1", file);
        });
    });
});
