import { Button } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getResults } from "../../api";
import "../components/game.css";
import PlacedCard, { type PlacedSong } from "../components/PlacedCard";
import { gameTheme } from "../components/theme";

interface PlayerResult {
    name: string;
    score: number;
    timeline: PlacedSong[];
}

export default function ResultsPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const [players, setPlayers] = useState<PlayerResult[]>([]);

    useEffect(() => {
        if (!code) return;
        getResults(code).then((data) => {
            setPlayers([...data.players].sort((a, b) => b.score - a.score));
        });
    }, [code]);

    return (
        <div
            style={{
                minHeight: "100vh",
                background: gameTheme.color.bg,
                color: gameTheme.color.inkInverse,
                fontFamily: gameTheme.font.body,
                padding: "32px 16px 48px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 32,
            }}
        >
            <div style={{ textAlign: "center" }}>
                <div
                    style={{
                        fontFamily: gameTheme.font.display,
                        fontSize: 12,
                        letterSpacing: "0.3em",
                        color: gameTheme.color.accent,
                        marginBottom: 4,
                    }}
                >
                    SIDE B · END
                </div>
                <h1
                    style={{
                        fontFamily: gameTheme.font.display,
                        fontSize: 28,
                        margin: 0,
                        letterSpacing: "0.05em",
                    }}
                >
                    🏆 GAME RESULTS
                </h1>
            </div>

            <div
                style={{
                    width: "100%",
                    maxWidth: 720,
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                }}
            >
                {players.map((player, index) => (
                    <PlayerScoreboard
                        key={player.name}
                        player={player}
                        rank={index + 1}
                    />
                ))}
            </div>

            <Button
                type="primary"
                size="large"
                onClick={() => navigate("/")}
                style={{
                    background: gameTheme.color.accent,
                    color: gameTheme.color.ink,
                    borderColor: gameTheme.color.accent,
                    fontWeight: 700,
                    fontFamily: gameTheme.font.display,
                    letterSpacing: "0.15em",
                    height: 52,
                    minWidth: 240,
                }}
            >
                ▶ NEW GAME
            </Button>
        </div>
    );
}

interface PlayerScoreboardProps {
    player: PlayerResult;
    rank: number;
}

function PlayerScoreboard({ player, rank }: PlayerScoreboardProps) {
    const isWinner = rank === 1;
    const sorted = [...player.timeline].sort((a, b) => a.year - b.year);

    return (
        <div
            style={{
                background: gameTheme.color.bgElevated,
                borderRadius: gameTheme.radius.lg,
                border: `2px solid ${
                    isWinner ? gameTheme.color.accent : "transparent"
                }`,
                boxShadow: isWinner
                    ? `0 0 32px ${gameTheme.color.accent}44`
                    : gameTheme.shadow.card,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        fontFamily: gameTheme.font.display,
                        fontSize: 18,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                    }}
                >
                    <span
                        style={{
                            color: gameTheme.color.muted,
                            marginRight: 12,
                        }}
                    >
                        #{rank}
                    </span>
                    {isWinner && "🏆 "}
                    {player.name}
                </div>
                <div
                    style={{
                        background: gameTheme.color.accentSoft,
                        color: gameTheme.color.accent,
                        padding: "6px 14px",
                        borderRadius: gameTheme.radius.pill,
                        fontFamily: gameTheme.font.display,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                    }}
                >
                    SCORE {player.score}
                </div>
            </div>

            {sorted.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        overflowX: "auto",
                        padding: "4px 0",
                    }}
                >
                    {sorted.map((song) => (
                        <PlacedCard key={song._id} song={song} size="sm" />
                    ))}
                </div>
            )}
        </div>
    );
}
