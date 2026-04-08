import { describe, expect, it } from "vitest";
import { buildTestApp } from "../../test/helpers";

describe("POST /api/admin/register", () => {
    it("first admin can register", async () => {
        const app = await buildTestApp();

        const response = await app.inject({
            method: "POST",
            url: "/api/admin/register",
            payload: {
                username: "admin",
                password: "securepass123",
            },
        });

        expect(response.statusCode).toBe(201);
        const body = response.json();
        expect(body.admin.username).toBe("admin");
        expect(body.token).toBeDefined();
        expect(body.admin).not.toHaveProperty("passwordHash");

        await app.close();
    });

    it("registration is blocked when admin already exists", async () => {
        const app = await buildTestApp();

        // Register first admin
        await app.inject({
            method: "POST",
            url: "/api/admin/register",
            payload: { username: "admin", password: "securepass123" },
        });

        // Try to register a second admin
        const response = await app.inject({
            method: "POST",
            url: "/api/admin/register",
            payload: { username: "admin2", password: "anotherpass" },
        });

        expect(response.statusCode).toBe(403);
        expect(response.json().error).toBe("Admin already exists");

        await app.close();
    });
});

describe("POST /api/admin/login", () => {
    it("admin can login with correct credentials and receives JWT", async () => {
        const app = await buildTestApp();

        // Register first
        await app.inject({
            method: "POST",
            url: "/api/admin/register",
            payload: { username: "admin", password: "securepass123" },
        });

        // Login
        const response = await app.inject({
            method: "POST",
            url: "/api/admin/login",
            payload: { username: "admin", password: "securepass123" },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.token).toBeDefined();
        expect(body.admin.username).toBe("admin");

        await app.close();
    });

    it("login fails with wrong password", async () => {
        const app = await buildTestApp();

        await app.inject({
            method: "POST",
            url: "/api/admin/register",
            payload: { username: "admin", password: "securepass123" },
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/admin/login",
            payload: { username: "admin", password: "wrongpass" },
        });

        expect(response.statusCode).toBe(401);
        expect(response.json().error).toBe("Invalid credentials");

        await app.close();
    });

    it("login fails with non-existent username", async () => {
        const app = await buildTestApp();

        const response = await app.inject({
            method: "POST",
            url: "/api/admin/login",
            payload: { username: "nobody", password: "whatever" },
        });

        expect(response.statusCode).toBe(401);
        expect(response.json().error).toBe("Invalid credentials");

        await app.close();
    });
});
