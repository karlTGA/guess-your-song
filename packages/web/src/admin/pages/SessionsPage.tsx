import { PlusOutlined } from "@ant-design/icons";
import {
    Button,
    Form,
    Modal,
    message,
    Select,
    Space,
    Tag,
    Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { createSession, getPlaylists, startSession } from "../../api";

const { Title, Text } = Typography;

interface Playlist {
    _id: string;
    name: string;
    songs: string[];
}

interface Session {
    _id: string;
    code: string;
    status: string;
}

export default function SessionsPage() {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const loadPlaylists = useCallback(async () => {
        try {
            const data = await getPlaylists();
            setPlaylists(data);
        } catch {
            message.error("Failed to load playlists");
        }
    }, []);

    useEffect(() => {
        loadPlaylists();
    }, [loadPlaylists]);

    const handleCreate = async (values: { playlistId: string }) => {
        try {
            const session = await createSession({
                playlistId: values.playlistId,
            });
            setSessions((prev) => [...prev, session]);
            message.success(`Session created with code: ${session.code}`);
            setModalOpen(false);
            form.resetFields();
        } catch {
            message.error("Failed to create session");
        }
    };

    const handleStart = async (code: string) => {
        try {
            const updated = await startSession(code);
            setSessions((prev) =>
                prev.map((s) =>
                    s.code === code ? { ...s, status: updated.status } : s,
                ),
            );
            message.success("Game started!");
        } catch {
            message.error("Failed to start game");
        }
    };

    return (
        <div>
            <Space
                style={{
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: "space-between",
                }}
            >
                <Title level={4} style={{ margin: 0 }}>
                    Game Sessions
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setModalOpen(true)}
                >
                    Create Session
                </Button>
            </Space>

            {sessions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    {sessions.map((s) => (
                        <div key={s._id} style={{ marginBottom: 8 }}>
                            <Text>Join Code: </Text>
                            <Tag color="blue" style={{ fontSize: 18 }}>
                                {s.code}
                            </Tag>
                            <Tag>{s.status}</Tag>
                            {s.status === "waiting" && (
                                <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => handleStart(s.code)}
                                >
                                    Start Game
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                    Select a playlist and create a session to get a join code
                    for players.
                </Text>
            </div>

            <div>
                <Title level={5}>Available Playlists</Title>
                {playlists.map((p) => (
                    <div key={p._id} style={{ marginBottom: 4 }}>
                        <Text>{p.name}</Text>{" "}
                        <Text type="secondary">({p.songs.length} songs)</Text>
                    </div>
                ))}
            </div>

            <Modal
                title="Create Game Session"
                open={modalOpen}
                onOk={() => form.submit()}
                onCancel={() => {
                    setModalOpen(false);
                    form.resetFields();
                }}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item
                        label="Playlist"
                        name="playlistId"
                        rules={[
                            {
                                required: true,
                                message: "Please select a playlist",
                            },
                        ]}
                    >
                        <Select placeholder="Select a playlist">
                            {playlists.map((p) => (
                                <Select.Option key={p._id} value={p._id}>
                                    {p.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
