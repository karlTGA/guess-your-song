export interface Playlist {
    _id: string;
    name: string;
    description: string;
    songs: string[];
    createdAt: string;
}

export interface CreatePlaylistInput {
    name: string;
    description?: string;
    songs: string[];
}

export interface UpdatePlaylistInput {
    name?: string;
    description?: string;
    songs?: string[];
}
