import mongoose, { Schema, Document } from "mongoose";

export interface IPlaylist extends Document {
    name: string;
    description?: string;
    songs: mongoose.Types.ObjectId[];
}

const playlistSchema = new Schema<IPlaylist>(
    {
        name: { type: String, required: true },
        description: { type: String, default: "" },
        songs: [{ type: Schema.Types.ObjectId, ref: "Song" }],
    },
    { timestamps: true },
);

export const PlaylistModel = mongoose.model<IPlaylist>(
    "Playlist",
    playlistSchema,
);
