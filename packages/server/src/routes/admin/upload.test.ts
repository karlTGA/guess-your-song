import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildTestApp } from "../../test/helpers.js";
import type { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";

const TEST_UPLOAD_DIR = "./test-uploads";

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

function createMultipartPayload(
    fields: Record<string, string>,
    file?: { fieldname: string; filename: string; content: Buffer; contentType: string },
) {
    const boundary = "----TestBoundary" + Date.now();
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

describe("song file upload", () => {
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

    it("admin can upload a song with audio file", async () => {
        const fakeAudio = Buffer.from("fake-audio-content");
        const { body, contentType } = createMultipartPayload(
            { title: "Upload Test", artist: "Test Artist", year: "1985" },
            {
                fieldname: "audio",
                filename: "test-song.mp3",
                content: fakeAudio,
                contentType: "audio/mpeg",
            },
        );

        const response = await app.inject({
            method: "POST",
            url: "/api/admin/songs/upload",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });

        expect(response.statusCode).toBe(201);
        const song = response.json();
        expect(song.title).toBe("Upload Test");
        expect(song.audioFilename).toBeDefined();
        expect(song.audioFilename).toMatch(/\.mp3$/);
    });

    it("audio file is servable after upload", async () => {
        const fakeAudio = Buffer.from("fake-audio-content-for-serving");
        const { body, contentType } = createMultipartPayload(
            { title: "Serve Test", artist: "Test Artist", year: "1990" },
            {
                fieldname: "audio",
                filename: "serve-test.mp3",
                content: fakeAudio,
                contentType: "audio/mpeg",
            },
        );

        const uploadRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs/upload",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });

        const song = uploadRes.json();

        const audioRes = await app.inject({
            method: "GET",
            url: `/audio/${song.audioFilename}`,
        });

        expect(audioRes.statusCode).toBe(200);
        expect(audioRes.body).toBe("fake-audio-content-for-serving");
    });
});
