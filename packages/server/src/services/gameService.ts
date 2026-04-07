interface TimelineEntry {
    songId: string;
    year: number;
}

interface PlacementInput {
    timeline: TimelineEntry[];
    newSongYear: number;
    position: number;
}

interface PlacementResult {
    correct: boolean;
}

export function validatePlacement(input: PlacementInput): PlacementResult {
    const { timeline, newSongYear, position } = input;

    // Empty timeline: first song always succeeds
    if (timeline.length === 0) {
        return { correct: true };
    }

    const leftNeighbor = position > 0 ? timeline[position - 1] : null;
    const rightNeighbor =
        position < timeline.length ? timeline[position] : null;

    // Check: new song year must be >= left neighbor's year
    if (leftNeighbor && newSongYear < leftNeighbor.year) {
        return { correct: false };
    }

    // Check: new song year must be <= right neighbor's year
    if (rightNeighbor && newSongYear > rightNeighbor.year) {
        return { correct: false };
    }

    return { correct: true };
}
