import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

    it("uploading audio for existing song auto-extracts thumbnail from album art", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Art Song", artist: "Art Artist", year: 2021 },
        });
        const song = createRes.json();
        expect(song.thumbnailFilename).toBeUndefined();

        const fakePng = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]);
        const mp3 = buildId3TaggedMp3WithPicture(
            { title: "Art Song", artist: "Art Artist", year: "2021" },
            { mimeType: "image/png", data: fakePng },
        );
        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "audio",
                filename: "art.mp3",
                content: mp3,
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
        expect(updated.thumbnailFilename).toBeDefined();
        expect(updated.thumbnailFilename).toMatch(/\.png$/);

        // Thumbnail is servable
        const thumbRes = await app.inject({
            method: "GET",
            url: `/thumbnails/${updated.thumbnailFilename}`,
        });
        expect(thumbRes.statusCode).toBe(200);
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

    it("uploading song with audio auto-extracts thumbnail from album art", async () => {
        const fakePng = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]);
        const mp3 = buildId3TaggedMp3WithPicture(
            { title: "Art Song", artist: "Art Artist", year: "2021" },
            { mimeType: "image/png", data: fakePng },
        );
        const { body, contentType } = createMultipartPayload(
            { title: "Art Song", artist: "Art Artist", year: "2021" },
            {
                fieldname: "audio",
                filename: "art.mp3",
                content: mp3,
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
        expect(song.audioFilename).toBeDefined();
        expect(song.thumbnailFilename).toBeDefined();
        expect(song.thumbnailFilename).toMatch(/\.png$/);

        // Thumbnail is servable
        const thumbRes = await app.inject({
            method: "GET",
            url: `/thumbnails/${song.thumbnailFilename}`,
        });
        expect(thumbRes.statusCode).toBe(200);
    });

    it("extracts thumbnail even if thumbnails directory was removed", async () => {
        // Simulate the thumbnails directory being deleted while server runs
        const thumbnailDir = `${TEST_UPLOAD_DIR}/thumbnails`;
        fs.rmSync(thumbnailDir, { recursive: true });

        const fakePng = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]);
        const mp3 = buildId3TaggedMp3WithPicture(
            { title: "Recovery", artist: "Test Artist", year: "2021" },
            { mimeType: "image/png", data: fakePng },
        );
        const { body, contentType } = createMultipartPayload(
            { title: "Recovery", artist: "Test Artist", year: "2021" },
            {
                fieldname: "audio",
                filename: "recovery.mp3",
                content: mp3,
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
        expect(song.thumbnailFilename).toBeDefined();
        expect(song.thumbnailFilename).toMatch(/\.png$/);
    });

    it("admin can manually upload a thumbnail for a song", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Thumb Song", artist: "Artist", year: 2000 },
        });
        const song = createRes.json();

        const fakeImage = Buffer.from("fake-image-content");
        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "thumbnail",
                filename: "cover.jpg",
                content: fakeImage,
                contentType: "image/jpeg",
            },
        );

        const uploadRes = await app.inject({
            method: "PUT",
            url: `/api/admin/songs/${song._id}/thumbnail`,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });

        expect(uploadRes.statusCode).toBe(200);
        const updated = uploadRes.json();
        expect(updated.thumbnailFilename).toBeDefined();
        expect(updated.thumbnailFilename).toMatch(/\.jpg$/);

        // Thumbnail is servable
        const thumbRes = await app.inject({
            method: "GET",
            url: `/thumbnails/${updated.thumbnailFilename}`,
        });
        expect(thumbRes.statusCode).toBe(200);
        expect(thumbRes.body).toBe("fake-image-content");
    });

    it("replacing a song thumbnail deletes old thumbnail file", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                title: "Replace Thumb",
                artist: "Artist",
                year: 2000,
            },
        });
        const song = createRes.json();

        // First thumbnail
        const first = createMultipartPayload(
            {},
            {
                fieldname: "thumbnail",
                filename: "first.jpg",
                content: Buffer.from("first-image"),
                contentType: "image/jpeg",
            },
        );
        const firstRes = await app.inject({
            method: "PUT",
            url: `/api/admin/songs/${song._id}/thumbnail`,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": first.contentType,
            },
            payload: first.body,
        });
        const oldFilename = firstRes.json().thumbnailFilename;

        // Second thumbnail (replace)
        const second = createMultipartPayload(
            {},
            {
                fieldname: "thumbnail",
                filename: "second.png",
                content: Buffer.from("second-image"),
                contentType: "image/png",
            },
        );
        const secondRes = await app.inject({
            method: "PUT",
            url: `/api/admin/songs/${song._id}/thumbnail`,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": second.contentType,
            },
            payload: second.body,
        });

        expect(secondRes.statusCode).toBe(200);
        expect(secondRes.json().thumbnailFilename).not.toBe(oldFilename);

        // Old thumbnail is gone
        const oldRes = await app.inject({
            method: "GET",
            url: `/thumbnails/${oldFilename}`,
        });
        expect(oldRes.statusCode).toBe(404);
    });

    it("deleting a song also removes its thumbnail file", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Del Thumb", artist: "Artist", year: 2000 },
        });
        const song = createRes.json();

        // Upload thumbnail
        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "thumbnail",
                filename: "cover.jpg",
                content: Buffer.from("thumb-data"),
                contentType: "image/jpeg",
            },
        );
        const thumbRes = await app.inject({
            method: "PUT",
            url: `/api/admin/songs/${song._id}/thumbnail`,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });
        const thumbFilename = thumbRes.json().thumbnailFilename;

        // Delete song
        await app.inject({
            method: "DELETE",
            url: `/api/admin/songs/${song._id}`,
            headers: { authorization: `Bearer ${token}` },
        });

        // Thumbnail file is gone
        const thumbCheckRes = await app.inject({
            method: "GET",
            url: `/thumbnails/${thumbFilename}`,
        });
        expect(thumbCheckRes.statusCode).toBe(404);
    });

    it("deleting a song removes it from playlists", async () => {
        const song1 = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Song 1", artist: "Artist 1", year: 1980 },
        });
        const song2 = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Song 2", artist: "Artist 2", year: 1990 },
        });

        const playlistRes = await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                name: "Mixed",
                songs: [song1.json()._id, song2.json()._id],
            },
        });
        const playlist = playlistRes.json();
        expect(playlist.songs).toHaveLength(2);

        // Delete song1
        await app.inject({
            method: "DELETE",
            url: `/api/admin/songs/${song1.json()._id}`,
            headers: { authorization: `Bearer ${token}` },
        });

        // Playlist should only contain song2 (check unpopulated to catch dangling refs)
        const listRes = await app.inject({
            method: "GET",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
        });
        const playlists = listRes.json();
        const updated = playlists.find(
            (p: { _id: string }) => p._id === playlist._id,
        );
        expect(updated.songs).toHaveLength(1);
        expect(updated.songs[0]).toBe(song2.json()._id);
    });
});

/**
 * Build a minimal MP3 buffer with ID3v2.3 tags for testing.
 * Creates valid ID3v2.3 header + text frames, followed by a minimal MPEG frame.
 */
function buildId3TaggedMp3(tags: {
    title?: string;
    artist?: string;
    year?: string;
}): Buffer {
    const frames: Buffer[] = [];

    function textFrame(id: string, text: string): Buffer {
        // Text frame: 4-byte ID, 4-byte size, 2-byte flags, 1-byte encoding (0=latin1), text
        const textBuf = Buffer.from(text, "latin1");
        const size = 1 + textBuf.length; // encoding byte + text
        const header = Buffer.alloc(10);
        header.write(id, 0, 4, "ascii");
        header.writeUInt32BE(size, 4);
        // flags = 0x0000 (bytes 8-9 already zero)
        return Buffer.concat([header, Buffer.from([0x00]), textBuf]);
    }

    if (tags.title) frames.push(textFrame("TIT2", tags.title));
    if (tags.artist) frames.push(textFrame("TPE1", tags.artist));
    if (tags.year) frames.push(textFrame("TDRC", tags.year));

    const framesBuffer = Buffer.concat(frames);

    // ID3v2.3 header: "ID3", version 3.0, no flags, size (syncsafe)
    const id3Header = Buffer.alloc(10);
    id3Header.write("ID3", 0, 3, "ascii");
    id3Header[3] = 3; // version major
    id3Header[4] = 0; // version minor
    id3Header[5] = 0; // flags
    // Syncsafe integer encoding for size
    const tagSize = framesBuffer.length;
    id3Header[6] = (tagSize >> 21) & 0x7f;
    id3Header[7] = (tagSize >> 14) & 0x7f;
    id3Header[8] = (tagSize >> 7) & 0x7f;
    id3Header[9] = tagSize & 0x7f;

    // Minimal silent MPEG audio frame (MPEG1 Layer3, 128kbps, 44100Hz, mono)
    // Frame header: 0xFF 0xFB 0x90 0x00
    const mpegFrame = Buffer.alloc(417, 0);
    mpegFrame[0] = 0xff;
    mpegFrame[1] = 0xfb;
    mpegFrame[2] = 0x90;
    mpegFrame[3] = 0x00;

    return Buffer.concat([id3Header, framesBuffer, mpegFrame]);
}

describe("extract-metadata endpoint", () => {
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

    it("extracts metadata from an audio file with ID3 tags", async () => {
        const mp3 = buildId3TaggedMp3({
            title: "Test Song",
            artist: "Test Artist",
            year: "2020",
        });
        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "audio",
                filename: "tagged.mp3",
                content: mp3,
                contentType: "audio/mpeg",
            },
        );

        const response = await app.inject({
            method: "POST",
            url: "/api/admin/songs/extract-metadata",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });

        expect(response.statusCode).toBe(200);
        const metadata = response.json();
        expect(metadata.title).toBe("Test Song");
        expect(metadata.artist).toBe("Test Artist");
        expect(metadata.year).toBe(2020);
    });

    it("returns partial metadata for files without tags", async () => {
        const plainAudio = Buffer.alloc(417, 0);
        plainAudio[0] = 0xff;
        plainAudio[1] = 0xfb;
        plainAudio[2] = 0x90;
        plainAudio[3] = 0x00;

        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "audio",
                filename: "untagged.mp3",
                content: plainAudio,
                contentType: "audio/mpeg",
            },
        );

        const response = await app.inject({
            method: "POST",
            url: "/api/admin/songs/extract-metadata",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });

        expect(response.statusCode).toBe(200);
        const metadata = response.json();
        expect(metadata.title).toBeUndefined();
        expect(metadata.artist).toBeUndefined();
        expect(metadata.year).toBeUndefined();
    });

    it("returns 400 when no file is provided", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/admin/songs/extract-metadata",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type":
                    "multipart/form-data; boundary=----TestBoundary",
            },
            payload: Buffer.from("------TestBoundary--\r\n"),
        });

        expect(response.statusCode).toBe(400);
    });

    it("extracts thumbnail from ID3 album art as base64 data URL", async () => {
        const fakePng = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]);
        const mp3 = buildId3TaggedMp3WithPicture(
            { title: "Art Song", artist: "Art Artist", year: "2021" },
            { mimeType: "image/png", data: fakePng },
        );
        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "audio",
                filename: "art.mp3",
                content: mp3,
                contentType: "audio/mpeg",
            },
        );

        const response = await app.inject({
            method: "POST",
            url: "/api/admin/songs/extract-metadata",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });

        expect(response.statusCode).toBe(200);
        const metadata = response.json();
        expect(metadata.title).toBe("Art Song");
        expect(metadata.thumbnail).toMatch(/^data:image\/png;base64,/);
    });
});

/**
 * Build a minimal MP3 buffer with ID3v2.3 tags including an APIC (picture) frame.
 */
function buildId3TaggedMp3WithPicture(
    tags: { title?: string; artist?: string; year?: string },
    picture: { mimeType: string; data: Buffer },
): Buffer {
    const frames: Buffer[] = [];

    function textFrame(id: string, text: string): Buffer {
        const textBuf = Buffer.from(text, "latin1");
        const size = 1 + textBuf.length;
        const header = Buffer.alloc(10);
        header.write(id, 0, 4, "ascii");
        header.writeUInt32BE(size, 4);
        return Buffer.concat([header, Buffer.from([0x00]), textBuf]);
    }

    if (tags.title) frames.push(textFrame("TIT2", tags.title));
    if (tags.artist) frames.push(textFrame("TPE1", tags.artist));
    if (tags.year) frames.push(textFrame("TDRC", tags.year));

    // APIC frame: encoding(1) + mime(null-terminated) + pictureType(1) + description(null-terminated) + data
    const mimeBuf = Buffer.from(`${picture.mimeType}\0`, "latin1");
    const apicPayload = Buffer.concat([
        Buffer.from([0x00]), // encoding: latin1
        mimeBuf,
        Buffer.from([0x03]), // picture type: cover front
        Buffer.from([0x00]), // description: empty (null terminated)
        picture.data,
    ]);
    const apicHeader = Buffer.alloc(10);
    apicHeader.write("APIC", 0, 4, "ascii");
    apicHeader.writeUInt32BE(apicPayload.length, 4);
    frames.push(Buffer.concat([apicHeader, apicPayload]));

    const framesBuffer = Buffer.concat(frames);

    const id3Header = Buffer.alloc(10);
    id3Header.write("ID3", 0, 3, "ascii");
    id3Header[3] = 3;
    id3Header[4] = 0;
    id3Header[5] = 0;
    const tagSize = framesBuffer.length;
    id3Header[6] = (tagSize >> 21) & 0x7f;
    id3Header[7] = (tagSize >> 14) & 0x7f;
    id3Header[8] = (tagSize >> 7) & 0x7f;
    id3Header[9] = tagSize & 0x7f;

    const mpegFrame = Buffer.alloc(417, 0);
    mpegFrame[0] = 0xff;
    mpegFrame[1] = 0xfb;
    mpegFrame[2] = 0x90;
    mpegFrame[3] = 0x00;

    return Buffer.concat([id3Header, framesBuffer, mpegFrame]);
}

describe("search-music endpoint", () => {
    let app: FastifyInstance;
    let token: string;

    beforeEach(async () => {
        app = await buildTestApp({ uploadDir: TEST_UPLOAD_DIR });
        token = await registerAndLogin(app);
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await app.close();
        if (fs.existsSync(TEST_UPLOAD_DIR)) {
            fs.rmSync(TEST_UPLOAD_DIR, { recursive: true });
        }
    });

    it("proxies search to MusicBrainz and returns mapped results", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                recordings: [
                    {
                        id: "rec-1",
                        title: "Bohemian Rhapsody",
                        score: 100,
                        "artist-credit": [{ name: "Queen" }],
                        "first-release-date": "1975-10-31",
                        releases: [
                            {
                                id: "rel-1",
                                title: "A Night at the Opera",
                            },
                        ],
                    },
                    {
                        id: "rec-2",
                        title: "Bohemian Rhapsody",
                        score: 85,
                        "artist-credit": [{ name: "The Muppets" }],
                        "first-release-date": "2018",
                        releases: [],
                    },
                ],
            }),
        } as Response);

        const response = await app.inject({
            method: "GET",
            url: "/api/admin/songs/search-music?query=Bohemian%20Rhapsody",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        const results = response.json();
        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({
            id: "rec-1",
            title: "Bohemian Rhapsody",
            artist: "Queen",
            year: 1975,
            album: "A Night at the Opera",
            releaseId: "rel-1",
            score: 100,
        });
        expect(results[1]).toEqual({
            id: "rec-2",
            title: "Bohemian Rhapsody",
            artist: "The Muppets",
            year: 2018,
            album: undefined,
            releaseId: undefined,
            score: 85,
        });

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining("musicbrainz.org/ws/2/recording"),
            expect.objectContaining({
                headers: expect.objectContaining({
                    "User-Agent": expect.any(String),
                }),
            }),
        );
    });

    it("returns 400 when query is missing", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/api/admin/songs/search-music",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(400);
    });

    it("returns 502 when MusicBrainz API fails", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: false,
            status: 503,
        } as Response);

        const response = await app.inject({
            method: "GET",
            url: "/api/admin/songs/search-music?query=test",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(502);
    });
});

describe("cover-art endpoint", () => {
    let app: FastifyInstance;
    let token: string;

    beforeEach(async () => {
        app = await buildTestApp({ uploadDir: TEST_UPLOAD_DIR });
        token = await registerAndLogin(app);
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await app.close();
        if (fs.existsSync(TEST_UPLOAD_DIR)) {
            fs.rmSync(TEST_UPLOAD_DIR, { recursive: true });
        }
    });

    it("fetches cover art from Cover Art Archive and saves as thumbnail", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Test Song", artist: "Test Artist", year: 2020 },
        });
        const song = createRes.json();
        expect(song.thumbnailFilename).toBeUndefined();

        const fakeImageData = Buffer.from("fake-cover-art-jpeg-data");
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            headers: new Headers({ "content-type": "image/jpeg" }),
            arrayBuffer: async () =>
                fakeImageData.buffer.slice(
                    fakeImageData.byteOffset,
                    fakeImageData.byteOffset + fakeImageData.byteLength,
                ),
        } as Response);

        const response = await app.inject({
            method: "POST",
            url: `/api/admin/songs/${song._id}/cover-art`,
            headers: { authorization: `Bearer ${token}` },
            payload: { releaseId: "rel-123" },
        });

        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.thumbnailFilename).toBeDefined();
        expect(updated.thumbnailFilename).toMatch(/\.jpg$/);

        expect(globalThis.fetch).toHaveBeenCalledWith(
            "https://coverartarchive.org/release/rel-123/front",
            expect.objectContaining({
                headers: expect.objectContaining({
                    "User-Agent": expect.any(String),
                }),
            }),
        );

        // Thumbnail is servable
        const thumbRes = await app.inject({
            method: "GET",
            url: `/thumbnails/${updated.thumbnailFilename}`,
        });
        expect(thumbRes.statusCode).toBe(200);
    });

    it("replaces existing thumbnail when fetching cover art", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Test Song", artist: "Test Artist", year: 2020 },
        });
        const song = createRes.json();

        // Upload initial thumbnail
        const { body, contentType } = createMultipartPayload(
            {},
            {
                fieldname: "thumbnail",
                filename: "old-cover.jpg",
                content: Buffer.from("old-thumb"),
                contentType: "image/jpeg",
            },
        );
        const thumbRes = await app.inject({
            method: "PUT",
            url: `/api/admin/songs/${song._id}/thumbnail`,
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": contentType,
            },
            payload: body,
        });
        const oldFilename = thumbRes.json().thumbnailFilename;

        const fakeImageData = Buffer.from("new-cover-art-data");
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            headers: new Headers({ "content-type": "image/png" }),
            arrayBuffer: async () =>
                fakeImageData.buffer.slice(
                    fakeImageData.byteOffset,
                    fakeImageData.byteOffset + fakeImageData.byteLength,
                ),
        } as Response);

        const response = await app.inject({
            method: "POST",
            url: `/api/admin/songs/${song._id}/cover-art`,
            headers: { authorization: `Bearer ${token}` },
            payload: { releaseId: "rel-456" },
        });

        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.thumbnailFilename).not.toBe(oldFilename);

        // Old thumbnail is gone
        const oldRes = await app.inject({
            method: "GET",
            url: `/thumbnails/${oldFilename}`,
        });
        expect(oldRes.statusCode).toBe(404);
    });

    it("returns 404 for non-existent song", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/admin/songs/000000000000000000000000/cover-art",
            headers: { authorization: `Bearer ${token}` },
            payload: { releaseId: "rel-123" },
        });

        expect(response.statusCode).toBe(404);
    });

    it("returns 400 when releaseId is missing", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Test Song", artist: "Test Artist", year: 2020 },
        });
        const song = createRes.json();

        const response = await app.inject({
            method: "POST",
            url: `/api/admin/songs/${song._id}/cover-art`,
            headers: { authorization: `Bearer ${token}` },
            payload: {},
        });

        expect(response.statusCode).toBe(400);
    });

    it("returns 502 when Cover Art Archive is unavailable", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/songs",
            headers: { authorization: `Bearer ${token}` },
            payload: { title: "Test Song", artist: "Test Artist", year: 2020 },
        });
        const song = createRes.json();

        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: false,
            status: 404,
        } as Response);

        const response = await app.inject({
            method: "POST",
            url: `/api/admin/songs/${song._id}/cover-art`,
            headers: { authorization: `Bearer ${token}` },
            payload: { releaseId: "rel-no-art" },
        });

        expect(response.statusCode).toBe(502);
    });
});
