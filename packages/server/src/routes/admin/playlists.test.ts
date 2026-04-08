import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../../test/helpers";

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

async function createSong(
    app: FastifyInstance,
    token: string,
    data: { title: string; artist: string; year: number },
) {
    const res = await app.inject({
        method: "POST",
        url: "/api/admin/songs",
        headers: { authorization: `Bearer ${token}` },
        payload: data,
    });
    return res.json();
}

describe("admin playlists API", () => {
    let app: FastifyInstance;
    let token: string;

    beforeEach(async () => {
        app = await buildTestApp();
        token = await registerAndLogin(app);
    });

    it("admin can create a playlist with song references", async () => {
        const song1 = await createSong(app, token, {
            title: "Song 1",
            artist: "Artist 1",
            year: 1980,
        });
        const song2 = await createSong(app, token, {
            title: "Song 2",
            artist: "Artist 2",
            year: 1990,
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: {
                name: "80s and 90s",
                description: "Best of two decades",
                songs: [song1._id, song2._id],
            },
        });

        expect(response.statusCode).toBe(201);
        const playlist = response.json();
        expect(playlist.name).toBe("80s and 90s");
        expect(playlist.songs).toHaveLength(2);
    });

    it("admin can list playlists", async () => {
        await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "Playlist A", songs: [] },
        });
        await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "Playlist B", songs: [] },
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toHaveLength(2);
    });

    it("admin can get a single playlist with populated songs", async () => {
        const song = await createSong(app, token, {
            title: "Populated Song",
            artist: "Artist",
            year: 2000,
        });

        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "With Songs", songs: [song._id] },
        });
        const created = createRes.json();

        const response = await app.inject({
            method: "GET",
            url: `/api/admin/playlists/${created._id}`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        const playlist = response.json();
        expect(playlist.songs[0].title).toBe("Populated Song");
    });

    it("admin can update a playlist", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "Old Name", songs: [] },
        });
        const created = createRes.json();

        const response = await app.inject({
            method: "PUT",
            url: `/api/admin/playlists/${created._id}`,
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "New Name" },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().name).toBe("New Name");
    });

    it("admin can delete a playlist", async () => {
        const createRes = await app.inject({
            method: "POST",
            url: "/api/admin/playlists",
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "To Delete", songs: [] },
        });
        const created = createRes.json();

        const deleteRes = await app.inject({
            method: "DELETE",
            url: `/api/admin/playlists/${created._id}`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(deleteRes.statusCode).toBe(204);

        const getRes = await app.inject({
            method: "GET",
            url: `/api/admin/playlists/${created._id}`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(getRes.statusCode).toBe(404);
    });
});
