import type { MusicSearchResult } from "@guess-your-song/shared";
import type { FastifyInstance } from "fastify";
import { parseBuffer } from "music-metadata";
import { PlaylistModel } from "../../models/Playlist";
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
        if (song.thumbnailFilename) {
            await app.thumbnailStorageService.delete(song.thumbnailFilename);
        }
        await PlaylistModel.updateMany({ songs: id }, { $pull: { songs: id } });
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

        if (data.file.truncated) {
            return reply
                .status(413)
                .send({ error: "File size exceeds the allowed limit" });
        }

        const audioFilename = await app.storageService.save(
            fileBuffer,
            data.filename,
        );

        // Auto-extract thumbnail from album art
        let thumbnailFilename: string | undefined;
        try {
            const metadata = await parseBuffer(fileBuffer);
            if (metadata.common.picture && metadata.common.picture.length > 0) {
                const pic = metadata.common.picture[0];
                const ext =
                    pic.format.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
                thumbnailFilename = await app.thumbnailStorageService.save(
                    Buffer.from(pic.data),
                    `cover.${ext}`,
                );
            }
        } catch {
            // Ignore metadata extraction errors
        }

        const song = await SongModel.create({
            title: fields.title,
            artist: fields.artist,
            year: parseInt(fields.year, 10),
            audioFilename,
            thumbnailFilename,
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

        if (data.file.truncated) {
            return reply
                .status(413)
                .send({ error: "File size exceeds the allowed limit" });
        }

        // Delete old audio file if replacing
        if (song.audioFilename) {
            await app.storageService.delete(song.audioFilename);
        }

        const audioFilename = await app.storageService.save(
            fileBuffer,
            data.filename,
        );

        song.audioFilename = audioFilename;

        // Auto-extract thumbnail from album art if song has no thumbnail
        if (!song.thumbnailFilename) {
            try {
                const metadata = await parseBuffer(fileBuffer);
                if (
                    metadata.common.picture &&
                    metadata.common.picture.length > 0
                ) {
                    const pic = metadata.common.picture[0];
                    const ext =
                        pic.format.split("/")[1]?.replace("jpeg", "jpg") ||
                        "jpg";
                    song.thumbnailFilename =
                        await app.thumbnailStorageService.save(
                            Buffer.from(pic.data),
                            `cover.${ext}`,
                        );
                }
            } catch {
                // Ignore metadata extraction errors
            }
        }

        await song.save();

        return reply.send(song);
    });

    app.put("/api/admin/songs/:id/thumbnail", async (request, reply) => {
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

        if (song.thumbnailFilename) {
            await app.thumbnailStorageService.delete(song.thumbnailFilename);
        }

        const thumbnailFilename = await app.thumbnailStorageService.save(
            fileBuffer,
            data.filename,
        );

        song.thumbnailFilename = thumbnailFilename;
        await song.save();

        return reply.send(song);
    });

    app.post("/api/admin/songs/extract-metadata", async (request, reply) => {
        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ error: "No file uploaded" });
        }

        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
            chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        const metadata = await parseBuffer(fileBuffer);

        const result: Record<string, unknown> = {};
        if (metadata.common.title) result.title = metadata.common.title;
        if (metadata.common.artist) result.artist = metadata.common.artist;
        if (metadata.common.year) result.year = metadata.common.year;
        if (metadata.format.duration)
            result.duration = metadata.format.duration;
        if (metadata.common.picture && metadata.common.picture.length > 0) {
            const pic = metadata.common.picture[0];
            const base64 = Buffer.from(pic.data).toString("base64");
            result.thumbnail = `data:${pic.format};base64,${base64}`;
        }

        return reply.send(result);
    });

    app.get("/api/admin/songs/search-music", async (request, reply) => {
        const { query } = request.query as { query?: string };
        if (!query?.trim()) {
            return reply
                .status(400)
                .send({ error: "query parameter is required" });
        }

        const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json&limit=10`;
        const response = await fetch(url, {
            headers: {
                "User-Agent": "GuessYourSong/1.0 (music-guessing-game)",
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            return reply
                .status(502)
                .send({ error: "MusicBrainz API request failed" });
        }

        const data = (await response.json()) as {
            recordings: Array<{
                id: string;
                title: string;
                score: number;
                "artist-credit"?: Array<{ name: string }>;
                "first-release-date"?: string;
                releases?: Array<{ id: string; title: string }>;
            }>;
        };

        const results: MusicSearchResult[] = (data.recordings ?? []).map(
            (rec) => ({
                id: rec.id,
                title: rec.title,
                artist:
                    rec["artist-credit"]?.map((a) => a.name).join(", ") ?? "",
                year: rec["first-release-date"]
                    ? parseInt(rec["first-release-date"].slice(0, 4), 10) ||
                      undefined
                    : undefined,
                album: rec.releases?.[0]?.title,
                releaseId: rec.releases?.[0]?.id,
                score: rec.score,
            }),
        );

        return reply.send(results);
    });

    app.post("/api/admin/songs/:id/cover-art", async (request, reply) => {
        const { id } = request.params as { id: string };
        const { releaseId } = request.body as { releaseId?: string };

        if (!releaseId?.trim()) {
            return reply.status(400).send({ error: "releaseId is required" });
        }

        const song = await SongModel.findById(id);
        if (!song) {
            return reply.status(404).send({ error: "Song not found" });
        }

        const url = `https://coverartarchive.org/release/${releaseId}/front`;
        const response = await fetch(url, {
            headers: {
                "User-Agent": "GuessYourSong/1.0 (music-guessing-game)",
            },
        });

        if (!response.ok) {
            return reply
                .status(502)
                .send({ error: "Failed to fetch cover art" });
        }

        const contentType =
            response.headers.get("content-type") ?? "image/jpeg";
        const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        if (song.thumbnailFilename) {
            await app.thumbnailStorageService.delete(song.thumbnailFilename);
        }

        const thumbnailFilename = await app.thumbnailStorageService.save(
            imageBuffer,
            `cover.${ext}`,
        );

        song.thumbnailFilename = thumbnailFilename;
        await song.save();

        return reply.send(song);
    });
}
