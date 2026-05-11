import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { MusicSearchResult } from "@guess-your-song/shared";

const execFileAsync = promisify(execFile);

export interface Fingerprint {
    duration: number;
    fingerprint: string;
}

export class FpcalcMissingError extends Error {
    constructor() {
        super(
            "fpcalc binary not found. Install chromaprint-tools to enable AcoustID.",
        );
        this.name = "FpcalcMissingError";
    }
}

export async function fingerprintAudio(filePath: string): Promise<Fingerprint> {
    let stdout: string;
    try {
        ({ stdout } = await execFileAsync("fpcalc", ["-json", filePath], {
            // Long enough for a 10-minute file on slow hardware.
            timeout: 30_000,
            maxBuffer: 4 * 1024 * 1024,
        }));
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            throw new FpcalcMissingError();
        }
        throw err;
    }

    const parsed = JSON.parse(stdout) as {
        duration?: number;
        fingerprint?: string;
    };
    if (
        typeof parsed.duration !== "number" ||
        typeof parsed.fingerprint !== "string"
    ) {
        throw new Error("fpcalc returned malformed output");
    }
    return { duration: parsed.duration, fingerprint: parsed.fingerprint };
}

interface AcoustidRelease {
    id: string;
    title?: string;
    // Date can be a partial like "1975" or "1975-10-31", or an object form.
    date?: { year?: number };
    releaseevents?: Array<{ date?: { year?: number } }>;
}

interface AcoustidRecording {
    id: string;
    title?: string;
    artists?: Array<{ name: string }>;
    releases?: AcoustidRelease[];
}

interface AcoustidResult {
    id: string;
    score: number;
    recordings?: AcoustidRecording[];
}

interface AcoustidResponse {
    status: string;
    results?: AcoustidResult[];
    error?: { message: string };
}

function pickRepresentativeRelease(
    rec: AcoustidRecording,
): { release: AcoustidRelease; year?: number } | undefined {
    if (!rec.releases || rec.releases.length === 0) return undefined;
    // Pick the earliest dated release as the canonical one — typically the
    // original album rather than a later compilation/remaster.
    let best: { release: AcoustidRelease; year?: number } | undefined;
    for (const release of rec.releases) {
        const year =
            release.date?.year ?? release.releaseevents?.[0]?.date?.year;
        if (!best || (year && (!best.year || year < best.year))) {
            best = { release, year };
        }
    }
    return best;
}

export async function lookupAcoustid(
    apiKey: string,
    fp: Fingerprint,
): Promise<MusicSearchResult[]> {
    console.log("Looking up AcoustID with duration", fp.duration);
    console.log("Fingerprint length:", fp.fingerprint.length);
    console.log("Fingerprint api key:", apiKey );
    const params = new URLSearchParams({
        client: apiKey,
        meta: "recordingids",
        duration: String(Math.round(fp.duration)),
        fingerprint: fp.fingerprint,
    });

    const response = await fetch("https://api.acoustid.org/v2/lookup", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "GuessYourSong/1.0 (music-guessing-game)",
        },
        body: params.toString(),
    });

    const rawBody = await response.text();
    
    let data: AcoustidResponse | undefined;
    try {
        data = JSON.parse(rawBody) as AcoustidResponse;
    } catch {
        // Non-JSON body — fall through to the HTTP-level error.
    }
    
    console.log("AcoustID raw response:", data);

    if (!response.ok) {
        const detail = data?.error?.message ?? rawBody.slice(0, 200);
        throw new Error(`HTTP ${response.status}: ${detail}`);
    }
    if (!data || data.status !== "ok") {
        throw new Error(data?.error?.message ?? "AcoustID returned an error");
    }

    // One row per recording. Multiple matches can share a recording when the
    // fingerprint database has duplicate submissions; dedupe by recording id.
    const seen = new Set<string>();
    const rows: MusicSearchResult[] = [];
    for (const match of data.results ?? []) {
        const score = Math.round(match.score * 100);
        for (const rec of match.recordings ?? []) {
            if (seen.has(rec.id)) continue;
            seen.add(rec.id);
            const representative = pickRepresentativeRelease(rec);
            rows.push({
                id: rec.id,
                title: rec.title ?? "",
                artist: rec.artists?.map((a) => a.name).join(", ") ?? "",
                album: representative?.release.title,
                releaseId: representative?.release.id,
                year: representative?.year,
                score,
            });
        }
    }
    return rows;
}
