import { useEffect } from "react";
import { Confetti } from "./arcade";
import type { PlacedSong } from "./PlacedCard";
import { gameTheme } from "./theme";

interface RevealOverlayProps {
    correct: boolean;
    song: PlacedSong;
    onDismiss: () => void;
    /** ms before auto-dismiss. Default 1800. Set to 0 to disable. */
    autoDismissAfter?: number;
}

/**
 * Modal overlay that flashes after each placement:
 *   1. CORRECT / WRONG verdict in big neon type
 *   2. Year card flips in (rotateX 90→0) with the song's year + title + artist
 *   3. Confetti burst on correct answers
 *   4. Auto-dismisses after 1.8s, or on tap, or via the NEXT button
 */
export default function RevealOverlay({
    correct,
    song,
    onDismiss,
    autoDismissAfter = 1800,
}: RevealOverlayProps) {
    useEffect(() => {
        if (autoDismissAfter <= 0) return;
        const id = setTimeout(onDismiss, autoDismissAfter);
        return () => clearTimeout(id);
    }, [autoDismissAfter, onDismiss]);

    const color = correct ? gameTheme.color.success : gameTheme.color.error;

    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Esc/Enter handled by parent
        <div
            role="dialog"
            aria-live="assertive"
            aria-label={correct ? "Correct placement" : "Wrong placement"}
            onClick={onDismiss}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 80,
                background: "rgba(10,14,39,0.85)",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 28,
                animation: "gys-slide-up-in .3s",
                cursor: "pointer",
            }}
        >
            {correct && <Confetti active />}

            {/* Verdict */}
            <div
                style={{
                    fontFamily: gameTheme.font.display,
                    fontWeight: 900,
                    fontSize: 18,
                    color,
                    letterSpacing: "0.25em",
                    textShadow: `0 0 14px ${color}`,
                    marginBottom: 16,
                    animation: "gys-pop-in .4s",
                }}
            >
                {correct ? "★ CORRECT ★" : "✗ WRONG ✗"}
            </div>

            {/* Flip year card */}
            <div
                style={{
                    background: "#fff",
                    color: gameTheme.color.ink,
                    padding: "14px 14px 18px",
                    borderRadius: 16,
                    boxShadow: `0 0 0 4px ${color}, 0 20px 60px ${color}66`,
                    textAlign: "center",
                    width: 240,
                    animation:
                        "gys-flip-year .6s .15s both cubic-bezier(.3,1.3,.5,1)",
                    transformOrigin: "center bottom",
                }}
            >
                {song.thumbnailFilename ? (
                    <img
                        src={`/thumbnails/${song.thumbnailFilename}`}
                        alt={`${song.title} thumbnail`}
                        style={{
                            width: "100%",
                            aspectRatio: "1",
                            objectFit: "cover",
                            borderRadius: 8,
                            marginBottom: 10,
                            border: `2px solid ${gameTheme.color.bg}`,
                            display: "block",
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: "100%",
                            aspectRatio: "1",
                            background: gameTheme.color.bg,
                            borderRadius: 8,
                            marginBottom: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `2px solid ${gameTheme.color.bg}`,
                        }}
                    >
                        <div
                            style={{
                                width: "78%",
                                aspectRatio: "1",
                                borderRadius: "50%",
                                background:
                                    "radial-gradient(circle, #1a1a1a 18%, #000 22%, #1a1a1a 26%, #000 30%, #2a2a2a 70%, #000 100%)",
                                animation:
                                    "gys-vinyl-spin 4s linear infinite",
                            }}
                        />
                    </div>
                )}
                <div
                    style={{
                        fontFamily: gameTheme.font.mono,
                        fontSize: 10,
                        color: "rgba(10,14,39,0.5)",
                        letterSpacing: "0.2em",
                        marginBottom: 4,
                    }}
                >
                    RELEASED
                </div>
                <div
                    style={{
                        fontFamily: gameTheme.font.display,
                        fontWeight: 900,
                        fontSize: 38,
                        lineHeight: 1,
                    }}
                >
                    {song.year}
                </div>
                <div
                    style={{
                        fontFamily: gameTheme.font.body,
                        fontSize: 13,
                        fontWeight: 700,
                        marginTop: 8,
                    }}
                >
                    {song.title}
                </div>
                <div
                    style={{
                        fontFamily: gameTheme.font.body,
                        fontSize: 11,
                        color: "rgba(10,14,39,0.6)",
                    }}
                >
                    {song.artist}
                </div>
            </div>

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                }}
                style={{
                    marginTop: 22,
                    background: color,
                    color: gameTheme.color.ink,
                    fontFamily: gameTheme.font.display,
                    fontWeight: 900,
                    fontSize: 14,
                    letterSpacing: "0.15em",
                    padding: "14px 34px",
                    border: "none",
                    borderRadius: 10,
                    boxShadow: `0 6px 0 ${gameTheme.color.bg}, 0 6px 24px ${color}88`,
                    cursor: "pointer",
                    animation: "gys-slide-up-in .4s .3s both",
                }}
            >
                NEXT ROUND ▶
            </button>
        </div>
    );
}
