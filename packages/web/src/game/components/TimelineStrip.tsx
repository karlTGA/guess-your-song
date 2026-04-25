import {
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import PlacedCard, { type PlacedSong } from "./PlacedCard";
import { gameTheme } from "./theme";

interface TimelineStripProps {
    timeline: PlacedSong[];
    /**
     * Currently-highlighted gap index (0..timeline.length).
     * `null` = no selection. Driven by parent so the cassette/score area
     * can clear the pending placement on round change.
     */
    pendingPosition: number | null;
    /** Called when the user picks a gap (by tap OR by drag-snap). */
    onPickPosition: (position: number) => void;
    /** Called when the user confirms the pending placement. */
    onConfirm: () => void;
    /** Called when the user cancels (tap outside / explicit cancel). */
    onCancel: () => void;
    /** Disable interaction (e.g. while a placement is being submitted). */
    disabled?: boolean;
}

const GAP_WIDTH = 56;
const CARD_WIDTH = 96;
const STRIP_HEIGHT = 156;

/**
 * Sticker-style horizontal timeline (Variant C).
 *
 * Layout: [Gap 0] [Card 0] [Gap 1] [Card 1] ... [Card n-1] [Gap n]
 * Each gap is a tap target. A draggable "pin" above the strip acts as
 * an alternative input — drag it across gaps to snap-select.
 *
 * The active gap shows a "Place here?" confirm pill. Tap confirm to commit.
 */
export default function TimelineStrip({
    timeline,
    pendingPosition,
    onPickPosition,
    onConfirm,
    onCancel,
    disabled = false,
}: TimelineStripProps) {
    const stripRef = useRef<HTMLDivElement>(null);
    const gapRefs = useRef<Array<HTMLDivElement | null>>([]);
    const [dragX, setDragX] = useState<number | null>(null);

    // Sort timeline by year ascending — server sends it in placement order
    // but we always render chronologically.
    const sorted = [...timeline].sort((a, b) => a.year - b.year);
    const gapCount = sorted.length + 1;

    /** Pixel center of each gap, relative to the strip. */
    const gapCenters = useCallback(() => {
        const strip = stripRef.current;
        if (!strip) return [];
        const stripRect = strip.getBoundingClientRect();
        return gapRefs.current.map((el) => {
            if (!el) return 0;
            const r = el.getBoundingClientRect();
            return r.left + r.width / 2 - stripRect.left + strip.scrollLeft;
        });
    }, []);

    /** Snap an absolute X (within the strip) to the nearest gap index. */
    const snapToGap = useCallback(
        (x: number) => {
            const centers = gapCenters();
            if (centers.length === 0) return 0;
            let best = 0;
            let bestDist = Number.POSITIVE_INFINITY;
            centers.forEach((cx, i) => {
                const d = Math.abs(cx - x);
                if (d < bestDist) {
                    bestDist = d;
                    best = i;
                }
            });
            return best;
        },
        [gapCenters],
    );

    // Keep the active gap in view when it changes.
    useEffect(() => {
        if (pendingPosition === null) return;
        const el = gapRefs.current[pendingPosition];
        const strip = stripRef.current;
        if (el && strip) {
            const elRect = el.getBoundingClientRect();
            const stripRect = strip.getBoundingClientRect();
            if (
                elRect.left < stripRect.left ||
                elRect.right > stripRect.right
            ) {
                strip.scrollTo({
                    left:
                        el.offsetLeft -
                        strip.clientWidth / 2 +
                        el.clientWidth / 2,
                    behavior: "smooth",
                });
            }
        }
    }, [pendingPosition]);

    const handlePinPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const strip = stripRef.current;
        if (!strip) return;
        const rect = strip.getBoundingClientRect();
        const x = e.clientX - rect.left + strip.scrollLeft;
        setDragX(x);
        onPickPosition(snapToGap(x));
    };

    const handlePinPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (dragX === null) return;
        const strip = stripRef.current;
        if (!strip) return;
        const rect = strip.getBoundingClientRect();
        const x = e.clientX - rect.left + strip.scrollLeft;
        setDragX(x);
        onPickPosition(snapToGap(x));
    };

    const handlePinPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (dragX === null) return;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        setDragX(null);
        // Selection stays — user confirms via the pill.
    };

    return (
        <div
            style={{
                width: "100%",
                position: "relative",
                userSelect: "none",
                touchAction: "pan-y",
            }}
        >
            {/* Drag pin above the timeline */}
            <div
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label="Drag to choose a position on your timeline"
                aria-valuemin={0}
                aria-valuemax={Math.max(0, gapCount - 1)}
                aria-valuenow={pendingPosition ?? 0}
                onPointerDown={handlePinPointerDown}
                onPointerMove={handlePinPointerMove}
                onPointerUp={handlePinPointerUp}
                onPointerCancel={handlePinPointerUp}
                onKeyDown={(e) => {
                    if (disabled) return;
                    const cur = pendingPosition ?? 0;
                    if (e.key === "ArrowLeft" && cur > 0) {
                        e.preventDefault();
                        onPickPosition(cur - 1);
                    } else if (e.key === "ArrowRight" && cur < gapCount - 1) {
                        e.preventDefault();
                        onPickPosition(cur + 1);
                    } else if (e.key === "Enter" || e.key === " ") {
                        if (pendingPosition !== null) {
                            e.preventDefault();
                            onConfirm();
                        }
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        onCancel();
                    }
                }}
                style={{
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: disabled ? "not-allowed" : "grab",
                    color: gameTheme.color.muted,
                    fontFamily: gameTheme.font.display,
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    opacity: disabled ? 0.5 : 1,
                }}
            >
                ◀ DRAG OR TAP A GAP ▶
            </div>

            {/* Strip itself */}
            <div
                ref={stripRef}
                style={{
                    width: "100%",
                    height: STRIP_HEIGHT,
                    overflowX: "auto",
                    overflowY: "visible",
                    background: gameTheme.color.bgElevated,
                    borderRadius: gameTheme.radius.md,
                    padding: "12px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 0,
                    scrollbarWidth: "thin",
                }}
            >
                {/* Empty-state hint */}
                {sorted.length === 0 && pendingPosition === null && (
                    <div
                        style={{
                            color: gameTheme.color.mutedDim,
                            fontFamily: gameTheme.font.display,
                            fontSize: 11,
                            letterSpacing: "0.15em",
                            margin: "0 auto",
                        }}
                    >
                        EMPTY TIMELINE — PLACE YOUR FIRST SONG
                    </div>
                )}

                {Array.from({ length: gapCount }).map((_, gapIdx) => (
                    <GapAndCard
                        // biome-ignore lint/suspicious/noArrayIndexKey: gap index IS the identity
                        key={`gap-${gapIdx}`}
                        gapIdx={gapIdx}
                        active={pendingPosition === gapIdx}
                        disabled={disabled}
                        onPick={() => onPickPosition(gapIdx)}
                        onConfirm={onConfirm}
                        gapRef={(el) => {
                            gapRefs.current[gapIdx] = el;
                        }}
                        nextSong={sorted[gapIdx]}
                    />
                ))}
            </div>
        </div>
    );
}

interface GapAndCardProps {
    gapIdx: number;
    active: boolean;
    disabled: boolean;
    onPick: () => void;
    onConfirm: () => void;
    gapRef: (el: HTMLDivElement | null) => void;
    /** The card AFTER this gap (undefined if this is the trailing gap). */
    nextSong: PlacedSong | undefined;
}

function GapAndCard({
    gapIdx,
    active,
    disabled,
    onPick,
    onConfirm,
    gapRef,
    nextSong,
}: GapAndCardProps) {
    const accent = gameTheme.color.accent;

    const gapStyle: CSSProperties = {
        width: active ? GAP_WIDTH + 24 : GAP_WIDTH,
        height: STRIP_HEIGHT - 24,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        transition: "width .2s",
    };

    const dashStyle: CSSProperties = {
        width: "calc(100% - 12px)",
        height: "85%",
        borderRadius: gameTheme.radius.md,
        border: `2px dashed ${active ? accent : "rgba(255,255,255,0.18)"}`,
        background: active ? gameTheme.color.accentSoft : "transparent",
        boxShadow: active
            ? `0 0 14px ${accent}66, inset 0 0 14px ${accent}33`
            : "none",
        transition: "all .2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };

    return (
        <>
            {/** biome-ignore lint/a11y/useSemanticElements: keep it simple here */}
            <div
                ref={gapRef}
                style={gapStyle}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label="Place here"
                aria-pressed={active}
                onClick={() => {
                    if (disabled) return;
                    if (active) onConfirm();
                    else onPick();
                }}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (active) onConfirm();
                        else onPick();
                    }
                }}
            >
                <div style={dashStyle}>
                    {active && (
                        <span
                            style={{
                                fontFamily: gameTheme.font.display,
                                fontSize: 10,
                                letterSpacing: "0.2em",
                                color: accent,
                                textShadow: `0 0 6px ${accent}`,
                                fontWeight: 700,
                                textAlign: "center",
                                lineHeight: 1.4,
                                padding: 4,
                            }}
                        >
                            TAP TO
                            <br />
                            CONFIRM
                        </span>
                    )}
                </div>
            </div>

            {nextSong && (
                <div style={{ flexShrink: 0 }}>
                    <PlacedCard song={nextSong} size="sm" />
                </div>
            )}
        </>
    );
}

// re-export type so PlayPage doesn't need to import from PlacedCard directly
export type { PlacedSong };
