import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { AdminModel } from "../../models/Admin";

export async function authRoutes(app: FastifyInstance) {
    app.post("/api/admin/register", async (request, reply) => {
        const { username, password } = request.body as {
            username: string;
            password: string;
        };

        const existingAdmin = await AdminModel.findOne();
        if (existingAdmin) {
            return reply.status(403).send({ error: "Admin already exists" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const admin = await AdminModel.create({ username, passwordHash });

        const token = app.jwt.sign({ id: admin._id, username: admin.username });

        return reply.status(201).send({
            token,
            admin: {
                _id: admin._id,
                username: admin.username,
            },
        });
    });

    app.post("/api/admin/login", async (request, reply) => {
        const { username, password } = request.body as {
            username: string;
            password: string;
        };

        const admin = await AdminModel.findOne({ username });
        if (!admin) {
            return reply.status(401).send({ error: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) {
            return reply.status(401).send({ error: "Invalid credentials" });
        }

        const token = app.jwt.sign({ id: admin._id, username: admin.username });

        return reply.send({
            token,
            admin: {
                _id: admin._id,
                username: admin.username,
            },
        });
    });
}
