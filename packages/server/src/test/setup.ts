import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";

const dbName = `test-${randomUUID()}`;

beforeAll(async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI not set — is global-setup running?");
    const separator = uri.endsWith("/") ? "" : "/";
    await mongoose.connect(`${uri}${separator}${dbName}`);
});

afterEach(async () => {
    const collections = (await mongoose.connection.db?.collections()) ?? [];
    for (const collection of collections) {
        await collection.deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
});
