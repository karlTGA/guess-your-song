export interface Admin {
    _id: string;
    username: string;
}

export interface LoginInput {
    username: string;
    password: string;
}

export interface RegisterInput {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    admin: Admin;
}

export interface AdminSessionOverview {
    _id: string;
    code: string;
    status: "waiting" | "playing";
    playlist: { _id: string; name: string };
    playerCount: number;
    currentRoundIndex: number;
    totalRounds: number;
    config: { roundTimerSeconds: number; maxPlayers: number };
    createdAt: string;
}

export interface AuthResponse {
    token: string;
    admin: Admin;
}
