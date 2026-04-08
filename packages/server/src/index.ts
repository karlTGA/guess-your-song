import { buildApp } from "./app";
import { loadConfig } from "./config";

async function start() {
    const config = loadConfig();
    const app = await buildApp(config);

    try {
        await app.listen({ port: config.port, host: config.host });
        console.log(`Server listening on http://${config.host}:${config.port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.on(signal, async () => {
            await app.close();
            process.exit(0);
        });
    }
}

start();
