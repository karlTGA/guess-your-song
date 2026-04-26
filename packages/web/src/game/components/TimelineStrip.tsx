import {
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import PlacedCard, { type PlacedSong } from "./PlacedCard";
import { gameTheme } from "./theme";

interface TimelineStripProps {
    timeline: PlacedSong[];
    /**
     * Currently-highlighted gap index (0..timeline.length).
     * Driven by parent so the page can clear on round change.
     */
    pendingPosition: number;
    /** Called whenever the user lands on a different gap (drag-snap or tap). */
    onPickPosition: (position: number) => void;
    /** Called when the user presses the big DROP IT button. */
    onConfirm: () => void;
    /** Disable interaction (e.g. while a placement is being submitted). */
    disabled?: boolean;
    /**
     * Renders the floating "mystery" card pinned over the active gap.
     * Pass null when nothing is in flight (e.g. after a placement, before
     * the next round loads).
     */
    mysteryCard?: ReactNode | null;
}

const GAP_WIDTH = 56;
const CARD_WIDTH = 96;
const CARD_HEIGHT = 132;
const STRIP_HEIGHT = CARD_HEIGHT + 60;

/**
 * Horizontal timeline that DRAGS UNDER A FIXED CENTER POINTER.
 *
 * Layout: [Gap 0] [Card 0] [Gap 1] [Card 1] ... [Card n-1] [Gap n]
 *
 * Interaction:
 *  - Pointer-down + drag anywhere on the strip slides the whole track
 *    horizontally. On release, snaps to the nearest gap under the center
 *    line and reports it via onPickPosition.
 *  - Tap on a specific gap is a fallback that picks that gap directly.
 *  - The DROP IT button at the bottom commits the pending position.
 *  - Keyboard: ←/→ on the focused strip moves between gaps; Enter/Space
 *    confirms.
 *
 * The "mystery card" — the unknown song the player is placing — is pinned
 * at the center, hovering above the active gap, and bounces gently.
 */
export default function TimelineStrip({
    timeline,
    pendingPosition,
    onPickPosition,
    onConfirm,
    disabled = false,
    mysteryCard,
}: TimelineStripProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const [viewportW, setViewportW] = useState(360);

    // Sort timeline by year ascending — server may send placements out of
    // order, but we always render chronologically.
    const sorted = useMemo(
        () => [...timeline].sort((a, b) => a.year - b.year),
        [timeline],
    );
    const gapCount = sorted.length + 1;

    // Measure viewport so we can center the active gap precisely.
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const measure = () => setViewportW(el.clientWidth);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    /** Pixel center of each gap, measured along the strip itself. */
    const gapCenters = useMemo(() => {
        const centers: number[] = [];
        let x = 0;
        for (let i = 0; i < gapCount; i++) {
            centers.push(x + GAP_WIDTH / 2);
            x += GAP_WIDTH;
            if (i < sorted.length) x += CARD_WIDTH;
        }
        return centers;
    }, [gapCount, sorted.length]);

    // Pointer-drag state. dragX is the live offset added on top of the
    // resting (snapped) translateX.
    const [dragX, setDragX] = useState(0);
    const [dragging, setDragging] = useState(false);
    const startClientX = useRef(0);
    const baseOffset = useRef(0);

    /** Where the strip wants to sit so the active gap is under the center. */
    const restingOffset = viewportW / 2 - (gapCenters[pendingPosition] ?? 0);
    const liveOffset = dragging ? baseOffset.current + dragX : restingOffset;

    const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        // Only react to primary button / first touch.
        if (e.button !== undefined && e.button !== 0) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
        startClientX.current = e.clientX;
        baseOffset.current = restingOffset;
        setDragX(0);
    };

    const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!dragging) return;
        setDragX(e.clientX - startClientX.current);
    };

    const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!dragging) return;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        setDragging(false);
        // Snap to nearest gap based on what is now under the center line.
        const finalOffset = baseOffset.current + dragX;
        const targetCenter = viewportW / 2 - finalOffset;
        let nearest = 0;
        let best = Number.POSITIVE_INFINITY;
        gapCenters.forEach((cx, i) => {
            const d = Math.abs(cx - targetCenter);
            if (d < best) {
                best = d;
                nearest = i;
            }
        });
        setDragX(0);
        if (nearest !== pendingPosition) onPickPosition(nearest);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        if (e.key === "ArrowLeft" && pendingPosition > 0) {
            e.preventDefault();
            onPickPosition(pendingPosition - 1);
        } else if (e.key === "ArrowRight" && pendingPosition < gapCount - 1) {
            e.preventDefault();
            onPickPosition(pendingPosition + 1);
        } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onConfirm();
        }
    };

    return (
        <div
            style={{ width: "100%", position: "relative", userSelect: "none" }}
        >
            {/* Year-range labels */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0 24px 10px",
                    fontFamily: gameTheme.font.mono,
                    fontSize: 10,
                    color: gameTheme.color.mutedDim,
                    letterSpacing: "0.15em",
                }}
            >
                <span>◀ EARLIER</span>
                <span>DRAG TO PLACE</span>
                <span>LATER ▶</span>
            </div>

            {/* Strip viewport — fixed width, the track inside slides under it. */}
            {/** biome-ignore lint/a11y/useSemanticElements: composite drag region */}
            <div
                ref={viewportRef}
                role="slider"
                aria-label="Drag to choose a position on your timeline"
                aria-valuemin={0}
                aria-valuemax={Math.max(0, gapCount - 1)}
                aria-valuenow={pendingPosition}
                tabIndex={disabled ? -1 : 0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
                style={{
                    position: "relative",
                    height: STRIP_HEIGHT,
                    overflow: "hidden",
                    touchAction: "none",
                    cursor: dragging ? "grabbing" : disabled ? "default" : "grab",
                }}
            >
                {/* Center indicator line */}
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: 0,
                        bottom: 20,
                        width: 2,
                        marginLeft: -1,
                        background: `linear-gradient(180deg, transparent, ${gameTheme.color.accent} 15%, ${gameTheme.color.accent} 85%, transparent)`,
                        boxShadow: `0 0 14px ${gameTheme.color.accent}`,
                        zIndex: 1,
                        pointerEvents: "none",
                    }}
                />
                {/* Top pointer / arrow */}
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: -2,
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "8px solid transparent",
                        borderRight: "8px solid transparent",
                        borderTop: `10px solid ${gameTheme.color.accent}`,
                        filter: `drop-shadow(0 0 6px ${gameTheme.color.accent})`,
                        zIndex: 2,
                        pointerEvents: "none",
                    }}
                />

                {/* Sliding track */}
                <div
                    style={{
                        position: "absolute",
                        top: 20,
                        left: 0,
                        display: "flex",
                        alignItems: "center",
                        height: CARD_HEIGHT,
                        transform: `translateX(${liveOffset}px)`,
                        transition: dragging
                            ? "none"
                            : "transform .35s cubic-bezier(.3,1.1,.4,1)",
                        willChange: "transform",
                    }}
                >
                    <Gap
                        active={pendingPosition === 0}
                        onTap={() => !disabled && onPickPosition(0)}
                    />
                    {sorted.map((song, i) => (
                        <span
                            key={song.id}
                            style={{ display: "contents" }}
                        >
                            <div style={{ width: CARD_WIDTH, flexShrink: 0 }}>
                                <PlacedCard song={song} size="sm" />
                            </div>
                            <Gap
                                active={pendingPosition === i + 1}
                                onTap={() =>
                                    !disabled && onPickPosition(i + 1)
                                }
                            />
                        </span>
                    ))}
                </div>

                {/* Floating mystery card pinned at viewport center */}
                {mysteryCard && (
                    <div
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: -6,
                            // Translate handled inside the keyframe so we can
                            // also bob vertically without losing centering.
                            pointerEvents: "none",
                            zIndex: 3,
                            animation:
                                "gys-bounce-placeholder 1.4s ease-in-out infinite",
                            transform: "translateX(-50%)",
                        }}
                    >
                        {mysteryCard}
                    </div>
                )}
            </div>

            {/* DROP IT button */}
            <div
                style={{
                    padding: "14px 24px 0",
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onConfirm}
                    aria-label="Drop song on selected position"
                    style={{
                        background: gameTheme.color.accent,
                        color: gameTheme.color.ink,
                        fontFamily: gameTheme.font.display,
                        fontWeight: 900,
                        fontSize: 16,
                        letterSpacing: "0.2em",
                        padding: "14px 48px",
                        border: "none",
                        borderRadius: gameTheme.radius.md,
                        boxShadow: `0 5px 0 ${gameTheme.color.bg}, 0 5px 24px ${gameTheme.color.accent}aa`,
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.4 : 1,
                        transition: "transform .1s",
                    }}
                >
                    DROP IT ▼
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */

interface GapProps {
    active: boolean;
    onTap: () => void;
}

function Gap({ active, onTap }: GapProps) {
    const accent = gameTheme.color.accent;
    const wrap: CSSProperties = {
        width: GAP_WIDTH,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };
    const inner: CSSProperties = {
        width: GAP_WIDTH - 14,
        height: "85%",
        borderRadius: gameTheme.radius.md,
        border: `2px dashed ${active ? accent : "rgba(255,255,255,0.18)"}`,
        background: active ? gameTheme.color.accentSoft : "transparent",
        boxShadow: active
            ? `0 0 14px ${accent}66, inset 0 0 14px ${accent}33`
            : "none",
        transition: "all .2s",
    };
    return (
        // biome-ignore lint/a11y/useSemanticElements: drag region wraps these
        <div
            style={wrap}
            role="button"
            tabIndex={-1}
            aria-label="Place here"
            aria-pressed={active}
            onPointerDown={(e) => {
                // Don't initiate strip-drag from a tap-pick; let the click
                // through and stop the drag handler from grabbing this.
                e.stopPropagation();
            }}
            onClick={onTap}
        >
            <div style={inner} />
        </div>
    );
}

// re-export so PlayPage doesn't need to import from PlacedCard directly
export type { PlacedSong };
