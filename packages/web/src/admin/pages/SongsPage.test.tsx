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
import SongsPage from "./SongsPage";

function renderSongsPage() {
    localStorage.setItem("token", "fake-jwt-token");
    return render(
        <ConfigProvider theme={{ token: { motion: false } }}>
            <AuthProvider>
                <MemoryRouter>
                    <SongsPage />
                </MemoryRouter>
            </AuthProvider>
        </ConfigProvider>,
    );
}

describe("SongsPage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("displays list of songs from API", async () => {
        renderSongsPage();

        await waitFor(() => {
            expect(
                screen.getAllByText("Bohemian Rhapsody").length,
            ).toBeGreaterThan(0);
        });
        expect(screen.getAllByText("Queen").length).toBeGreaterThan(0);
        expect(screen.getAllByText("1975").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Billie Jean").length).toBeGreaterThan(0);
    });

    it("admin can open add song modal", async () => {
        const user = userEvent.setup();
        renderSongsPage();

        await waitFor(() => {
            expect(
                screen.getAllByText("Bohemian Rhapsody").length,
            ).toBeGreaterThan(0);
        });

        // Click add button
        await user.click(
            screen.getAllByRole("button", { name: /add song/i })[0],
        );

        // Modal should appear with drop zone
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const modal = screen.getByRole("dialog");
        expect(within(modal).getByTestId("drop-zone")).toBeInTheDocument();
    });

    it("admin can delete a song", async () => {
        const deleteSpy = vi.spyOn(api, "deleteSong");
        const user = userEvent.setup();
        renderSongsPage();

        await waitFor(() => {
            expect(
                screen.getAllByText("Bohemian Rhapsody").length,
            ).toBeGreaterThan(0);
        });

        // Click delete on first song
        const deleteButtons = screen.getAllByRole("button", {
            name: /delete/i,
        });
        await user.click(deleteButtons[0]);

        // Confirm delete — Ant Design Popconfirm renders a "Yes" button
        await waitFor(() => {
            const yesButtons = screen.getAllByText("Yes");
            expect(yesButtons.length).toBeGreaterThan(0);
        });
        const yesBtn = screen.getAllByText("Yes")[0];
        await user.click(yesBtn);

        // Verify the API was called
        await waitFor(() => {
            expect(deleteSpy).toHaveBeenCalledWith("song1");
        });
    });

    it("shows audio status for each song", async () => {
        renderSongsPage();

        await waitFor(() => {
            expect(
                screen.getAllByText("Bohemian Rhapsody").length,
            ).toBeGreaterThan(0);
        });

        // Both mock songs have audioFilename, so should show "Has audio"
        const audioIndicators = screen.getAllByText("Has audio");
        expect(audioIndicators.length).toBe(2);
    });

    it("admin can upload audio for an existing song", async () => {
        const uploadAudioSpy = vi.spyOn(api, "uploadAudioForSong");
        const user = userEvent.setup();
        renderSongsPage();

        await waitFor(() => {
            expect(
                screen.getAllByText("Bohemian Rhapsody").length,
            ).toBeGreaterThan(0);
        });

        const uploadButtons = screen.getAllByRole("button", {
            name: /upload audio/i,
        });
        expect(uploadButtons.length).toBeGreaterThan(0);

        // Attach a file via the hidden input associated with the first upload button
        const file = new File(["audio-data"], "new-audio.mp3", {
            type: "audio/mpeg",
        });
        const fileInputs = screen.getAllByTestId("audio-upload-input");
        await user.upload(fileInputs[0], file);

        await waitFor(() => {
            expect(uploadAudioSpy).toHaveBeenCalledWith("song1", file);
        });
    });
});

function createDropEvent(files: File[]) {
    return {
        dataTransfer: {
            files,
            items: files.map((file) => ({
                kind: "file",
                type: file.type,
                getAsFile: () => file,
            })),
            types: ["Files"],
        },
    };
}

async function openAddSongModal() {
    const user = userEvent.setup();
    renderSongsPage();

    await waitFor(() => {
        expect(screen.getAllByText("Bohemian Rhapsody").length).toBeGreaterThan(
            0,
        );
    });

    await user.click(screen.getAllByRole("button", { name: /add song/i })[0]);

    await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    return { user, modal: screen.getByRole("dialog") };
}

describe("SongsPage batch upload modal", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("clicking Add Song opens a modal with a drop zone", async () => {
        const { modal } = await openAddSongModal();

        expect(within(modal).getByTestId("drop-zone")).toBeInTheDocument();
    });

    it("dropping audio files in the modal shows batch review entries", async () => {
        const extractSpy = vi.spyOn(api, "extractMetadata").mockResolvedValue({
            title: "Mock Title",
            artist: "Mock Artist",
            year: 2020,
        });
        const { modal } = await openAddSongModal();

        const dropZone = within(modal).getByTestId("drop-zone");
        const files = [
            new File(["audio1"], "song1.mp3", { type: "audio/mpeg" }),
            new File(["audio2"], "song2.mp3", { type: "audio/mpeg" }),
        ];

        fireEvent.drop(dropZone, createDropEvent(files));

        await waitFor(() => {
            expect(extractSpy).toHaveBeenCalledTimes(2);
        });

        const reviewRows = within(modal).getAllByTestId("batch-row");
        expect(reviewRows).toHaveLength(2);
    });

    it("extracted metadata populates editable fields", async () => {
        vi.spyOn(api, "extractMetadata").mockResolvedValueOnce({
            title: "Extracted Title",
            artist: "Extracted Artist",
            year: 2019,
        });
        const { modal } = await openAddSongModal();

        const dropZone = within(modal).getByTestId("drop-zone");
        const files = [
            new File(["audio1"], "song1.mp3", { type: "audio/mpeg" }),
        ];

        fireEvent.drop(dropZone, createDropEvent(files));

        await waitFor(() => {
            expect(within(modal).getAllByTestId("batch-row")).toHaveLength(1);
        });

        const row = within(modal).getByTestId("batch-row");
        const titleInput = within(row).getByLabelText(
            /title/i,
        ) as HTMLInputElement;
        const artistInput = within(row).getByLabelText(
            /artist/i,
        ) as HTMLInputElement;
        const yearInput = within(row).getByLabelText(
            /year/i,
        ) as HTMLInputElement;

        expect(titleInput.value).toBe("Extracted Title");
        expect(artistInput.value).toBe("Extracted Artist");
        expect(yearInput.value).toBe("2019");
    });

    it("highlights missing required fields on confirm", async () => {
        vi.spyOn(api, "extractMetadata").mockResolvedValueOnce({});
        const { user, modal } = await openAddSongModal();

        const dropZone = within(modal).getByTestId("drop-zone");
        const files = [
            new File(["audio1"], "untagged.mp3", { type: "audio/mpeg" }),
        ];

        fireEvent.drop(dropZone, createDropEvent(files));

        await waitFor(() => {
            expect(within(modal).getAllByTestId("batch-row")).toHaveLength(1);
        });

        await user.click(
            within(modal).getByRole("button", { name: /confirm upload/i }),
        );

        await waitFor(() => {
            expect(
                within(modal).getByText(/title is required/i),
            ).toBeInTheDocument();
        });
    });

    it("user can edit metadata and confirm batch upload", async () => {
        const uploadSpy = vi.spyOn(api, "uploadSongAudio").mockResolvedValue({
            _id: "new-song",
            title: "Edited Title",
            artist: "Mock Artist",
            year: 2020,
            audioFilename: "abc.mp3",
        });
        vi.spyOn(api, "extractMetadata").mockResolvedValueOnce({
            title: "Original Title",
            artist: "Mock Artist",
            year: 2020,
        });
        const { user, modal } = await openAddSongModal();

        const dropZone = within(modal).getByTestId("drop-zone");
        const file = new File(["audio1"], "song1.mp3", {
            type: "audio/mpeg",
        });

        fireEvent.drop(dropZone, createDropEvent([file]));

        await waitFor(() => {
            expect(within(modal).getAllByTestId("batch-row")).toHaveLength(1);
        });

        const row = within(modal).getByTestId("batch-row");
        const titleInput = within(row).getByLabelText(/title/i);
        await user.clear(titleInput);
        await user.type(titleInput, "Edited Title");

        await user.click(
            within(modal).getByRole("button", { name: /confirm upload/i }),
        );

        await waitFor(() => {
            expect(uploadSpy).toHaveBeenCalledWith({
                title: "Edited Title",
                artist: "Mock Artist",
                year: 2020,
                file: expect.any(File),
            });
        });
    });

    it("individual files can be removed from batch", async () => {
        const uploadSpy = vi.spyOn(api, "uploadSongAudio").mockResolvedValue({
            _id: "new-song",
            title: "Song B",
            artist: "Artist B",
            year: 2021,
            audioFilename: "abc.mp3",
        });
        vi.spyOn(api, "extractMetadata")
            .mockResolvedValueOnce({
                title: "Song A",
                artist: "Artist A",
                year: 2020,
            })
            .mockResolvedValueOnce({
                title: "Song B",
                artist: "Artist B",
                year: 2021,
            });
        const { user, modal } = await openAddSongModal();

        const dropZone = within(modal).getByTestId("drop-zone");
        const files = [
            new File(["audio1"], "songA.mp3", { type: "audio/mpeg" }),
            new File(["audio2"], "songB.mp3", { type: "audio/mpeg" }),
        ];

        fireEvent.drop(dropZone, createDropEvent(files));

        await waitFor(() => {
            const rows = within(modal).getAllByTestId("batch-row");
            expect(rows).toHaveLength(2);
        });

        const removeButtons = within(modal).getAllByRole("button", {
            name: /remove/i,
        });
        await user.click(removeButtons[0]);

        const rows = within(modal).getAllByTestId("batch-row");
        expect(rows).toHaveLength(1);

        await user.click(
            within(modal).getByRole("button", { name: /confirm upload/i }),
        );

        await waitFor(() => {
            expect(uploadSpy).toHaveBeenCalledTimes(1);
            expect(uploadSpy).toHaveBeenCalledWith({
                title: "Song B",
                artist: "Artist B",
                year: 2021,
                file: expect.any(File),
            });
        });
    });

    it("user can select an existing playlist to add songs to", async () => {
        const uploadSpy = vi.spyOn(api, "uploadSongAudio").mockResolvedValue({
            _id: "new-song-1",
            title: "Song A",
            artist: "Artist A",
            year: 2020,
            audioFilename: "abc.mp3",
        });
        const updatePlaylistSpy = vi.spyOn(api, "updatePlaylist");
        vi.spyOn(api, "extractMetadata").mockResolvedValueOnce({
            title: "Song A",
            artist: "Artist A",
            year: 2020,
        });
        const { user, modal } = await openAddSongModal();

        const dropZone = within(modal).getByTestId("drop-zone");
        fireEvent.drop(
            dropZone,
            createDropEvent([
                new File(["audio1"], "songA.mp3", { type: "audio/mpeg" }),
            ]),
        );

        await waitFor(() => {
            expect(within(modal).getAllByTestId("batch-row")).toHaveLength(1);
        });

        // Select existing playlist radio
        await user.click(
            within(modal).getByRole("radio", { name: /existing playlist/i }),
        );

        const playlistSelect = within(modal).getByRole("combobox", {
            name: /playlist/i,
        });
        await user.click(playlistSelect);
        await waitFor(() => {
            expect(screen.getByText("Classic Hits")).toBeInTheDocument();
        });
        await user.click(screen.getByText("Classic Hits"));

        await user.click(
            within(modal).getByRole("button", { name: /confirm upload/i }),
        );

        await waitFor(() => {
            expect(uploadSpy).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(updatePlaylistSpy).toHaveBeenCalledWith("pl1", {
                songs: ["song1", "song2", "new-song-1"],
            });
        });
    });

    it("user can create a new playlist for batch songs", async () => {
        const uploadSpy = vi.spyOn(api, "uploadSongAudio").mockResolvedValue({
            _id: "new-song-1",
            title: "Song A",
            artist: "Artist A",
            year: 2020,
            audioFilename: "abc.mp3",
        });
        const createPlaylistSpy = vi.spyOn(api, "createPlaylist");
        vi.spyOn(api, "extractMetadata").mockResolvedValueOnce({
            title: "Song A",
            artist: "Artist A",
            year: 2020,
        });
        const { user, modal } = await openAddSongModal();

        const dropZone = within(modal).getByTestId("drop-zone");
        fireEvent.drop(
            dropZone,
            createDropEvent([
                new File(["audio1"], "songA.mp3", { type: "audio/mpeg" }),
            ]),
        );

        await waitFor(() => {
            expect(within(modal).getAllByTestId("batch-row")).toHaveLength(1);
        });

        // Toggle to create new playlist
        await user.click(
            within(modal).getByRole("radio", { name: /new playlist/i }),
        );
        const nameInput = within(modal).getByLabelText(/playlist name/i);
        await user.type(nameInput, "My New Playlist");

        await user.click(
            within(modal).getByRole("button", { name: /confirm upload/i }),
        );

        await waitFor(() => {
            expect(uploadSpy).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(createPlaylistSpy).toHaveBeenCalledWith({
                name: "My New Playlist",
                songs: ["new-song-1"],
            });
        });
    });
});

describe("SongsPage inline editing", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("clicking a song title makes it editable", async () => {
        const user = userEvent.setup();
        renderSongsPage();

        await waitFor(() => {
            expect(
                screen.getAllByText("Bohemian Rhapsody").length,
            ).toBeGreaterThan(0);
        });

        // Click on the title text to edit it
        await user.click(screen.getAllByText("Bohemian Rhapsody")[0]);

        // An input should appear with the current title
        const input = screen.getByDisplayValue("Bohemian Rhapsody");
        expect(input).toBeInTheDocument();
        expect(input.tagName).toBe("INPUT");
    });

    it("editing a title and pressing Enter calls updateSong API", async () => {
        const updateSpy = vi.spyOn(api, "updateSong");
        const user = userEvent.setup();
        renderSongsPage();

        await waitFor(() => {
            expect(
                screen.getAllByText("Bohemian Rhapsody").length,
            ).toBeGreaterThan(0);
        });

        // Click on the title to edit
        await user.click(screen.getAllByText("Bohemian Rhapsody")[0]);
        const input = screen.getByDisplayValue("Bohemian Rhapsody");

        // Clear and type new title
        await user.clear(input);
        await user.type(input, "New Title{Enter}");

        await waitFor(() => {
            expect(updateSpy).toHaveBeenCalledWith("song1", {
                title: "New Title",
            });
        });
    });

    it("editing an artist and pressing Enter calls updateSong API", async () => {
        const updateSpy = vi.spyOn(api, "updateSong");
        const user = userEvent.setup();
        renderSongsPage();

        await waitFor(() => {
            expect(screen.getAllByText("Queen").length).toBeGreaterThan(0);
        });

        await user.click(screen.getAllByText("Queen")[0]);
        const input = screen.getByDisplayValue("Queen");

        await user.clear(input);
        await user.type(input, "King{Enter}");

        await waitFor(() => {
            expect(updateSpy).toHaveBeenCalledWith("song1", {
                artist: "King",
            });
        });
    });

    it("editing a year and pressing Enter calls updateSong API", async () => {
        const updateSpy = vi.spyOn(api, "updateSong");
        const user = userEvent.setup();
        renderSongsPage();

        await waitFor(() => {
            expect(screen.getAllByText("1975").length).toBeGreaterThan(0);
        });

        await user.click(screen.getAllByText("1975")[0]);
        const input = screen.getByDisplayValue("1975");
        expect(input).toBeInTheDocument();

        await user.clear(input);
        await user.type(input, "2000{Enter}");

        await waitFor(() => {
            expect(updateSpy).toHaveBeenCalledWith("song1", {
                year: 2000,
            });
        });
    });

    it("pressing Escape cancels editing without calling API", async () => {
        const updateSpy = vi.spyOn(api, "updateSong");
        const user = userEvent.setup();
        renderSongsPage();

        await waitFor(() => {
            expect(
                screen.getAllByText("Bohemian Rhapsody").length,
            ).toBeGreaterThan(0);
        });

        await user.click(screen.getAllByText("Bohemian Rhapsody")[0]);
        const input = screen.getByDisplayValue("Bohemian Rhapsody");

        await user.clear(input);
        await user.type(input, "Something Else");
        await user.keyboard("{Escape}");

        // Input should disappear, original value shown
        await waitFor(() => {
            expect(
                screen.queryByDisplayValue("Something Else"),
            ).not.toBeInTheDocument();
        });
        expect(screen.getAllByText("Bohemian Rhapsody").length).toBeGreaterThan(
            0,
        );
        expect(updateSpy).not.toHaveBeenCalled();
    });
});
