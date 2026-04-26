import { Button } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getResults } from "../../api";
import { Confetti, GridBackground, NeonText } from "../components/arcade";
import "../components/game.css";
import PlacedCard, { type PlacedSong } from "../components/PlacedCard";
import { gameTheme } from "../components/theme";

interface PlayerResult {
    name: string;
    score: number;
    timeline: PlacedSong[];
}

/**
 * End-of-game screen. Shows the player's verdict (WINNER/BUSTED) with stat
 * boxes, plus the leaderboard of all players' timelines.
 *
 * "Won" is defined as: the local player ranks #1 (or ties for #1).
 */
export default function ResultsPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const [players, setPlayers] = useState<PlayerResult[]>([]);
    const myName = localStorage.getItem("playerName") || "";

    useEffect(() => {
        if (!code) return;
        getResults(code).then((data) => {
            setPlayers([...data.players].sort((a, b) => b.score - a.score));
        });
    }, [code]);

    const me = useMemo(
        () => players.find((p) => p.name === myName),
        [players, myName],
    );
    const topScore = players[0]?.score ?? 0;
    const won = !!me && me.score === topScore && players.length > 0;
    const accent = won ? gameTheme.color.accent : gameTheme.color.error;

    return (
        <div
            style={{
                minHeight: "100vh",
                position: "relative",
                background: won
                    ? `linear-gradient(180deg, #0a3d1e 0%, ${gameTheme.color.bg} 100%)`
                    : `linear-gradient(180deg, #3d0a1e 0%, ${gameTheme.color.bg} 100%)`,
                color: gameTheme.color.inkInverse,
                fontFamily: gameTheme.font.body,
                padding: "48px 16px 48px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 28,
                overflow: "hidden",
            }}
        >
            <GridBackground color={accent} opacity={0.25} />
            {won && <Confetti active />}

            <div
                style={{
                    position: "relative",
                    zIndex: 2,
                    textAlign: "center",
                }}
            >
                <div
                    style={{
                        fontFamily: gameTheme.font.mono,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.6)",
                        letterSpacing: "0.3em",
                        marginBottom: 14,
                    }}
                >
                    {won ? "★ YOU WIN ★" : "GAME OVER"}
                </div>
                <NeonText color={accent} size={won ? 54 : 48} flicker>
                    {won ? "WINNER!" : "BUSTED"}
                </NeonText>
            </div>

            {me && (
                <div
                    style={{
                        position: "relative",
                        zIndex: 2,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                        width: "100%",
                        maxWidth: 320,
                    }}
                >
                    <StatBox
                        label="SCORE"
                        value={me.score}
                        color={gameTheme.color.accent}
                    />
                    <StatBox
                        label="PLACED"
                        value={me.timeline.length}
                        color={gameTheme.color.neonCyan}
                    />
                    <StatBox
                        label="RANK"
                        value={`#${players.findIndex((p) => p.name === myName) + 1}`}
                        color={gameTheme.color.neonYellow}
                    />
                    <StatBox
                        label="PLAYERS"
                        value={players.length}
                        color={gameTheme.color.neonPink}
                    />
                </div>
            )}

            <div
                style={{
                    position: "relative",
                    zIndex: 2,
                    width: "100%",
                    maxWidth: 720,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                }}
            >
                {players.map((player, index) => (
                    <PlayerScoreboard
                        key={player.name}
                        player={player}
                        rank={index + 1}
                        isMe={player.name === myName}
                    />
                ))}
            </div>

            <Button
                type="primary"
                size="large"
                onClick={() => navigate("/")}
                style={{
                    background: accent,
                    color: gameTheme.color.ink,
                    borderColor: accent,
                    fontWeight: 900,
                    fontFamily: gameTheme.font.display,
                    letterSpacing: "0.18em",
                    height: 56,
                    minWidth: 240,
                    boxShadow: `0 6px 0 ${gameTheme.color.bg}, 0 6px 24px ${accent}88`,
                    position: "relative",
                    zIndex: 2,
                }}
            >
                ▶ PLAY AGAIN
            </Button>
        </div>
    );
}

function StatBox({
    label,
    value,
    color,
}: {
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <div
            style={{
                padding: "14px 10px",
                background: "rgba(255,255,255,0.04)",
                border: `1.5px solid ${color}66`,
                borderRadius: gameTheme.radius.md,
                textAlign: "center",
            }}
        >
            <div
                style={{
                    fontFamily: gameTheme.font.mono,
                    fontSize: 9,
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.2em",
                    marginBottom: 4,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontFamily: gameTheme.font.display,
                    fontWeight: 900,
                    fontSize: 22,
                    color,
                    textShadow: `0 0 10px ${color}66`,
                }}
            >
                {value}
            </div>
        </div>
    );
}

function PlayerScoreboard({
    player,
    rank,
    isMe,
}: {
    player: PlayerResult;
    rank: number;
    isMe: boolean;
}) {
    const isWinner = rank === 1;
    const sorted = [...player.timeline].sort((a, b) => a.year - b.year);

    return (
        <div
            style={{
                background: "rgba(20,26,58,0.85)",
                borderRadius: gameTheme.radius.lg,
                border: `2px solid ${isWinner ? gameTheme.color.accent : isMe ? gameTheme.color.neonCyan : "transparent"}`,
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
                    {isMe && (
                        <span
                            style={{
                                marginLeft: 8,
                                fontSize: 11,
                                color: gameTheme.color.neonCyan,
                                letterSpacing: "0.15em",
                            }}
                        >
                            · YOU
                        </span>
                    )}
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
                        <PlacedCard
                            key={song._id ?? song.id}
                            song={song}
                            size="sm"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
