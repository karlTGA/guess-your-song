import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
    Button,
    Form,
    Input,
    Modal,
    message,
    Popconfirm,
    Space,
    Table,
    Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { createPlaylist, deletePlaylist, getPlaylists } from "../../api.js";

const { Title } = Typography;

interface Playlist {
    _id: string;
    name: string;
    description?: string;
    songs: string[];
}

export default function PlaylistsPage() {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

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

    useEffect(() => {
        loadPlaylists();
    }, [loadPlaylists]);

    const handleAdd = async (values: {
        name: string;
        description?: string;
    }) => {
        try {
            await createPlaylist(values);
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
                </Form>
            </Modal>
        </div>
    );
}
