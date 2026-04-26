import { Alert, Button } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGameState, placeSong, skipSong } from "../../api";
import BigCassette from "../components/BigCassette";
import { GridBackground } from "../components/arcade";
import PlacedCard, { type PlacedSong } from "../components/PlacedCard";
import RevealOverlay from "../components/RevealOverlay";
import { SFX } from "../components/sfx";
import TimelineStrip from "../components/TimelineStrip";
import { gameTheme } from "../components/theme";
import "../components/game.css";

interface GameState {
    status: string;
    currentRound?: {
        songId: string;
        audioFilename: string;
        thumbnailFilename?: string;
        startedAt: string;
    };
    player: {
        name: string;
        timeline: PlacedSong[];
        score: number;
    };
    totalRounds: number;
    currentRoundIndex: number;
}

interface PendingReveal {
    correct: boolean;
    song: PlacedSong;
}

/**
 * The active-round screen. Layout (top → bottom):
 *  - Animated retro grid floor + neon sun (GridBackground)
 *  - HUD: round pill (circle badge + ROUND label) + score chip + wrong indicator
 *  - "♪  NOW PLAYING  ♪" ticker
 *  - BigCassette (with the glowing PlayPulse + spinning reels)
 *  - "· MYSTERY TRACK ·" caption
 *  - Timecode line ("0:14 / 0:30" while playing, "TAP TO PLAY" while paused)
 *  - TargetDots row showing score progress out of totalRounds
 *  - Sliding TimelineStrip with the mystery card pinned at center
 *  - DROP IT button
 *  - RevealOverlay on placement (CORRECT/WRONG flip card + confetti on correct)
 *
 * Interactions all play synthesized SFX:
 *  - Play/pause cassette → SFX.click()
 *  - DROP IT → SFX.click(), then SFX.correct() or SFX.wrong() after submit
 *  - TimelineStrip drag-snap → SFX.snap() (handled inside TimelineStrip)
 *
 * Wrong placements briefly shake the whole screen (gys-shake keyframe);
 * the reveal then auto-dismisses after ~1.8s and we re-fetch game state.
 */
export default function PlayPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const playerName = localStorage.getItem("playerName") || "";

    const audioRef = useRef<HTMLAudioElement>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [pendingPosition, setPendingPosition] = useState<number>(0);
    const [reveal, setReveal] = useState<PendingReveal | null>(null);
    const [audioError, setAudioError] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [shake, setShake] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const loadState = useCallback(async () => {
        if (!code || !playerName) return;
        try {
            const state = await getGameState(code, playerName);
            setGameState(state);
            setAudioError(false);
            const len = state.player.timeline.length;
            setPendingPosition(Math.floor((len + 1) / 2));
            if (state.status === "finished") {
                navigate(`/game/${code}/results`);
            }
        } catch {
            // ignore — keep last known state
        }
    }, [code, playerName, navigate]);

    useEffect(() => {
        loadState();
    }, [loadState]);

    // Wire up <audio> element events.
    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onEnded = () => setPlaying(false);
        const onTime = () => setCurrentTime(el.currentTime);
        const onLoaded = () => setDuration(el.duration || 0);
        el.addEventListener("play", onPlay);
        el.addEventListener("pause", onPause);
        el.addEventListener("ended", onEnded);
        el.addEventListener("timeupdate", onTime);
        el.addEventListener("loadedmetadata", onLoaded);
        return () => {
            el.removeEventListener("play", onPlay);
            el.removeEventListener("pause", onPause);
            el.removeEventListener("ended", onEnded);
            el.removeEventListener("timeupdate", onTime);
            el.removeEventListener("loadedmetadata", onLoaded);
        };
    }, []);

    // Reset audio when the round's audio file changes.
    const audioFilename = gameState?.currentRound?.audioFilename;
    // biome-ignore lint/correctness/useExhaustiveDependencies: only reset on file change
    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;
        el.pause();
        el.currentTime = 0;
        setPlaying(false);
        setCurrentTime(0);
    }, [audioFilename]);

    const togglePlay = () => {
        SFX.click();
        const el = audioRef.current;
        if (!el) return;
        if (el.paused) {
            void el.play().catch(() => {
                /* autoplay blocked or src missing */
            });
        } else {
            el.pause();
        }
    };

    const handlePickPosition = (next: number) => {
        if (next !== pendingPosition) {
            SFX.snap();
            setPendingPosition(next);
        }
    };

    const handleConfirm = async () => {
        if (!code || !playerName || pendingPosition === null) return;
        SFX.click();
        setSubmitting(true);
        try {
            const result = await placeSong(code, playerName, pendingPosition);
            audioRef.current?.pause();
            if (result.status === "finished") {
                if (result.correct) SFX.win();
                else SFX.gameover();
                navigate(`/game/${code}/results`);
                return;
            }
            if (result.correct) {
                SFX.correct();
            } else {
                SFX.wrong();
                setShake(true);
                setTimeout(() => setShake(false), 500);
            }
            setReveal({ correct: result.correct, song: result.song });
        } catch {
            // ignore
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevealDismiss = async () => {
        SFX.click();
        setReveal(null);
        await loadState();
    };

    const handleSkip = async () => {
        if (!code || !playerName) return;
        SFX.click();
        try {
            const result = await skipSong(code, playerName);
            if (result.status === "finished") {
                navigate(`/game/${code}/results`);
                return;
            }
            setReveal(null);
            setAudioError(false);
            await loadState();
        } catch {
            // ignore
        }
    };

    if (!gameState) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: gameTheme.color.bgGradient,
                    color: gameTheme.color.inkInverse,
                    fontFamily: gameTheme.font.display,
                    letterSpacing: "0.2em",
                }}
            >
                LOADING…
            </div>
        );
    }

    const { player, totalRounds, currentRoundIndex, currentRound } = gameState;
    const hasAudio = !!currentRound && currentRound.audioFilename !== "";
    const audioSrc = hasAudio
        ? `/audio/${currentRound.audioFilename}`
        : undefined;

    // The mystery card — keeping current "???" title/artist styling per the
    // user's preference; the card itself adds the year-hidden ???? badge.
    const mysterySong: PlacedSong | null = currentRound
        ? {
              id: currentRound.songId,
              title: "???",
              artist: "???",
              year: 0,
              thumbnailFilename: currentRound.thumbnailFilename,
          }
        : null;

    return (
        <div
            style={{
                minHeight: "100vh",
                position: "relative",
                background: gameTheme.color.bgGradient,
                color: gameTheme.color.inkInverse,
                fontFamily: gameTheme.font.body,
                display: "flex",
                flexDirection: "column",
                animation: shake ? "gys-shake .5s" : "none",
                overflow: "hidden",
            }}
        >
            {/* Animated retro grid floor */}
            <GridBackground color={gameTheme.color.accent} opacity={0.18} />

            {/* HUD — neon round pill on the left, score chip + wrong indicator on the right */}
            <header
                style={{
                    position: "relative",
                    zIndex: 5,
                    padding: "16px 18px 6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <RoundPill
                    roundNum={currentRoundIndex + 1}
                    accent={gameTheme.color.neonCyan}
                />
                <ScoreCluster
                    score={player.score}
                    wrong={Math.max(0, currentRoundIndex - player.score)}
                />
            </header>

            {/* Cassette + audio + framing copy */}
            <main
                style={{
                    position: "relative",
                    zIndex: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "10px 16px 14px",
                }}
            >
                {hasAudio && audioSrc && !audioError && (
                    <>
                        {/* biome-ignore lint/a11y/useMediaCaption: song-guess game, no captions */}
                        <audio
                            ref={audioRef}
                            src={audioSrc}
                            preload="auto"
                            className="gys-hidden-audio"
                            onError={() => setAudioError(true)}
                        />

                        {/* "♪  NOW PLAYING  ♪" ticker */}
                        <div
                            style={{
                                fontFamily: gameTheme.font.mono,
                                fontSize: 10,
                                color: "rgba(255,255,255,0.5)",
                                letterSpacing: "0.25em",
                                marginBottom: 12,
                            }}
                        >
                            ♪ NOW PLAYING ♪
                        </div>

                        <BigCassette
                            playing={playing}
                            onToggle={togglePlay}
                            currentRound={currentRoundIndex + 1}
                            disabled={submitting}
                        />

                        {/* "· MYSTERY TRACK ·" caption */}
                        <div
                            style={{
                                marginTop: 12,
                                fontFamily: gameTheme.font.display,
                                fontWeight: 900,
                                fontSize: 13,
                                color: gameTheme.color.inkInverse,
                                letterSpacing: "0.15em",
                            }}
                        >
                            · MYSTERY TRACK ·
                        </div>

                        {/* Timecode strip — pulses with currentTime while playing */}
                        <div
                            style={{
                                fontFamily: gameTheme.font.mono,
                                fontSize: 10,
                                color: gameTheme.color.accent,
                                letterSpacing: "0.2em",
                                marginTop: 4,
                                textShadow: `0 0 6px ${gameTheme.color.accent}`,
                            }}
                        >
                            {playing
                                ? `${formatTime(currentTime)} / ${formatTime(duration || 30)}`
                                : "TAP TO PLAY"}
                        </div>
                    </>
                )}

                {(!hasAudio || audioError) && (
                    <Alert
                        type="warning"
                        message="Song audio is unavailable"
                        description="The audio file for this song is missing. You can skip to the next song."
                        showIcon
                        style={{ maxWidth: 400 }}
                        action={
                            <Button
                                size="small"
                                onClick={handleSkip}
                                aria-label="Skip Song"
                            >
                                Skip Song
                            </Button>
                        }
                    />
                )}
            </main>

            {/* TargetDots — score progress out of totalRounds */}
            <div style={{ position: "relative", zIndex: 2 }}>
                <TargetDots
                    score={player.score}
                    target={totalRounds}
                    accent={gameTheme.color.accent}
                />
            </div>

            {/* Timeline */}
            <footer
                style={{
                    position: "relative",
                    zIndex: 2,
                    flex: 1,
                    padding: "8px 0 24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    background: `linear-gradient(180deg, transparent, ${gameTheme.color.bg})`,
                }}
            >
                <TimelineStrip
                    timeline={player.timeline}
                    pendingPosition={pendingPosition}
                    onPickPosition={handlePickPosition}
                    onConfirm={handleConfirm}
                    disabled={submitting || !hasAudio || !!reveal}
                    mysteryCard={
                        mysterySong ? (
                            <div style={{ width: 80 }}>
                                <PlacedCard
                                    song={mysterySong}
                                    size="sm"
                                    isMystery
                                />
                            </div>
                        ) : null
                    }
                />
            </footer>

            {reveal && (
                <RevealOverlay
                    correct={reveal.correct}
                    song={reveal.song}
                    onDismiss={handleRevealDismiss}
                />
            )}
        </div>
    );
}

/* --------------------------------------------------------------------- */

/** "1:23" formatter for the timecode strip; clamps NaN/Infinity to "0:00". */
function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

/* --------------------------------------------------------------------- */

interface RoundPillProps {
    roundNum: number;
    accent: string;
}

/**
 * Left-side HUD pill: a circular accent badge with the round number,
 * inside a pill outlined in neon with a soft outer glow.
 */
function RoundPill({ roundNum, accent }: RoundPillProps) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px 6px 6px",
                background: "rgba(255,255,255,0.06)",
                border: `1.5px solid ${accent}`,
                borderRadius: 999,
                boxShadow: `0 0 12px ${accent}66`,
            }}
        >
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: gameTheme.font.display,
                    fontWeight: 900,
                    fontSize: 13,
                    color: gameTheme.color.bg,
                }}
            >
                {roundNum}
            </div>
            <span
                style={{
                    fontFamily: gameTheme.font.mono,
                    fontSize: 10,
                    color: gameTheme.color.inkInverse,
                    letterSpacing: "0.15em",
                }}
            >
                ROUND
            </span>
        </div>
    );
}

/* --------------------------------------------------------------------- */

interface ScoreClusterProps {
    score: number;
    wrong: number;
}

/**
 * Right-side HUD cluster: SCORE label + score chip (lime when score>0,
 * white-grey when 0), plus a "−N" wrong indicator chip when wrong>0.
 */
function ScoreCluster({ score, wrong }: ScoreClusterProps) {
    return (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
                style={{
                    fontFamily: gameTheme.font.mono,
                    fontSize: 10,
                    color: "rgba(255,255,255,0.6)",
                    letterSpacing: "0.15em",
                }}
            >
                SCORE
            </div>
            <div
                style={{
                    padding: "4px 12px",
                    background:
                        score > 0
                            ? gameTheme.color.accent
                            : "rgba(255,255,255,0.08)",
                    color:
                        score > 0
                            ? gameTheme.color.bg
                            : gameTheme.color.inkInverse,
                    fontFamily: gameTheme.font.display,
                    fontWeight: 900,
                    fontSize: 16,
                    borderRadius: 6,
                    boxShadow:
                        score > 0
                            ? `0 0 12px ${gameTheme.color.accent}88`
                            : "none",
                    minWidth: 32,
                    textAlign: "center",
                    transition: "background .25s, box-shadow .25s",
                }}
            >
                {score}
            </div>
            {wrong > 0 && (
                <div
                    style={{
                        padding: "4px 10px",
                        background: "rgba(255,46,147,0.15)",
                        color: gameTheme.color.error,
                        fontFamily: gameTheme.font.display,
                        fontWeight: 900,
                        fontSize: 13,
                        borderRadius: 6,
                        border: `1px solid ${gameTheme.color.error}`,
                    }}
                >
                    −{wrong}
                </div>
            )}
        </div>
    );
}

/* --------------------------------------------------------------------- */

interface TargetDotsProps {
    score: number;
    target: number;
    accent: string;
}

/**
 * Small row of dots showing progress toward the target. Filled dots glow.
 * Caps display at 16 dots so very long playlists don't blow out the row.
 */
function TargetDots({ score, target, accent }: TargetDotsProps) {
    const visible = Math.min(target, 16);
    return (
        <div
            style={{
                display: "flex",
                gap: 5,
                justifyContent: "center",
                padding: "0 0 10px",
            }}
        >
            {Array.from({ length: visible }).map((_, i) => {
                const filled = i < score;
                return (
                    <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: positional dots
                        key={i}
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: filled
                                ? accent
                                : "rgba(255,255,255,0.15)",
                            boxShadow: filled ? `0 0 8px ${accent}` : "none",
                            transition: "all .3s",
                        }}
                    />
                );
            })}
        </div>
    );
}
