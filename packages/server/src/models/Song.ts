import mongoose, { Schema, Document } from "mongoose";

export interface ISong extends Document {
    title: string;
    artist: string;
    year: number;
    audioFilename?: string;
    duration?: number;
}

const songSchema = new Schema<ISong>(
    {
        title: { type: String, required: true },
        artist: { type: String, required: true },
        year: { type: Number, required: true },
        audioFilename: { type: String },
        duration: { type: Number },
    },
    { timestamps: true },
);

export const SongModel = mongoose.model<ISong>("Song", songSchema);
