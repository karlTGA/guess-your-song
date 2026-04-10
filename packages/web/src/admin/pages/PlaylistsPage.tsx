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
import { useNavigate } from "react-router-dom";
import {
    createPlaylist,
    deletePlaylist,
    getPlaylists,
    getSongs,
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
    const [form] = Form.useForm();
    const navigate = useNavigate();

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
        navigate(`/admin/playlists/${playlist._id}/songs`);
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
        </div>
    );
}
