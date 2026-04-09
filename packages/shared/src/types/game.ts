export type GameStatus = "waiting" | "playing" | "finished";

export interface GameConfig {
    roundTimerSeconds: number;
    maxPlayers: number;
    numberOfSongs?: number;
}

export interface PlayerTimeline {
    name: string;
    joinedAt: string;
    timeline: TimelineEntry[];
    score: number;
}

export interface TimelineEntry {
    songId: string;
    position: number;
}

export interface GameRound {
    songId: string;
    startedAt: string;
    endedAt?: string;
}

export interface GameSession {
    _id: string;
    code: string;
    playlist: string;
    status: GameStatus;
    config: GameConfig;
    players: PlayerTimeline[];
    songOrder: string[];
    rounds: GameRound[];
    currentRoundIndex: number;
    createdAt: string;
}

export interface CreateGameSessionInput {
    playlistId: string;
    numberOfSongs?: number;
    config?: Partial<GameConfig>;
}

export interface PlaceSongInput {
    playerName: string;
    position: number;
}

export interface PlaceSongResult {
    correct: boolean;
    status: GameStatus;
    song: {
        _id: string;
        title: string;
        artist: string;
        year: number;
    };
    player: {
        name: string;
        timeline: {
            _id: string;
            title: string;
            artist: string;
            year: number;
        }[];
        score: number;
    };
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
    roundTimerSeconds: 30,
    maxPlayers: 20,
};
