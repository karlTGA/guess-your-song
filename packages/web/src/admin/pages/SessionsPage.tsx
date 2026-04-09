import {
    DeleteOutlined,
    PlusOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import {
    Button,
    Form,
    Modal,
    message,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import {
    createSession,
    deleteSession,
    getActiveSessions,
    getPlaylists,
    startSession,
} from "../../api";

const { Title, Text } = Typography;

interface Playlist {
    _id: string;
    name: string;
    songs: string[];
}

interface ActiveSession {
    _id: string;
    code: string;
    status: "waiting" | "playing";
    playlist: { _id: string; name: string };
    playerCount: number;
    currentRoundIndex: number;
    totalRounds: number;
    config: { roundTimerSeconds: number; maxPlayers: number };
    createdAt: string;
}

export default function SessionsPage() {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
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

    const loadActiveSessions = useCallback(async () => {
        try {
            const data = await getActiveSessions();
            setActiveSessions(data);
        } catch {
            // silently ignore polling errors
        }
    }, []);

    useEffect(() => {
        loadPlaylists();
        loadActiveSessions();
    }, [loadPlaylists, loadActiveSessions]);

    useEffect(() => {
        const interval = setInterval(loadActiveSessions, 5000);
        return () => clearInterval(interval);
    }, [loadActiveSessions]);

    const handleCreate = async (values: { playlistId: string }) => {
        try {
            await createSession({ playlistId: values.playlistId });
            message.success("Session created!");
            setModalOpen(false);
            form.resetFields();
            loadActiveSessions();
        } catch {
            message.error("Failed to create session");
        }
    };

    const handleStart = async (code: string) => {
        try {
            await startSession(code);
            message.success("Game started!");
            loadActiveSessions();
        } catch {
            message.error("Failed to start game");
        }
    };

    const handleDelete = async (code: string) => {
        try {
            await deleteSession(code);
            message.success("Session deleted");
            loadActiveSessions();
        } catch {
            message.error("Failed to delete session");
        }
    };

    const columns: ColumnsType<ActiveSession> = [
        {
            title: "Code",
            dataIndex: "code",
            key: "code",
            render: (code: string) => (
                <Tag color="blue" style={{ fontSize: 16 }}>
                    {code}
                </Tag>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status: string) => (
                <Tag color={status === "playing" ? "green" : "orange"}>
                    {status}
                </Tag>
            ),
        },
        {
            title: "Playlist",
            dataIndex: ["playlist", "name"],
            key: "playlist",
        },
        {
            title: "Players",
            dataIndex: "playerCount",
            key: "playerCount",
        },
        {
            title: "Round",
            key: "round",
            render: (_: unknown, record: ActiveSession) =>
                `${record.currentRoundIndex} / ${record.totalRounds}`,
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: unknown, record: ActiveSession) => (
                <Space>
                    {record.status === "waiting" && (
                        <Button
                            type="primary"
                            size="small"
                            onClick={() => handleStart(record.code)}
                        >
                            Start Game
                        </Button>
                    )}
                    <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.code)}
                    >
                        Delete
                    </Button>
                </Space>
            ),
        },
    ];

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
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadActiveSessions}
                    >
                        Refresh
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setModalOpen(true)}
                    >
                        Create Session
                    </Button>
                </Space>
            </Space>

            <Table
                dataSource={activeSessions}
                columns={columns}
                rowKey="_id"
                pagination={false}
                style={{ marginBottom: 16 }}
            />

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
