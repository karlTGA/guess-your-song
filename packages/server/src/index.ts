import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

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
}

start();
