import type { CSSProperties } from "react";
import { gameTheme } from "./theme";

export interface PlacedSong {
    _id?: string;
    id?: string;
    title: string;
    artist: string;
    year: number;
    thumbnailFilename?: string;
}

interface PlacedCardProps {
    song: PlacedSong;
    /** Compact mode (in-timeline) vs hero mode (results page). */
    size?: "sm" | "lg";
    /** Visually highlight (e.g. just-placed). */
    highlight?: boolean;
    /**
     * Render as the floating "mystery" card hovering above the active gap:
     * tilted slightly, year hidden behind ????, big "?" in the artwork well.
     */
    isMystery?: boolean;
}

/**
 * Sticker-style card showing a song with thumbnail (or vinyl fallback) +
 * year + title/artist. Sized for the timeline strip.
 */
export default function PlacedCard({
    song,
    size = "sm",
    highlight = false,
    isMystery = false,
}: PlacedCardProps) {
    const w = size === "lg" ? 132 : 96;
    const h = size === "lg" ? 168 : 124;
    const thumbSrc =
        !isMystery && song.thumbnailFilename
            ? `/thumbnails/${song.thumbnailFilename}`
            : undefined;

    const wrapperStyle: CSSProperties = {
        width: w,
        height: h,
        borderRadius: gameTheme.radius.md,
        background: gameTheme.color.inkInverse,
        color: gameTheme.color.ink,
        boxShadow: highlight
            ? `0 0 0 3px ${gameTheme.color.accent}, 0 6px 16px rgba(0,0,0,0.5)`
            : isMystery
              ? `4px 4px 0 ${gameTheme.color.bg}, 0 8px 20px rgba(0,0,0,0.4)`
              : gameTheme.shadow.card,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        transform: isMystery
            ? "rotate(-3deg)"
            : highlight
              ? "translateY(-2px)"
              : "none",
        transition: "transform .25s, box-shadow .25s",
        display: "flex",
        flexDirection: "column",
        border: isMystery ? `2px solid ${gameTheme.color.bg}` : "none",
    };

    return (
        <figure
            style={wrapperStyle}
            aria-label={
                isMystery
                    ? "Mystery song"
                    : `${song.title} by ${song.artist}, ${song.year}`
            }
        >
            {/* Year badge */}
            <div
                style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: gameTheme.color.bg,
                    color: isMystery
                        ? gameTheme.color.neonYellow
                        : gameTheme.color.accent,
                    fontFamily: gameTheme.font.display,
                    fontSize: size === "lg" ? 14 : 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: gameTheme.radius.pill,
                    letterSpacing: "0.05em",
                    zIndex: 2,
                }}
            >
                {isMystery ? "????" : song.year}
            </div>

            {/* Artwork area */}
            <div
                style={{
                    width: "100%",
                    height: size === "lg" ? 100 : 70,
                    background: gameTheme.color.bg,
                    flexShrink: 0,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {thumbSrc ? (
                    <img
                        src={thumbSrc}
                        alt={`${song.title} thumbnail`}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                        }}
                    />
                ) : isMystery ? (
                    <div
                        style={{
                            fontFamily: gameTheme.font.display,
                            fontSize: 28,
                            fontWeight: 900,
                            color: gameTheme.color.neonYellow,
                            textShadow: `0 0 10px ${gameTheme.color.neonYellow}`,
                        }}
                    >
                        ?
                    </div>
                ) : (
                    <VinylFallback />
                )}
            </div>

            {/* Title + artist */}
            <div
                style={{
                    padding: size === "lg" ? "10px 12px" : "6px 8px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    minHeight: 0,
                }}
            >
                {isMystery ? (
                    <div
                        style={{
                            fontFamily: gameTheme.font.mono,
                            fontSize: 9,
                            color: gameTheme.color.neonYellow,
                            letterSpacing: "0.2em",
                            textAlign: "center",
                            textShadow: `0 0 6px ${gameTheme.color.neonYellow}`,
                        }}
                    >
                        NEW!
                    </div>
                ) : (
                    <>
                        <div
                            style={{
                                fontSize: size === "lg" ? 13 : 10,
                                fontWeight: 700,
                                lineHeight: 1.2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                            }}
                        >
                            {song.title}
                        </div>
                        <div
                            style={{
                                fontSize: size === "lg" ? 11 : 9,
                                opacity: 0.65,
                                marginTop: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {song.artist}
                        </div>
                    </>
                )}
            </div>
        </figure>
    );
}

function VinylFallback() {
    return (
        <svg width="60%" height="60%" viewBox="0 0 60 60" aria-hidden="true">
            <title>Vinyl record</title>
            <circle cx="30" cy="30" r="28" fill="#0a0a0a" />
            <circle
                cx="30"
                cy="30"
                r="22"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
            />
            <circle
                cx="30"
                cy="30"
                r="16"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
            />
            <circle cx="30" cy="30" r="8" fill={gameTheme.color.accent} />
            <circle cx="30" cy="30" r="2" fill={gameTheme.color.bg} />
        </svg>
    );
}
