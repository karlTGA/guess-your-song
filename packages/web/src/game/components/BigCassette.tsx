import type { CSSProperties } from "react";
import { gameTheme } from "./theme";

interface BigCassetteProps {
    /** Whether the audio is currently playing — drives reel spin + button icon. */
    playing: boolean;
    /** Called when the user taps the central play/pause button. */
    onToggle: () => void;
    /** 1-indexed track number for the cassette label strip. */
    currentRound: number;
    /** Disable interaction (e.g. while a placement is being submitted). */
    disabled?: boolean;
}

/**
 * Large cassette tape that contains the play button.
 * Two reels spin while playing, the tape line is tangent to the bottoms.
 *
 * The whole component is purely presentational — pass `playing` from your
 * <audio> ref and `onToggle` to drive playback.
 */
export default function BigCassette({
    playing,
    onToggle,
    currentRound,
    disabled = false,
}: BigCassetteProps) {
    const accent = gameTheme.color.accent;

    return (
        <div
            style={{
                width: 280,
                height: 170,
                position: "relative",
                filter: `drop-shadow(${gameTheme.shadow.cassette})`,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(165deg, ${accent}, ${accent}cc 60%, ${accent}99)`,
                    borderRadius: gameTheme.radius.lg,
                    border: `3px solid ${gameTheme.color.bg}`,
                    boxShadow: `inset 0 -6px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.4), 0 0 0 4px ${accent}33, 0 0 30px ${accent}66`,
                    overflow: "hidden",
                }}
            >
                {/* Corner screws */}
                {(
                    [
                        [10, 10],
                        [252, 10],
                        [10, 140],
                        [252, 140],
                    ] as const
                ).map(([x, y]) => (
                    <div
                        key={`${x}-${y}`}
                        style={{
                            position: "absolute",
                            left: x,
                            top: y,
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background:
                                "radial-gradient(circle at 35% 35%, #444, #0A0E27)",
                            boxShadow: "inset 0 0 2px rgba(255,255,255,0.3)",
                        }}
                    />
                ))}

                {/* Top label strip */}
                <div
                    style={{
                        position: "absolute",
                        left: 28,
                        right: 28,
                        top: 16,
                        height: 26,
                        background: gameTheme.color.inkInverse,
                        borderRadius: gameTheme.radius.sm,
                        border: `1.5px solid ${gameTheme.color.bg}`,
                        padding: "3px 10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontFamily: gameTheme.font.display,
                        fontSize: 10,
                        color: gameTheme.color.ink,
                        letterSpacing: "0.1em",
                    }}
                >
                    <span style={{ fontWeight: 700 }}>
                        SIDE A · TRACK {String(currentRound).padStart(2, "0")}
                    </span>
                    <span style={{ opacity: 0.5 }}>♪♪♪</span>
                </div>

                {/* Center window — reels + play button */}
                <div
                    style={{
                        position: "absolute",
                        left: 16,
                        right: 16,
                        top: 52,
                        bottom: 36,
                        background: gameTheme.color.bg,
                        borderRadius: gameTheme.radius.md,
                        border: "2px solid rgba(0,0,0,0.4)",
                        boxShadow:
                            "inset 0 4px 8px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 14px",
                    }}
                >
                    <Reel playing={playing} />

                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            zIndex: 2,
                        }}
                    >
                        <PlayPulse
                            playing={playing}
                            onToggle={onToggle}
                            disabled={disabled}
                        />
                    </div>

                    <Reel playing={playing} />

                    {/* Tape line — tangent to bottom of both reels */}
                    <div
                        style={{
                            position: "absolute",
                            left: 32,
                            right: 32,
                            top: "50%",
                            height: 2,
                            marginTop: 17,
                            background: `linear-gradient(90deg, rgba(139,90,43,0) 0%, rgba(139,90,43,0.85) 12%, rgba(139,90,43,0.85) 88%, rgba(139,90,43,0) 100%)`,
                            boxShadow: "0 0 4px rgba(139, 90, 43, 0.5)",
                            zIndex: 0,
                            pointerEvents: "none",
                        }}
                    />
                </div>

                {/* Bottom label — vertically aligned with the screws */}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 138,
                        height: 12,
                        fontFamily: gameTheme.font.display,
                        fontSize: 9,
                        color: gameTheme.color.ink,
                        letterSpacing: "0.2em",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontWeight: 700,
                        opacity: 0.7,
                        padding: "0 24px",
                    }}
                >
                    <span>HI-FI · 60 MIN</span>
                    <span>{playing ? "●REC" : "○STOP"}</span>
                </div>
            </div>
        </div>
    );
}

interface ReelProps {
    playing: boolean;
}

function Reel({ playing }: ReelProps) {
    const accent = gameTheme.color.accent;
    const reelStyle: CSSProperties = {
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "radial-gradient(circle, #2a2a2a 30%, #0a0a0a)",
        border: `2px solid ${accent}`,
        position: "relative",
        flexShrink: 0,
        boxShadow: `0 0 8px ${accent}55, inset 0 0 4px rgba(0,0,0,0.6)`,
        animation: playing ? "gys-vinyl-spin 1.6s linear infinite" : "none",
    };
    return (
        <div style={reelStyle}>
            {[0, 60, 120].map((deg) => (
                <div
                    key={deg}
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 28,
                        height: 2,
                        background: `${accent}cc`,
                        transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                        borderRadius: 1,
                    }}
                />
            ))}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: accent,
                    boxShadow: `0 0 6px ${accent}`,
                }}
            />
        </div>
    );
}

interface PlayPulseProps {
    playing: boolean;
    onToggle: () => void;
    disabled: boolean;
}

function PlayPulse({ playing, onToggle, disabled }: PlayPulseProps) {
    const accent = gameTheme.color.accent;
    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-label={playing ? "Pause song" : "Play song"}
            aria-pressed={playing}
            style={{
                width: 66,
                height: 66,
                borderRadius: "50%",
                border: `2px solid ${accent}`,
                background: playing ? `${accent}33` : "rgba(255,255,255,0.08)",
                color: gameTheme.color.inkInverse,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: playing
                    ? `0 0 24px ${accent}, inset 0 0 12px ${accent}55`
                    : `0 0 12px ${accent}55`,
                transition: "box-shadow .2s, background .2s",
                padding: 0,
            }}
        >
            {playing ? (
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <rect x="6" y="5" width="4" height="14" fill={accent} />
                    <rect x="14" y="5" width="4" height="14" fill={accent} />
                </svg>
            ) : (
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path d="M8 5v14l11-7z" fill={accent} />
                </svg>
            )}
        </button>
    );
}
