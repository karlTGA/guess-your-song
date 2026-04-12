import mongoose, { type Document, Schema } from "mongoose";

export interface ISong extends Document {
    title: string;
    artist: string;
    year: number;
    audioFilename?: string;
    thumbnailFilename?: string;
    duration?: number;
}

const songSchema = new Schema<ISong>(
    {
        title: { type: String, required: true },
        artist: { type: String, required: true },
        year: { type: Number, required: true },
        audioFilename: { type: String },
        thumbnailFilename: { type: String },
        duration: { type: Number },
    },
    { timestamps: true },
);

export const SongModel = mongoose.model<ISong>("Song", songSchema);
