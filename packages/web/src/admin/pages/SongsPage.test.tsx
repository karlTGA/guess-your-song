import { render, screen, waitFor, within } from "@testing-library/react";
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

    it("admin can open add song modal and submit", async () => {
        const createSpy = vi.spyOn(api, "createSong");
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

        // Modal should appear
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const modal = screen.getByRole("dialog");
        await user.type(within(modal).getByLabelText(/title/i), "New Song");
        await user.type(within(modal).getByLabelText(/artist/i), "New Artist");

        const yearInput = within(modal).getByLabelText(/year/i);
        await user.clear(yearInput);
        await user.paste("2020");

        // Submit via OK button
        await user.click(within(modal).getByRole("button", { name: /ok/i }));

        // Verify the API was called with correct data
        await waitFor(() => {
            expect(createSpy).toHaveBeenCalledWith({
                title: "New Song",
                artist: "New Artist",
                year: 2020,
            });
        });
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

    it("submitting add song modal with file calls uploadSongAudio", async () => {
        const uploadSpy = vi.spyOn(api, "uploadSongAudio");
        const user = userEvent.setup();
        renderSongsPage();

        await waitFor(() => {
            expect(
                screen.getAllByText("Bohemian Rhapsody").length,
            ).toBeGreaterThan(0);
        });

        await user.click(
            screen.getAllByRole("button", { name: /add song/i })[0],
        );

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const modal = screen.getByRole("dialog");
        await user.type(within(modal).getByLabelText(/title/i), "Upload Song");
        await user.type(
            within(modal).getByLabelText(/artist/i),
            "Upload Artist",
        );

        const yearInput = within(modal).getByLabelText(/year/i);
        await user.clear(yearInput);
        await user.paste("2020");

        // Attach a file
        const file = new File(["audio-data"], "song.mp3", {
            type: "audio/mpeg",
        });
        const fileInput = within(modal).getByLabelText(
            /audio file/i,
        ) as HTMLInputElement;
        await user.upload(fileInput, file);

        // Submit
        await user.click(within(modal).getByRole("button", { name: /ok/i }));

        await waitFor(() => {
            expect(uploadSpy).toHaveBeenCalledWith({
                title: "Upload Song",
                artist: "Upload Artist",
                year: 2020,
                file: expect.any(File),
            });
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
