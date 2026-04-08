import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "./index";

describe("shared types", () => {
    it("exports default game config with sensible defaults", () => {
        expect(DEFAULT_GAME_CONFIG).toEqual({
            roundTimerSeconds: 30,
            maxPlayers: 20,
        });
    });
});
