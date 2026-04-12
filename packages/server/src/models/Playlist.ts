import mongoose, { type Document, Schema } from "mongoose";

export interface IPlaylist extends Document {
    name: string;
    description?: string;
    thumbnailFilename?: string;
    songs: mongoose.Types.ObjectId[];
}

const playlistSchema = new Schema<IPlaylist>(
    {
        name: { type: String, required: true },
        description: { type: String, default: "" },
        thumbnailFilename: { type: String },
        songs: [{ type: Schema.Types.ObjectId, ref: "Song" }],
    },
    { timestamps: true },
);

export const PlaylistModel = mongoose.model<IPlaylist>(
    "Playlist",
    playlistSchema,
);
