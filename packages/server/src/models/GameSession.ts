import mongoose, { Document, Schema } from "mongoose";

export interface IGameSession extends Document {
    code: string;
    playlist: mongoose.Types.ObjectId;
    status: "waiting" | "playing" | "finished";
    config: {
        roundTimerSeconds: number;
        maxPlayers: number;
    };
    players: {
        name: string;
        joinedAt: Date;
        timeline: { songId: mongoose.Types.ObjectId; position: number }[];
        score: number;
    }[];
    rounds: {
        songId: mongoose.Types.ObjectId;
        startedAt?: Date;
        endedAt?: Date;
    }[];
    currentRoundIndex: number;
    createdAt: Date;
    updatedAt: Date;
}

const gameSessionSchema = new Schema<IGameSession>(
    {
        code: { type: String, required: true, unique: true },
        playlist: {
            type: Schema.Types.ObjectId,
            ref: "Playlist",
            required: true,
        },
        status: {
            type: String,
            enum: ["waiting", "playing", "finished"],
            default: "waiting",
        },
        config: {
            roundTimerSeconds: { type: Number, default: 30 },
            maxPlayers: { type: Number, default: 20 },
        },
        players: [
            {
                name: { type: String, required: true },
                joinedAt: { type: Date, default: Date.now },
                timeline: [
                    {
                        songId: { type: Schema.Types.ObjectId, ref: "Song" },
                        position: { type: Number, required: true },
                    },
                ],
                score: { type: Number, default: 0 },
            },
        ],
        rounds: [
            {
                songId: {
                    type: Schema.Types.ObjectId,
                    ref: "Song",
                    required: true,
                },
                startedAt: { type: Date },
                endedAt: { type: Date },
            },
        ],
        currentRoundIndex: { type: Number, default: 0 },
    },
    { timestamps: true },
);

export const GameSessionModel = mongoose.model<IGameSession>(
    "GameSession",
    gameSessionSchema,
);
