import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";

beforeAll(async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI not set — is global-setup running?");
    await mongoose.connect(uri);
});

afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const collection of collections) {
        await collection.deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});
