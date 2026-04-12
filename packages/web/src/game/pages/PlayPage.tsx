import { Alert, Button, Card, Space, Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGameState, placeSong, skipSong } from "../../api";

const { Title, Text } = Typography;

interface SongInfo {
    _id: string;
    title: string;
    artist: string;
    year: number;
    thumbnailFilename?: string;
}

interface GameState {
    status: string;
    currentRound?: {
        songId: string;
        audioFilename: string;
        thumbnailFilename?: string;
        startedAt: string;
    };
    player: { name: string; timeline: SongInfo[]; score: number };
    totalRounds: number;
    currentRoundIndex: number;
}

interface PlacementResult {
    correct: boolean;
    song: SongInfo;
}

export default function PlayPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const playerName = localStorage.getItem("playerName") || "";
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [placementResult, setPlacementResult] =
        useState<PlacementResult | null>(null);
    const [audioError, setAudioError] = useState(false);

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
            // ignore
        }
    }, [code, playerName, navigate]);

    useEffect(() => {
        loadState();
    }, [loadState]);

    const handlePlace = async (position: number) => {
        if (!code || !playerName) return;
        try {
            const result = await placeSong(code, playerName, position);
            if (result.status === "finished") {
                navigate(`/game/${code}/results`);
                return;
            }
            setPlacementResult({ correct: result.correct, song: result.song });
            await loadState();
        } catch {
            // ignore
        }
    };

    const handleSkip = async () => {
        if (!code || !playerName) return;
        try {
            const result = await skipSong(code, playerName);
            if (result.status === "finished") {
                navigate(`/game/${code}/results`);
                return;
            }
            setPlacementResult(null);
            setAudioError(false);
            await loadState();
        } catch {
            // ignore
        }
    };

    if (!gameState) {
        return (
            <div style={{ textAlign: "center", padding: 32 }}>Loading...</div>
        );
    }

    const { player, totalRounds, currentRoundIndex, currentRound } = gameState;
    const hasAudio = currentRound && currentRound.audioFilename !== "";
    const audioSrc = hasAudio
        ? `/audio/${currentRound.audioFilename}`
        : undefined;

    return (
        <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Title level={4} style={{ margin: 0 }}>
                        Round {currentRoundIndex + 1} of {totalRounds}
                    </Title>
                    <Tag color="blue">Score: {player.score}</Tag>
                </div>

                {audioSrc && !audioError && (
                    <Card size="small">
                        <Text strong>
                            Listen and place this song on your timeline:
                        </Text>
                        {/* biome-ignore lint/a11y/useMediaCaption: song guessing game - no captions for music */}
                        <audio
                            controls
                            src={audioSrc}
                            style={{ width: "100%", marginTop: 8 }}
                            onError={() => setAudioError(true)}
                        />
                    </Card>
                )}

                {(!hasAudio || audioError) && (
                    <Alert
                        type="warning"
                        message="Song audio is unavailable"
                        description="The audio file for this song is missing. You can skip to the next song."
                        showIcon
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

                {placementResult && (
                    <Alert
                        type={placementResult.correct ? "success" : "error"}
                        message={
                            placementResult.correct ? "Correct!" : "Incorrect!"
                        }
                        description={`${placementResult.song.title} by ${placementResult.song.artist} (${placementResult.song.year})`}
                        showIcon
                    />
                )}

                <Card title="Your Timeline">
                    {player.timeline.length === 0 && !placementResult ? (
                        <div>
                            <Text type="secondary">
                                Your timeline is empty. Place your first song!
                            </Text>
                            <div style={{ marginTop: 8 }}>
                                <Button
                                    onClick={() => handlePlace(0)}
                                    aria-label="Place Here"
                                >
                                    Place Here
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <Button
                                size="small"
                                onClick={() => handlePlace(0)}
                                style={{ marginBottom: 4 }}
                                aria-label="Place Here"
                            >
                                Place Here
                            </Button>
                            {player.timeline.map((song, i) => (
                                <div key={song._id}>
                                    <Card
                                        size="small"
                                        style={{ marginBottom: 4 }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            {song.thumbnailFilename && (
                                                <img
                                                    src={`/thumbnails/${song.thumbnailFilename}`}
                                                    alt={`${song.title} thumbnail`}
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        objectFit: "cover",
                                                        borderRadius: 4,
                                                    }}
                                                />
                                            )}
                                            <span>
                                                <Text strong>{song.title}</Text>{" "}
                                                — {song.artist} ({song.year})
                                            </span>
                                        </div>
                                    </Card>
                                    <Button
                                        size="small"
                                        onClick={() => handlePlace(i + 1)}
                                        style={{ marginBottom: 4 }}
                                        aria-label="Place Here"
                                    >
                                        Place Here
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </Space>
        </div>
    );
}
