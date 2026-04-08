import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
    Button,
    Form,
    Input,
    Modal,
    message,
    Popconfirm,
    Select,
    Space,
    Table,
    Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import {
    createPlaylist,
    deletePlaylist,
    getPlaylists,
    getSongs,
    updatePlaylist,
} from "../../api";

const { Title } = Typography;

interface Song {
    _id: string;
    title: string;
    artist: string;
    year: number;
}

interface Playlist {
    _id: string;
    name: string;
    description?: string;
    songs: string[];
}

export default function PlaylistsPage() {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [manageSongsPlaylist, setManageSongsPlaylist] =
        useState<Playlist | null>(null);
    const [form] = Form.useForm();
    const [manageSongsForm] = Form.useForm();

    const loadPlaylists = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPlaylists();
            setPlaylists(data);
        } catch {
            message.error("Failed to load playlists");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadSongs = useCallback(async () => {
        try {
            const data = await getSongs();
            setSongs(data);
        } catch {
            message.error("Failed to load songs");
        }
    }, []);

    useEffect(() => {
        loadPlaylists();
        loadSongs();
    }, [loadPlaylists, loadSongs]);

    const handleAdd = async (values: {
        name: string;
        description?: string;
        songs?: string[];
    }) => {
        try {
            await createPlaylist({ ...values, songs: values.songs ?? [] });
            message.success("Playlist created");
            setModalOpen(false);
            form.resetFields();
            loadPlaylists();
        } catch {
            message.error("Failed to create playlist");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deletePlaylist(id);
            message.success("Playlist deleted");
            loadPlaylists();
        } catch {
            message.error("Failed to delete playlist");
        }
    };

    const openManageSongs = (playlist: Playlist) => {
        setManageSongsPlaylist(playlist);
        manageSongsForm.setFieldsValue({ songs: playlist.songs });
    };

    const handleManageSongs = async (values: { songs: string[] }) => {
        if (!manageSongsPlaylist) return;
        try {
            await updatePlaylist(manageSongsPlaylist._id, {
                songs: values.songs,
            });
            message.success("Playlist songs updated");
            setManageSongsPlaylist(null);
            manageSongsForm.resetFields();
            loadPlaylists();
        } catch {
            message.error("Failed to update playlist songs");
        }
    };

    const columns = [
        { title: "Name", dataIndex: "name", key: "name" },
        { title: "Description", dataIndex: "description", key: "description" },
        {
            title: "Songs",
            key: "songCount",
            render: (_: unknown, record: Playlist) =>
                String(record.songs.length),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: unknown, record: Playlist) => (
                <Space>
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => openManageSongs(record)}
                        aria-label="Manage Songs"
                    >
                        Manage Songs
                    </Button>
                    <Popconfirm
                        title="Delete this playlist?"
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            aria-label="Delete"
                        >
                            Delete
                        </Button>
                    </Popconfirm>
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
                    Playlists
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setModalOpen(true)}
                >
                    Add Playlist
                </Button>
            </Space>

            <Table
                dataSource={playlists}
                columns={columns}
                rowKey="_id"
                loading={loading}
            />

            <Modal
                title="Add Playlist"
                open={modalOpen}
                onOk={() => form.submit()}
                onCancel={() => {
                    setModalOpen(false);
                    form.resetFields();
                }}
            >
                <Form form={form} layout="vertical" onFinish={handleAdd}>
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label="Description" name="description">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Songs" name="songs">
                        <Select
                            mode="multiple"
                            placeholder="Select songs"
                            options={songs.map((s) => ({
                                label: `${s.title} - ${s.artist} (${s.year})`,
                                value: s._id,
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Manage Songs"
                open={!!manageSongsPlaylist}
                onOk={() => manageSongsForm.submit()}
                onCancel={() => {
                    setManageSongsPlaylist(null);
                    manageSongsForm.resetFields();
                }}
            >
                <Form
                    form={manageSongsForm}
                    layout="vertical"
                    onFinish={handleManageSongs}
                >
                    <Form.Item label="Songs" name="songs">
                        <Select
                            mode="multiple"
                            placeholder="Select songs"
                            options={songs.map((s) => ({
                                label: `${s.title} - ${s.artist} (${s.year})`,
                                value: s._id,
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
