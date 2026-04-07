import fs from "fs";
import path from "path";
import crypto from "crypto";

export class StorageService {
    private uploadDir: string;

    constructor(uploadDir: string) {
        this.uploadDir = uploadDir;
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async save(
        data: Buffer,
        originalFilename: string,
    ): Promise<string> {
        const ext = path.extname(originalFilename);
        const uniqueName = `${crypto.randomUUID()}${ext}`;
        const filePath = path.join(this.uploadDir, uniqueName);
        await fs.promises.writeFile(filePath, data);
        return uniqueName;
    }

    async delete(filename: string): Promise<void> {
        const filePath = path.join(this.uploadDir, filename);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    }

    getPath(filename: string): string {
        return path.join(this.uploadDir, filename);
    }

    getUploadDir(): string {
        return this.uploadDir;
    }
}
