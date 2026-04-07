export interface AppConfig {
    port: number;
    host: string;
    mongoUri: string;
    jwtSecret: string;
    uploadDir: string;
    webDistDir?: string;
}

export function loadConfig(): AppConfig {
    return {
        port: parseInt(process.env.PORT || "3000", 10),
        host: process.env.HOST || "0.0.0.0",
        mongoUri:
            process.env.MONGO_URI ||
            "mongodb://localhost:27017/guess-your-song",
        jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
        uploadDir: process.env.UPLOAD_DIR || "./uploads",
        webDistDir: process.env.WEB_DIST_DIR || undefined,
    };
}
