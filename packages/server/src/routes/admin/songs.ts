import type { FastifyInstance } from "fastify";
import { SongModel } from "../../models/Song";
import { authenticate } from "../../plugins/auth";

export async function songRoutes(app: FastifyInstance) {
    app.addHook("onRequest", authenticate);

    app.get("/api/admin/songs", async () => {
        return SongModel.find().sort({ createdAt: -1 });
    });

    app.get("/api/admin/songs/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        const song = await SongModel.findById(id);
        if (!song) {
            return reply.status(404).send({ error: "Song not found" });
        }
        return song;
    });

    app.post("/api/admin/songs", async (request, reply) => {
        const { title, artist, year } = request.body as {
            title: string;
            artist: string;
            year: number;
        };

        const song = await SongModel.create({ title, artist, year });
        return reply.status(201).send(song);
    });

    app.put("/api/admin/songs/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        const updates = request.body as Record<string, unknown>;

        const song = await SongModel.findByIdAndUpdate(id, updates, {
            new: true,
        });
        if (!song) {
            return reply.status(404).send({ error: "Song not found" });
        }
        return song;
    });

    app.delete("/api/admin/songs/:id", async (request, reply) => {
        const { id } = request.params as { id: string };
        const song = await SongModel.findByIdAndDelete(id);
        if (!song) {
            return reply.status(404).send({ error: "Song not found" });
        }
        if (song.audioFilename) {
            await app.storageService.delete(song.audioFilename);
        }
        return reply.status(204).send();
    });

    app.post("/api/admin/songs/upload", async (request, reply) => {
        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ error: "No file uploaded" });
        }

        const fields: Record<string, string> = {};
        for (const [key, field] of Object.entries(data.fields)) {
            if (field && typeof field === "object" && "value" in field) {
                fields[key] = (field as { value: string }).value;
            }
        }

        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
            chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        const audioFilename = await app.storageService.save(
            fileBuffer,
            data.filename,
        );

        const song = await SongModel.create({
            title: fields.title,
            artist: fields.artist,
            year: parseInt(fields.year, 10),
            audioFilename,
        });

        return reply.status(201).send(song);
    });

    app.put("/api/admin/songs/:id/audio", async (request, reply) => {
        const { id } = request.params as { id: string };

        const song = await SongModel.findById(id);
        if (!song) {
            return reply.status(404).send({ error: "Song not found" });
        }

        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ error: "No file uploaded" });
        }

        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
            chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        // Delete old audio file if replacing
        if (song.audioFilename) {
            await app.storageService.delete(song.audioFilename);
        }

        const audioFilename = await app.storageService.save(
            fileBuffer,
            data.filename,
        );

        song.audioFilename = audioFilename;
        await song.save();

        return reply.send(song);
    });
}
