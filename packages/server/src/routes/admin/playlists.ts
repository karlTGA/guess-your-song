import { FastifyInstance } from "fastify";
import { PlaylistModel } from "../../models/Playlist.js";
import { authenticate } from "../../plugins/auth.js";

export async function playlistRoutes(app: FastifyInstance) {
    app.addHook("onRequest", authenticate);

    app.get("/api/admin/playlists", async () => {
        return PlaylistModel.find().sort({ createdAt: -1 });
    });

    app.get("/api/admin/playlists/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        const playlist = await PlaylistModel.findById(id).populate("songs");
        if (!playlist) {
            return reply.status(404).send({ error: "Playlist not found" });
        }
        return playlist;
    });

    app.post("/api/admin/playlists", async (request, reply) => {
        const { name, description, songs } = request.body as {
            name: string;
            description?: string;
            songs: string[];
        };

        const playlist = await PlaylistModel.create({
            name,
            description,
            songs,
        });
        return reply.status(201).send(playlist);
    });

    app.put("/api/admin/playlists/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        const updates = request.body as Record<string, unknown>;

        const playlist = await PlaylistModel.findByIdAndUpdate(id, updates, {
            new: true,
        });
        if (!playlist) {
            return reply.status(404).send({ error: "Playlist not found" });
        }
        return playlist;
    });

    app.delete("/api/admin/playlists/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        const playlist = await PlaylistModel.findByIdAndDelete(id);
        if (!playlist) {
            return reply.status(404).send({ error: "Playlist not found" });
        }
        return reply.status(204).send();
    });
}
