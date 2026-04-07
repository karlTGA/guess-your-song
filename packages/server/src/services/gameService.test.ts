import { describe, it, expect } from "vitest";
import { validatePlacement } from "./gameService.js";

describe("validatePlacement — timeline placement logic", () => {
    // Timeline entries are stored as { songId, year } sorted by the player's placement order
    // When placing a new song at a position, it must be chronologically correct
    // relative to its neighbors in the timeline.

    it("placing first song always succeeds (empty timeline)", () => {
        const result = validatePlacement({
            timeline: [],
            newSongYear: 1990,
            position: 0,
        });

        expect(result.correct).toBe(true);
    });

    it("placing a song at the correct position succeeds", () => {
        // Timeline: [1980, 2000]
        // Placing 1990 at position 1 (between 1980 and 2000) → correct
        const result = validatePlacement({
            timeline: [
                { songId: "a", year: 1980 },
                { songId: "b", year: 2000 },
            ],
            newSongYear: 1990,
            position: 1,
        });

        expect(result.correct).toBe(true);
    });

    it("placing a song at the wrong position fails", () => {
        // Timeline: [1980, 2000]
        // Placing 1970 at position 1 (between 1980 and 2000) → wrong
        const result = validatePlacement({
            timeline: [
                { songId: "a", year: 1980 },
                { songId: "b", year: 2000 },
            ],
            newSongYear: 1970,
            position: 1,
        });

        expect(result.correct).toBe(false);
    });

    it("placing a song at the beginning of the timeline", () => {
        // Timeline: [1990, 2000]
        // Placing 1980 at position 0 (before 1990) → correct
        const result = validatePlacement({
            timeline: [
                { songId: "a", year: 1990 },
                { songId: "b", year: 2000 },
            ],
            newSongYear: 1980,
            position: 0,
        });

        expect(result.correct).toBe(true);
    });

    it("placing a song at the end of the timeline", () => {
        // Timeline: [1980, 1990]
        // Placing 2000 at position 2 (after 1990) → correct
        const result = validatePlacement({
            timeline: [
                { songId: "a", year: 1980 },
                { songId: "b", year: 1990 },
            ],
            newSongYear: 2000,
            position: 2,
        });

        expect(result.correct).toBe(true);
    });

    it("placing a song at the beginning when it should be at the end fails", () => {
        // Timeline: [1980, 1990]
        // Placing 2000 at position 0 (before 1980) → wrong
        const result = validatePlacement({
            timeline: [
                { songId: "a", year: 1980 },
                { songId: "b", year: 1990 },
            ],
            newSongYear: 2000,
            position: 0,
        });

        expect(result.correct).toBe(false);
    });

    it("songs with the same year as a neighbor are accepted", () => {
        // Timeline: [1980, 2000]
        // Placing 1980 at position 0 or 1 → should be correct (same year is ok)
        const result = validatePlacement({
            timeline: [
                { songId: "a", year: 1980 },
                { songId: "b", year: 2000 },
            ],
            newSongYear: 1980,
            position: 0,
        });

        expect(result.correct).toBe(true);
    });

    it("placing into a longer timeline at the correct middle position", () => {
        // Timeline: [1970, 1980, 1990, 2000, 2010]
        // Placing 1995 at position 3 (between 1990 and 2000) → correct
        const result = validatePlacement({
            timeline: [
                { songId: "a", year: 1970 },
                { songId: "b", year: 1980 },
                { songId: "c", year: 1990 },
                { songId: "d", year: 2000 },
                { songId: "e", year: 2010 },
            ],
            newSongYear: 1995,
            position: 3,
        });

        expect(result.correct).toBe(true);
    });
});
