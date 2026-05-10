import { Alert } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGameSession, getGamePlaylists } from "../../api";
import { Confetti, GridBackground, NeonText } from "../components/arcade";
import "../components/game.css";
import { gameTheme } from "../components/theme";

interface Playlist {
    _id: string;
    name: string;
    description?: string;
    songCount: number;
    thumbnailFilename?: string;
    firstSongThumbnail?: string;
}

export default function StartGamePage() {
    const navigate = useNavigate();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(
        null,
    );
    const [numberOfSongs, setNumberOfSongs] = useState<number | null>(null);
    const [playerName, setPlayerName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [celebrate, setCelebrate] = useState(false);

    useEffect(() => {
        getGamePlaylists()
            .then(setPlaylists)
            .catch(() => {
                setError("Failed to load playlists");
            });
    }, []);

    const handleSelectPlaylist = (playlistId: string) => {
        setSelectedPlaylist(playlistId);
        const playlist = playlists.find((p) => p._id === playlistId);
        if (playlist) {
            setNumberOfSongs(Math.min(10, playlist.songCount));
        }
    };

    const submit = async () => {
        const cleanName = playerName.trim();
        if (!selectedPlaylist || !numberOfSongs || !cleanName) {
            setError("Pick a playlist and enter your name.");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const session = await createGameSession(
                selectedPlaylist,
                cleanName,
                numberOfSongs,
            );
            localStorage.setItem("playerName", cleanName);
            localStorage.setItem("gameCode", session.code);
            setCelebrate(true);
            setTimeout(() => navigate(`/game/${session.code}/play`), 350);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to start game",
            );
            setLoading(false);
        }
    };

    const canSubmit =
        !!selectedPlaylist && !!numberOfSongs && playerName.trim().length > 0;

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
                padding: "60px 32px 40px",
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
                    maxWidth: 460,
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
                            fontFamily: gameTheme.font.mono,
                            fontWeight: 700,
                            fontSize: 12,
                            color: gameTheme.color.neonYellow,
                            letterSpacing: "0.4em",
                            textShadow: `0 0 10px ${gameTheme.color.neonYellow}`,
                            marginBottom: 14,
                        }}
                    >
                        ◆ NEW GAME ◆
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
                        PICK A PLAYLIST. SET THE LENGTH.
                        <br />
                        DROP THE NEEDLE.
                    </div>
                </div>

                {/* Form panel */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submit();
                    }}
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

                    <FieldLabel>PLAYLIST</FieldLabel>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            marginBottom: 18,
                        }}
                    >
                        {playlists.length === 0 && !error && (
                            <div
                                style={{
                                    fontFamily: gameTheme.font.mono,
                                    fontSize: 12,
                                    color: "rgba(255,255,255,0.5)",
                                    letterSpacing: "0.15em",
                                    padding: "12px 0",
                                    textAlign: "center",
                                }}
                            >
                                LOADING PLAYLISTS…
                            </div>
                        )}
                        {playlists.map((playlist) => (
                            <PlaylistCard
                                key={playlist._id}
                                playlist={playlist}
                                selected={selectedPlaylist === playlist._id}
                                numberOfSongs={numberOfSongs}
                                onSelect={() =>
                                    handleSelectPlaylist(playlist._id)
                                }
                                onChangeNumberOfSongs={setNumberOfSongs}
                            />
                        ))}
                    </div>

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
                        disabled={loading || !canSubmit}
                        style={{
                            marginTop: 22,
                            width: "100%",
                            background: canSubmit
                                ? `linear-gradient(135deg, ${gameTheme.color.accent}, ${gameTheme.color.neonCyan})`
                                : "rgba(255,255,255,0.08)",
                            color: canSubmit
                                ? gameTheme.color.ink
                                : "rgba(255,255,255,0.4)",
                            fontFamily: gameTheme.font.display,
                            fontWeight: 900,
                            fontSize: 20,
                            letterSpacing: "0.18em",
                            padding: "18px 32px",
                            border: "none",
                            borderRadius: gameTheme.radius.md,
                            boxShadow: canSubmit
                                ? `0 0 0 3px ${gameTheme.color.accent}, 0 8px 0 ${gameTheme.color.bg}, 0 8px 30px ${gameTheme.color.accent}88`
                                : "none",
                            cursor: !canSubmit
                                ? "not-allowed"
                                : loading
                                  ? "wait"
                                  : "pointer",
                            opacity: loading ? 0.7 : 1,
                            transition: "transform .1s",
                        }}
                    >
                        ▶ {loading ? "STARTING…" : "START GAME"}
                    </button>
                </form>

                {/* Footer ticker */}
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
                    <span>HOST · CHANNEL 01</span>
                    <span>PRESS START</span>
                </div>
            </div>
        </div>
    );
}

/* --------------------------------------------------------------------- */

interface PlaylistCardProps {
    playlist: Playlist;
    selected: boolean;
    numberOfSongs: number | null;
    onSelect: () => void;
    onChangeNumberOfSongs: (n: number) => void;
}

function PlaylistCard({
    playlist,
    selected,
    numberOfSongs,
    onSelect,
    onChangeNumberOfSongs,
}: PlaylistCardProps) {
    const accent = gameTheme.color.accent;
    const thumbSrc = playlist.thumbnailFilename
        ? `/thumbnails/${playlist.thumbnailFilename}`
        : playlist.firstSongThumbnail
          ? `/thumbnails/${playlist.firstSongThumbnail}`
          : undefined;

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            style={{
                width: "100%",
                textAlign: "left",
                background: selected
                    ? "rgba(180,255,57,0.08)"
                    : "rgba(255,255,255,0.04)",
                border: `2px solid ${selected ? accent : "rgba(255,255,255,0.12)"}`,
                borderRadius: gameTheme.radius.md,
                padding: 12,
                color: gameTheme.color.inkInverse,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "background .2s, border-color .2s, box-shadow .2s",
                boxShadow: selected
                    ? `0 0 0 1px ${accent}33, 0 0 20px ${accent}55`
                    : "none",
                display: "flex",
                flexDirection: "column",
                gap: 12,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                }}
            >
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: gameTheme.radius.sm,
                        overflow: "hidden",
                        background: "rgba(0,0,0,0.4)",
                        border: `1px solid ${selected ? accent : "rgba(255,255,255,0.12)"}`,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {thumbSrc ? (
                        <img
                            src={thumbSrc}
                            alt=""
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                    ) : (
                        <span
                            style={{
                                fontFamily: gameTheme.font.mono,
                                fontSize: 18,
                                color: "rgba(255,255,255,0.4)",
                            }}
                        >
                            ♪
                        </span>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontFamily: gameTheme.font.display,
                            fontWeight: 700,
                            fontSize: 15,
                            letterSpacing: "0.04em",
                            color: gameTheme.color.inkInverse,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {playlist.name}
                    </div>
                    <div
                        style={{
                            fontFamily: gameTheme.font.mono,
                            fontSize: 11,
                            color: "rgba(255,255,255,0.55)",
                            letterSpacing: "0.1em",
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {playlist.songCount} SONGS
                        {playlist.description && ` · ${playlist.description}`}
                    </div>
                </div>
                <div
                    style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: `2px solid ${selected ? accent : "rgba(255,255,255,0.25)"}`,
                        background: selected ? accent : "transparent",
                        boxShadow: selected ? `0 0 8px ${accent}` : "none",
                        flexShrink: 0,
                        transition: "all .2s",
                    }}
                />
            </div>

            {selected && (
                <SongCountStepper
                    value={numberOfSongs ?? playlist.songCount}
                    max={playlist.songCount}
                    onChange={onChangeNumberOfSongs}
                />
            )}
        </button>
    );
}

/* --------------------------------------------------------------------- */

interface SongCountStepperProps {
    value: number;
    max: number;
    onChange: (n: number) => void;
}

function SongCountStepper({ value, max, onChange }: SongCountStepperProps) {
    const accent = gameTheme.color.accent;
    const dec = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (value > 1) onChange(value - 1);
    };
    const inc = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (value < max) onChange(value + 1);
    };
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                paddingTop: 10,
                borderTop: `1px dashed ${accent}55`,
            }}
        >
            <span
                style={{
                    fontFamily: gameTheme.font.mono,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.6)",
                    letterSpacing: "0.18em",
                }}
            >
                WIN AT
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <StepperButton label="−" onClick={dec} disabled={value <= 1} />
                <div
                    style={{
                        minWidth: 44,
                        textAlign: "center",
                        fontFamily: gameTheme.font.display,
                        fontWeight: 900,
                        fontSize: 20,
                        color: accent,
                        textShadow: `0 0 8px ${accent}88`,
                        letterSpacing: "0.05em",
                    }}
                >
                    {value}
                </div>
                <StepperButton
                    label="+"
                    onClick={inc}
                    disabled={value >= max}
                />
            </div>
        </div>
    );
}

function StepperButton({
    label,
    onClick,
    disabled,
}: {
    label: string;
    onClick: (e: React.MouseEvent) => void;
    disabled: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: disabled
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(180,255,57,0.12)",
                border: `1.5px solid ${disabled ? "rgba(255,255,255,0.15)" : gameTheme.color.accent}`,
                color: disabled
                    ? "rgba(255,255,255,0.3)"
                    : gameTheme.color.accent,
                fontFamily: gameTheme.font.display,
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1,
                cursor: disabled ? "not-allowed" : "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: disabled
                    ? "none"
                    : `0 0 8px ${gameTheme.color.accent}55`,
                transition: "all .15s",
            }}
        >
            {label}
        </button>
    );
}

/* --------------------------------------------------------------------- */

function FieldLabel({
    children,
    htmlFor,
}: {
    children: React.ReactNode;
    htmlFor?: string;
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
