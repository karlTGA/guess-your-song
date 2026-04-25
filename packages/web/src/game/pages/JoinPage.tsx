import { Alert, Button, Form, Input } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinSession } from "../../api";
import "../components/game.css";
import { gameTheme } from "../components/theme";

export default function JoinPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleJoin = async (values: { code: string; playerName: string }) => {
        setError(null);
        setLoading(true);
        try {
            const code = values.code.toUpperCase();
            await joinSession(code, values.playerName);
            localStorage.setItem("playerName", values.playerName);
            localStorage.setItem("gameCode", code);
            navigate(`/game/${code}/play`);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to join session",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: gameTheme.color.bg,
                color: gameTheme.color.inkInverse,
                fontFamily: gameTheme.font.body,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                gap: 32,
            }}
        >
            {/* Logo / title block */}
            <div style={{ textAlign: "center" }}>
                <div
                    style={{
                        fontFamily: gameTheme.font.display,
                        fontSize: 14,
                        letterSpacing: "0.3em",
                        color: gameTheme.color.accent,
                        marginBottom: 8,
                    }}
                >
                    SIDE A · TRACK 01
                </div>
                <h1
                    style={{
                        fontFamily: gameTheme.font.display,
                        fontSize: 36,
                        margin: 0,
                        letterSpacing: "0.05em",
                        textShadow: `0 0 24px ${gameTheme.color.accent}66`,
                    }}
                >
                    GUESS YOUR SONG
                </h1>
                <div
                    style={{
                        marginTop: 8,
                        color: gameTheme.color.muted,
                        fontSize: 13,
                        letterSpacing: "0.1em",
                    }}
                >
                    listen · place · score
                </div>
            </div>

            {/* Cassette-styled card holding the join form */}
            <div
                style={{
                    width: "100%",
                    maxWidth: 380,
                    background: gameTheme.color.bgElevated,
                    border: `2px solid ${gameTheme.color.accent}33`,
                    borderRadius: gameTheme.radius.lg,
                    padding: 24,
                    boxShadow: `0 0 40px ${gameTheme.color.accent}22`,
                }}
            >
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Form layout="vertical" onFinish={handleJoin}>
                    <Form.Item
                        label={
                            <span
                                style={{
                                    color: gameTheme.color.muted,
                                    fontFamily: gameTheme.font.display,
                                    fontSize: 11,
                                    letterSpacing: "0.15em",
                                }}
                            >
                                GAME CODE
                            </span>
                        }
                        name="code"
                        rules={[
                            { required: true, message: "Enter the game code" },
                        ]}
                    >
                        <Input
                            placeholder="6-CHAR CODE"
                            maxLength={6}
                            size="large"
                            style={{
                                textTransform: "uppercase",
                                letterSpacing: "0.2em",
                                fontFamily: gameTheme.font.display,
                                fontSize: 20,
                                textAlign: "center",
                            }}
                        />
                    </Form.Item>
                    <Form.Item
                        label={
                            <span
                                style={{
                                    color: gameTheme.color.muted,
                                    fontFamily: gameTheme.font.display,
                                    fontSize: 11,
                                    letterSpacing: "0.15em",
                                }}
                            >
                                YOUR NAME
                            </span>
                        }
                        name="playerName"
                        rules={[{ required: true, message: "Enter your name" }]}
                    >
                        <Input placeholder="Your name" size="large" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            size="large"
                            loading={loading}
                            style={{
                                background: gameTheme.color.accent,
                                color: gameTheme.color.ink,
                                borderColor: gameTheme.color.accent,
                                fontWeight: 700,
                                fontFamily: gameTheme.font.display,
                                letterSpacing: "0.15em",
                                height: 52,
                            }}
                        >
                            ▶ JOIN GAME
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </div>
    );
}
