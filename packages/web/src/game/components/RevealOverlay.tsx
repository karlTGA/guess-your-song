import { useEffect } from "react";
import PlacedCard, { type PlacedSong } from "./PlacedCard";
import { gameTheme } from "./theme";

interface RevealOverlayProps {
    correct: boolean;
    song: PlacedSong;
    /** Called after the reveal duration elapses (or user taps). */
    onDismiss: () => void;
    /** Auto-dismiss after this many ms. Default 1800. */
    durationMs?: number;
}

/**
 * Brief full-screen flash shown after a placement is submitted.
 *
 * Renders a translucent backdrop, a CORRECT/INCORRECT banner, the actual
 * song card with year, then auto-dismisses (or the user can tap anywhere).
 *
 * The parent should mount this conditionally; on dismiss it clears the
 * placement state and re-fetches game state to advance the round.
 */
export default function RevealOverlay({
    correct,
    song,
    onDismiss,
    durationMs = 1800,
}: RevealOverlayProps) {
    useEffect(() => {
        const t = setTimeout(onDismiss, durationMs);
        return () => clearTimeout(t);
    }, [onDismiss, durationMs]);

    const tone = correct ? gameTheme.color.success : gameTheme.color.error;

    return (
        <button
            type="button"
            onClick={onDismiss}
            // biome-ignore lint/a11y/useSemanticElements: clickable backdrop
            aria-label={
                correct
                    ? `Correct! ${song.title} by ${song.artist}, ${song.year}`
                    : `Incorrect. ${song.title} by ${song.artist}, ${song.year}`
            }
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(10, 14, 39, 0.85)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
                zIndex: 1000,
                animation: "gys-reveal-in .25s ease-out",
                border: "none",
                cursor: "pointer",
                padding: 24,
            }}
        >
            <div
                role="status"
                aria-live="polite"
                style={{
                    fontFamily: gameTheme.font.display,
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: tone,
                    textShadow: `0 0 24px ${tone}`,
                }}
            >
                {correct ? "CORRECT" : "INCORRECT"}
            </div>

            <PlacedCard song={song} size="lg" highlight />

            <div
                style={{
                    fontFamily: gameTheme.font.body,
                    fontSize: 14,
                    color: gameTheme.color.muted,
                }}
            >
                tap to continue
            </div>
        </button>
    );
}
