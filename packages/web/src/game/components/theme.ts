// Design tokens for the Guess Your Song game UI.
// Updated to match the neon-arcade direction from the design canvas.

export const gameTheme = {
    color: {
        bg: "#0A0E27", // deep navy backdrop
        bgGradient:
            "linear-gradient(180deg, #1a0030 0%, #0A0E27 60%, #0A0E27 100%)",
        bgElevated: "#141a3a", // cards / panels
        ink: "#0A0E27", // dark text on light backgrounds
        inkInverse: "#ffffff",
        muted: "rgba(255,255,255,0.55)",
        mutedDim: "rgba(255,255,255,0.3)",
        // Primary accent — sticker-variant lime. Used for CTAs, gap glow,
        // cassette body, drop-it button.
        accent: "#B4FF39",
        accentSoft: "rgba(180, 255, 57, 0.15)",
        // Secondary neon palette — used by the title, confetti, cassette label,
        // win/lose states.
        neonPink: "#FF2E93",
        neonCyan: "#00F0FF",
        neonYellow: "#FFCE3D",
        neonOrange: "#FF8A3D",
        success: "#B4FF39",
        error: "#FF2E93",
        tape: "#8b5a2b",
    },
    font: {
        // Bold geometric — used for the GUESS YOUR SONG wordmark, year cards,
        // CTA buttons. Loaded from Google Fonts in index.html.
        display: "'Orbitron', system-ui, sans-serif",
        // Monospaced — used for HUD labels, tickers, cassette label strips.
        mono: "'Space Mono', ui-monospace, SFMono-Regular, monospace",
        body: "'Space Grotesk', system-ui, -apple-system, sans-serif",
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
