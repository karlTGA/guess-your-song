import { Alert } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinSession } from "../../api";
import { Confetti, GridBackground, NeonText } from "../components/arcade";
import "../components/game.css";
import { gameTheme } from "../components/theme";

/**
 * Splash + join form for the player flow. Replaces the old Ant-Design-only
 * JoinPage with the neon arcade direction from the design canvas:
 *
 *  - Animated grid floor + neon-flicker wordmark
 *  - "GUESS YOUR SONG" title in two neon colors
 *  - Tagline + 6-char game code + name inputs styled to match
 *  - Big arcade-style PLAY button with a chunky drop-shadow
 *
 * The form layout mirrors the old JoinPage's contract: a `code` and
 * `playerName` field, and a successful join sets localStorage + navigates
 * to /game/:code/play. Tests for JoinPage need to be updated to reach
 * inputs by their new accessible names rather than Ant Design's Form.
 */
export default function StartScreen() {
    const navigate = useNavigate();
    const [code, setCode] = useState("");
    const [playerName, setPlayerName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [celebrate, setCelebrate] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCode = code.trim().toUpperCase();
        const cleanName = playerName.trim();
        if (cleanCode.length !== 6 || !cleanName) {
            setError("Enter a 6-character game code and your name.");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await joinSession(cleanCode, cleanName);
            localStorage.setItem("playerName", cleanName);
            localStorage.setItem("gameCode", cleanCode);
            setCelebrate(true);
            // Tiny delay so the confetti is visible before nav.
            setTimeout(() => navigate(`/game/${cleanCode}/play`), 350);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to join session",
            );
            setLoading(false);
        }
    };

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
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 24px 40px",
                overflow: "hidden",
            }}
        >
            <GridBackground color={gameTheme.color.accent} opacity={0.22} />
            {celebrate && <Confetti active />}

            <div
                style={{
                    position: "relative",
                    zIndex: 2,
                    width: "100%",
                    maxWidth: 420,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 28,
                }}
            >
                {/* Wordmark */}
                <div style={{ textAlign: "center" }}>
                    <div
                        style={{
                            fontFamily: gameTheme.font.display,
                            fontWeight: 900,
                            fontSize: 14,
                            color: gameTheme.color.neonYellow,
                            letterSpacing: "0.4em",
                            textShadow: `0 0 10px ${gameTheme.color.neonYellow}`,
                            marginBottom: 14,
                        }}
                    >
                        ★ ARCADE ★
                    </div>
                    <NeonText
                        color={gameTheme.color.neonPink}
                        size={48}
                        flicker
                    >
                        GUESS
                    </NeonText>
                    <div style={{ height: 6 }} />
                    <NeonText color={gameTheme.color.neonCyan} size={48}>
                        YOUR SONG
                    </NeonText>
                    <div
                        style={{
                            marginTop: 18,
                            fontFamily: gameTheme.font.mono,
                            color: "rgba(255,255,255,0.7)",
                            fontSize: 13,
                            letterSpacing: "0.1em",
                            lineHeight: 1.6,
                        }}
                    >
                        LISTEN. PLACE ON THE TIMELINE.
                        <br />
                        SCORE TO WIN.
                    </div>
                </div>

                {/* Form panel */}
                <form
                    onSubmit={submit}
                    style={{
                        width: "100%",
                        background: "rgba(10,14,39,0.55)",
                        border: `2px solid ${gameTheme.color.accent}33`,
                        borderRadius: gameTheme.radius.lg,
                        padding: 22,
                        boxShadow: `0 0 40px ${gameTheme.color.accent}22, inset 0 0 0 1px rgba(255,255,255,0.04)`,
                        backdropFilter: "blur(6px)",
                    }}
                >
                    {error && (
                        <Alert
                            message={error}
                            type="error"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <FieldLabel htmlFor="gys-code">GAME CODE</FieldLabel>
                    <input
                        id="gys-code"
                        name="code"
                        autoComplete="off"
                        maxLength={6}
                        value={code}
                        onChange={(e) =>
                            setCode(e.target.value.toUpperCase())
                        }
                        placeholder="6-CHAR CODE"
                        style={{
                            ...inputStyle,
                            textAlign: "center",
                            fontFamily: gameTheme.font.display,
                            fontSize: 22,
                            letterSpacing: "0.3em",
                        }}
                    />

                    <div style={{ height: 14 }} />

                    <FieldLabel htmlFor="gys-name">YOUR NAME</FieldLabel>
                    <input
                        id="gys-name"
                        name="playerName"
                        autoComplete="off"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Your name"
                        style={inputStyle}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: 22,
                            width: "100%",
                            background: `linear-gradient(135deg, ${gameTheme.color.accent}, ${gameTheme.color.neonCyan})`,
                            color: gameTheme.color.ink,
                            fontFamily: gameTheme.font.display,
                            fontWeight: 900,
                            fontSize: 20,
                            letterSpacing: "0.18em",
                            padding: "18px 32px",
                            border: "none",
                            borderRadius: gameTheme.radius.md,
                            boxShadow: `0 0 0 3px ${gameTheme.color.accent}, 0 8px 0 ${gameTheme.color.bg}, 0 8px 30px ${gameTheme.color.accent}88`,
                            cursor: loading ? "wait" : "pointer",
                            opacity: loading ? 0.7 : 1,
                            transition: "transform .1s",
                        }}
                    >
                        ▶ {loading ? "JOINING…" : "PLAY"}
                    </button>
                </form>

                {/* High-score-style ticker stripe */}
                <div
                    style={{
                        width: "100%",
                        borderTop: `1px dashed ${gameTheme.color.accent}66`,
                        paddingTop: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: gameTheme.font.mono,
                        fontSize: 10,
                        color: "rgba(255,255,255,0.45)",
                        letterSpacing: "0.18em",
                    }}
                >
                    <span>SIDE A · TRACK 01</span>
                    <span>INSERT COIN</span>
                </div>
            </div>
        </div>
    );
}

function FieldLabel({
    children,
    htmlFor,
}: {
    children: React.ReactNode;
    htmlFor: string;
}) {
    return (
        <label
            htmlFor={htmlFor}
            style={{
                display: "block",
                marginBottom: 6,
                fontFamily: gameTheme.font.mono,
                fontSize: 11,
                color: gameTheme.color.muted,
                letterSpacing: "0.18em",
            }}
        >
            {children}
        </label>
    );
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(255,255,255,0.18)",
    borderRadius: 8,
    padding: "12px 14px",
    color: "#fff",
    fontFamily: "inherit",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
};
