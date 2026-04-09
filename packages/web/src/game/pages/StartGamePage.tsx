import {
    Alert,
    Button,
    Card,
    Form,
    Input,
    InputNumber,
    List,
    Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGameSession, getGamePlaylists } from "../../api";

const { Title } = Typography;

interface Playlist {
    _id: string;
    name: string;
    description?: string;
    songCount: number;
}

export default function StartGamePage() {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(
        null,
    );
    const [numberOfSongs, setNumberOfSongs] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const selectedPlaylistData = playlists.find(
        (p) => p._id === selectedPlaylist,
    );

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
            setNumberOfSongs(playlist.songCount);
        }
    };

    const handleStart = async (values: { playerName: string }) => {
        if (!selectedPlaylist || !numberOfSongs) return;
        setError(null);
        setLoading(true);
        try {
            const session = await createGameSession(
                selectedPlaylist,
                values.playerName,
                numberOfSongs,
            );
            localStorage.setItem("playerName", values.playerName);
            localStorage.setItem("gameCode", session.code);
            navigate(`/game/${session.code}/play`);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to start game",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                padding: 16,
            }}
        >
            <Card style={{ width: "100%", maxWidth: 500 }}>
                <Title level={3} style={{ textAlign: "center" }}>
                    Start a New Game
                </Title>
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        style={{ marginBottom: 16 }}
                    />
                )}
                <List
                    dataSource={playlists}
                    renderItem={(playlist) => (
                        <List.Item
                            onClick={() => handleSelectPlaylist(playlist._id)}
                            style={{
                                cursor: "pointer",
                                background:
                                    selectedPlaylist === playlist._id
                                        ? "#e6f4ff"
                                        : undefined,
                                padding: "8px 12px",
                                borderRadius: 4,
                            }}
                        >
                            <List.Item.Meta
                                title={playlist.name}
                                description={`${playlist.songCount} songs${playlist.description ? ` — ${playlist.description}` : ""}`}
                            />
                        </List.Item>
                    )}
                    style={{ marginBottom: 16 }}
                />
                <Form onFinish={handleStart} layout="vertical">
                    {selectedPlaylistData && (
                        <Form.Item label="Number of Songs">
                            <InputNumber
                                min={1}
                                max={selectedPlaylistData.songCount}
                                value={numberOfSongs}
                                onChange={(value) => setNumberOfSongs(value)}
                                style={{ width: "100%" }}
                            />
                        </Form.Item>
                    )}
                    <Form.Item
                        label="Your Name"
                        name="playerName"
                        rules={[
                            {
                                required: true,
                                message: "Please enter your name",
                            },
                        ]}
                    >
                        <Input placeholder="Enter your name" />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            disabled={!selectedPlaylist}
                        >
                            Start Game
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
