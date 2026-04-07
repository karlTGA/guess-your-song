import mongoose, { type Document, Schema } from "mongoose";

export interface IAdmin extends Document {
    username: string;
    passwordHash: string;
}

const adminSchema = new Schema<IAdmin>(
    {
        username: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
    },
    { timestamps: true },
);

export const AdminModel = mongoose.model<IAdmin>("Admin", adminSchema);
