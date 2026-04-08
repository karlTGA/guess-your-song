import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../../test/helpers";

const TEST_UPLOAD_DIR = "./test-uploads";

function createMultipartPayload(
    fields: Record<string, string>,
    file?: {
        fieldname: string;
        filename: string;
        content: Buffer;
        contentType: string;
    },
) {
    const boundary = `----TestBoundary${Date.now()}`;
    const parts: Buffer[] = [];

    for (const [key, value] of Object.entries(fields)) {
        parts.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
            ),
        );
    }

    if (file) {
        parts.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
            ),
        );
        parts.push(file.content);
        parts.push(Buffer.from("\r\n"));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));

    return {
        body: Buffer.concat(parts),
        contentType: `multipart/form-data; boundary=${boundary}`,
    };
}

async function registerAndLogin(app: FastifyInstance) {
    await app.inject({
        method: "POST",
        url: "/api/admin/register",
        payload: { username: "admin", password: "testpass123" },
    });
    const loginRes = await app.inject({
        method: "POST",
        url: "/api/admin/login",
        payload: { username: "admin", password: "testpass123" },
    });
    return loginRes.json().token as string;
}

describe("admin songs API", () => {
    let app: FastifyInstance;
    let token: string;

    beforeEach(async () => {
        app = await buildTestApp({ uploadDir: TEST_UPLOAD_DIR });
        token = await registerAndLogin(app);
    });

    afterEach(async () => {
        await app.close();
        if (fs.existsSync(TEST_UPLOAD_DIR)) {
            fs.rmSync(TEST_UPLOAD_DIR, { recursive: true });
        }
    });

    it("rejects requests without JWT", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/api/admin/songs",
        });

        expect(response.statusCode).toBe(401);
    });

    it("admin can create a song with metadata", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                title: "Bohemian Rhapsody",
                artist: "Queen",
                year: 1975,
            },
        });

        expect(response.statusCode).toBe(201);
        const body = response.json();
        expect(body.title).toBe("Bohemian Rhapsody");
        expect(body.artist).toBe("Queen");
        expect(body.year).toBe(1975);
        expect(body._id).toBeDefined();
    });

    it("admin can list songs", async () => {
        // Create two songs
        await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Song A", artist: "Artist A", year: 1990 },
        });
        await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Song B", artist: "Artist B", year: 2000 },
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        const songs = response.json();
        expect(songs).toHaveLength(2);
    });

    it("admin can get a single song by id", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Song A", artist: "Artist A", year: 1990 },
        });
        const created = createRes.json();

        const response = await app.inject({
            method: "GET",
            url: `/api/admin/songs/${created._id}`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().title).toBe("Song A");
    });

    it("admin can update song metadata", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Old Title", artist: "Artist", year: 1990 },
        });
        const created = createRes.json();

        const response = await app.inject({
            method: "PUT",
            url: `/api/admin/songs/${created._id}`,
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "New Title", year: 1991 },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().title).toBe("New Title");
        expect(response.json().year).toBe(1991);
        expect(response.json().artist).toBe("Artist");
    });

    it("admin can delete a song", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "To Delete", artist: "Artist", year: 1990 },
        });
        const created = createRes.json();

        const deleteRes = await app.inject({
            method: "DELETE",
            url: `/api/admin/songs/${created._id}`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(deleteRes.statusCode).toBe(204);

        // Verify it's gone
        const getRes = await app.inject({
            method: "GET",
            url: `/api/admin/songs/${created._id}`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(getRes.statusCode).toBe(404);
    });

    it("admin can upload audio for an existing song", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Test Song", artist: "Artist", year: 1990 },
        });
        const song = createRes.json();
        expect(song.audioFilename).toBeUndefined();

        const fakeAudio = Buffer.from("fake-audio-content");
        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "audio",
                filename: "test.mp3",
                content: fakeAudio,
                contentType: "audio/mpeg",
            },
        );

        const uploadRes = await app.inject({
            method: "PUT",
            url: `/api/admin/songs/${song._id}/audio`,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });

        expect(uploadRes.statusCode).toBe(200);
        const updated = uploadRes.json();
        expect(updated.audioFilename).toBeDefined();
        expect(updated.audioFilename).toMatch(/\.mp3$/);
        expect(updated.title).toBe("Test Song");

        // Verify audio is servable
        const audioRes = await app.inject({
            method: "GET",
            url: `/audio/${updated.audioFilename}`,
        });
        expect(audioRes.statusCode).toBe(200);
        expect(audioRes.body).toBe("fake-audio-content");
    });

    it("uploading audio replaces previous audio file", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Replace Test", artist: "Artist", year: 2000 },
        });
        const song = createRes.json();

        // First upload
        const first = createMultipartPayload(
            {},
            {
                fieldname: "audio",
                filename: "first.mp3",
                content: Buffer.from("first-audio"),
                contentType: "audio/mpeg",
            },
        );
        const firstRes = await app.inject({
            method: "PUT",
            url: `/api/admin/songs/${song._id}/audio`,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": first.contentType,
            },
            payload: first.body,
        });
        const oldFilename = firstRes.json().audioFilename;

        // Second upload (replace)
        const second = createMultipartPayload(
            {},
            {
                fieldname: "audio",
                filename: "second.mp3",
                content: Buffer.from("second-audio"),
                contentType: "audio/mpeg",
            },
        );
        const secondRes = await app.inject({
            method: "PUT",
            url: `/api/admin/songs/${song._id}/audio`,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": second.contentType,
            },
            payload: second.body,
        });

        expect(secondRes.statusCode).toBe(200);
        const updated = secondRes.json();
        expect(updated.audioFilename).not.toBe(oldFilename);

        // New file works
        const audioRes = await app.inject({
            method: "GET",
            url: `/audio/${updated.audioFilename}`,
        });
        expect(audioRes.statusCode).toBe(200);
        expect(audioRes.body).toBe("second-audio");

        // Old file is gone
        const oldAudioRes = await app.inject({
            method: "GET",
            url: `/audio/${oldFilename}`,
        });
        expect(oldAudioRes.statusCode).toBe(404);
    });

    it("returns 404 when uploading audio for non-existent song", async () => {
        const fakeAudio = Buffer.from("fake-audio");
        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "audio",
                filename: "test.mp3",
                content: fakeAudio,
                contentType: "audio/mpeg",
            },
        );

        const response = await app.inject({
            method: "PUT",
            url: "/api/admin/songs/000000000000000000000000/audio",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });

        expect(response.statusCode).toBe(404);
    });
});
