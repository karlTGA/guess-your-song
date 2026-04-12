export interface Song {
    _id: string;
    title: string;
    artist: string;
    year: number;
    audioFilename: string;
    thumbnailFilename?: string;
    duration: number;
    createdAt: string;
}

export interface CreateSongInput {
    title: string;
    artist: string;
    year: number;
    duration?: number;
}

export interface UpdateSongInput {
    title?: string;
    artist?: string;
    year?: number;
    duration?: number;
}

export interface ExtractedMetadata {
    title?: string;
    artist?: string;
    year?: number;
    duration?: number;
    thumbnail?: string;
}
