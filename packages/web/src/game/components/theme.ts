// Design tokens for the game UI (Variant C — sticker timeline).
// Pulled from the Guess Your Song design system. Keep these in sync with
// any visual updates from design.

export const gameTheme = {
    color: {
        bg: "#0A0E27", // deep navy backdrop
        bgElevated: "#141a3a", // cards / panels
        ink: "#0A0E27", // dark text on light backgrounds
        inkInverse: "#ffffff",
        muted: "rgba(255,255,255,0.55)",
        mutedDim: "rgba(255,255,255,0.3)",
        accent: "#B4FF39", // neon lime — primary CTA / active state
        accentSoft: "rgba(180, 255, 57, 0.15)",
        success: "#5BE49B",
        error: "#FF5C7A",
        tape: "#8b5a2b",
    },
    font: {
        display: "'Space Mono', ui-monospace, SFMono-Regular, monospace",
        body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    },
    radius: {
        sm: 4,
        md: 8,
        lg: 14,
        pill: 999,
    },
    shadow: {
        cassette: "0 12px 24px rgba(0,0,0,0.5)",
        card: "0 4px 12px rgba(0,0,0,0.35)",
        accentGlow: "0 0 30px rgba(180,255,57,0.4)",
    },
} as const;

export type GameTheme = typeof gameTheme;
