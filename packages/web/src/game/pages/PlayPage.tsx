import { Alert, Button } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGameState, placeSong, skipSong } from "../../api";
import BigCassette from "../components/BigCassette";
import type { PlacedSong } from "../components/PlacedCard";
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

export default function PlayPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const playerName = localStorage.getItem("playerName") || "";

    const audioRef = useRef<HTMLAudioElement>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [pendingPosition, setPendingPosition] = useState<number | null>(null);
    const [reveal, setReveal] = useState<PendingReveal | null>(null);
    const [audioError, setAudioError] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [playing, setPlaying] = useState(false);

    const loadState = useCallback(async () => {
        if (!code || !playerName) return;
        try {
            const state = await getGameState(code, playerName);
            setGameState(state);
            setAudioError(false);
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

    // Reset audio when round changes.
    const audioFilename = gameState?.currentRound?.audioFilename;
    // biome-ignore lint/correctness/useExhaustiveDependencies: we only want to reset when the audio file changes, not on every round change
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
            // Pause audio on submit so the reveal can speak.
            audioRef.current?.pause();
            if (result.status === "finished") {
                navigate(`/game/${code}/results`);
                return;
            }
            setReveal({ correct: result.correct, song: result.song });
            setPendingPosition(null);
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
            setPendingPosition(null);
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
                    background: gameTheme.color.bg,
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

    return (
        <div
            style={{
                minHeight: "100vh",
                background: gameTheme.color.bg,
                color: gameTheme.color.inkInverse,
                fontFamily: gameTheme.font.body,
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Top bar: round + score */}
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
                    }}
                >
                    SCORE {player.score}
                </span>
            </header>

            {/* Cassette + audio */}
            <main
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 24,
                    padding: 16,
                }}
            >
                {hasAudio && audioSrc && !audioError && (
                    <>
                        {/* biome-ignore lint/a11y/useMediaCaption: song guessing game - no captions for music */}
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
                                fontFamily: gameTheme.font.display,
                                fontSize: 11,
                                letterSpacing: "0.15em",
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

            {/* Timeline strip */}
            <footer
                style={{
                    padding: "12px 8px 24px",
                    background: `linear-gradient(180deg, transparent, ${gameTheme.color.bg})`,
                }}
            >
                <TimelineStrip
                    timeline={player.timeline}
                    pendingPosition={pendingPosition}
                    onPickPosition={setPendingPosition}
                    onConfirm={handleConfirm}
                    onCancel={() => setPendingPosition(null)}
                    disabled={submitting || !hasAudio}
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
