import { Alert, Button } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGameState, placeSong, skipSong } from "../../api";
import BigCassette from "../components/BigCassette";
import PlacedCard, { type PlacedSong } from "../components/PlacedCard";
import RevealOverlay from "../components/RevealOverlay";
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
 *  - HUD: round counter + score pill
 *  - BigCassette + "TAP TO PLAY · DRAG TO PLACE" hint
 *  - Sliding TimelineStrip with the mystery card pinned at the center
 *  - DROP IT button to commit
 *  - RevealOverlay flashes after each placement (CORRECT/WRONG flip card)
 *
 * Wrong placements briefly shake the whole screen; the reveal then auto-
 * dismisses after ~1.8s and we re-fetch game state.
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

    const loadState = useCallback(async () => {
        if (!code || !playerName) return;
        try {
            const state = await getGameState(code, playerName);
            setGameState(state);
            setAudioError(false);
            // Reset pending pick to the middle of the new timeline.
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
        el.addEventListener("play", onPlay);
        el.addEventListener("pause", onPause);
        el.addEventListener("ended", onEnded);
        return () => {
            el.removeEventListener("play", onPlay);
            el.removeEventListener("pause", onPause);
            el.removeEventListener("ended", onEnded);
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
    }, [audioFilename]);

    const togglePlay = () => {
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

    const handleConfirm = async () => {
        if (!code || !playerName || pendingPosition === null) return;
        setSubmitting(true);
        try {
            const result = await placeSong(code, playerName, pendingPosition);
            audioRef.current?.pause();
            if (result.status === "finished") {
                navigate(`/game/${code}/results`);
                return;
            }
            if (!result.correct) {
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
        setReveal(null);
        await loadState();
    };

    const handleSkip = async () => {
        if (!code || !playerName) return;
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

    // The mystery card hovers above the active gap. Year is hidden — that's
    // the whole point of the game.
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
                background: gameTheme.color.bgGradient,
                color: gameTheme.color.inkInverse,
                fontFamily: gameTheme.font.body,
                display: "flex",
                flexDirection: "column",
                animation: shake ? "gys-shake .5s" : "none",
            }}
        >
            {/* HUD */}
            <header
                style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontFamily: gameTheme.font.display,
                    fontSize: 12,
                    letterSpacing: "0.15em",
                }}
            >
                <span>
                    ROUND {currentRoundIndex + 1} / {totalRounds}
                </span>
                <span
                    style={{
                        background: gameTheme.color.accentSoft,
                        color: gameTheme.color.accent,
                        padding: "4px 12px",
                        borderRadius: gameTheme.radius.pill,
                        fontWeight: 700,
                        boxShadow: `0 0 12px ${gameTheme.color.accent}55`,
                    }}
                >
                    SCORE {player.score}
                </span>
            </header>

            {/* Cassette + audio */}
            <main
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 18,
                    padding: "8px 16px 16px",
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
                        <BigCassette
                            playing={playing}
                            onToggle={togglePlay}
                            currentRound={currentRoundIndex + 1}
                            disabled={submitting}
                        />
                        <div
                            style={{
                                fontFamily: gameTheme.font.mono,
                                fontSize: 11,
                                letterSpacing: "0.18em",
                                color: gameTheme.color.muted,
                            }}
                        >
                            TAP TO PLAY · LISTEN · DRAG TO PLACE
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

            {/* Timeline */}
            <footer
                style={{
                    flex: 1,
                    padding: "12px 0 24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    background: `linear-gradient(180deg, transparent, ${gameTheme.color.bg})`,
                }}
            >
                <TimelineStrip
                    timeline={player.timeline}
                    pendingPosition={pendingPosition}
                    onPickPosition={setPendingPosition}
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
