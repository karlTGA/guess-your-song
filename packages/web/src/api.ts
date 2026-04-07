const API_BASE = "/api";

async function request<T>(
    url: string,
    options: RequestInit = {},
): Promise<T> {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Only set Content-Type for non-FormData bodies
    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}

// Auth
export function login(username: string, password: string) {
    return request<{ token: string; admin: { _id: string; username: string } }>(
        "/admin/login",
        { method: "POST", body: JSON.stringify({ username, password }) },
    );
}

// Songs
export function getSongs() {
    return request<{ _id: string; title: string; artist: string; year: number; audioFilename?: string }[]>(
        "/admin/songs",
    );
}

export function createSong(data: { title: string; artist: string; year: number }) {
    return request<{ _id: string; title: string; artist: string; year: number }>(
        "/admin/songs",
        { method: "POST", body: JSON.stringify(data) },
    );
}

export function updateSong(id: string, data: { title?: string; artist?: string; year?: number }) {
    return request<{ _id: string; title: string; artist: string; year: number }>(
        `/admin/songs/${id}`,
        { method: "PUT", body: JSON.stringify(data) },
    );
}

export function deleteSong(id: string) {
    return request<void>(`/admin/songs/${id}`, { method: "DELETE" });
}

export function uploadSongAudio(file: File) {
    const formData = new FormData();
    formData.append("audio", file);
    return request<{ _id: string; audioFilename: string }>(
        "/admin/songs/upload",
        { method: "POST", body: formData },
    );
}

// Playlists
export function getPlaylists() {
    return request<{ _id: string; name: string; description?: string; songs: string[] }[]>(
        "/admin/playlists",
    );
}

export function getPlaylist(id: string) {
    return request<{ _id: string; name: string; description?: string; songs: { _id: string; title: string; artist: string; year: number }[] }>(
        `/admin/playlists/${id}`,
    );
}

export function createPlaylist(data: { name: string; description?: string; songs: string[] }) {
    return request<{ _id: string; name: string }>(
        "/admin/playlists",
        { method: "POST", body: JSON.stringify(data) },
    );
}

export function updatePlaylist(id: string, data: { name?: string; description?: string; songs?: string[] }) {
    return request<{ _id: string; name: string }>(
        `/admin/playlists/${id}`,
        { method: "PUT", body: JSON.stringify(data) },
    );
}

export function deletePlaylist(id: string) {
    return request<void>(`/admin/playlists/${id}`, { method: "DELETE" });
}

// Sessions
export function createSession(data: { playlistId: string; config?: { roundTimerSeconds?: number; maxPlayers?: number } }) {
    return request<{ _id: string; code: string; status: string }>(
        "/admin/sessions",
        { method: "POST", body: JSON.stringify(data) },
    );
}

// Game (public)
export function getSessionInfo(code: string) {
    return request<{ code: string; status: string; config: { roundTimerSeconds: number; maxPlayers: number }; playerCount: number }>(
        `/game/sessions/${code}`,
    );
}

export function joinSession(code: string, playerName: string) {
    return request<{ message: string; player: { name: string; timeline: unknown[]; score: number } }>(
        `/game/sessions/${code}/join`,
        { method: "POST", body: JSON.stringify({ playerName }) },
    );
}

export function getGameState(code: string, playerName: string) {
    return request<{
        status: string;
        currentRound?: { songId: string; audioFilename: string; startedAt: string };
        player: { name: string; timeline: { _id: string; title: string; artist: string; year: number }[]; score: number };
        totalRounds: number;
        currentRoundIndex: number;
    }>(`/game/sessions/${code}/state?playerName=${encodeURIComponent(playerName)}`);
}

export function placeSong(code: string, playerName: string, position: number) {
    return request<{
        correct: boolean;
        song: { _id: string; title: string; artist: string; year: number };
        player: { name: string; timeline: { _id: string; title: string; artist: string; year: number }[]; score: number };
    }>(`/game/sessions/${code}/place`, {
        method: "POST",
        body: JSON.stringify({ playerName, position }),
    });
}

export function getResults(code: string) {
    return request<{
        status: string;
        players: { name: string; score: number; timeline: { _id: string; title: string; artist: string; year: number }[] }[];
    }>(`/game/sessions/${code}/results`);
}
