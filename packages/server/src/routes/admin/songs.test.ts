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

describe("admin songs API", () => {
    let app: FastifyInstance;
    let token: string;

    beforeEach(async () => {
        app = await buildTestApp();
        token = await registerAndLogin(app);
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
});
