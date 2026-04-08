import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
    Button,
    Form,
    Input,
    InputNumber,
    Modal,
    message,
    Popconfirm,
    Space,
    Table,
    Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { createSong, deleteSong, getSongs } from "../../api";

const { Title } = Typography;

interface Song {
    _id: string;
    title: string;
    artist: string;
    year: number;
    audioFilename?: string;
}

export default function SongsPage() {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const loadSongs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSongs();
            setSongs(data);
        } catch {
            message.error("Failed to load songs");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSongs();
    }, [loadSongs]);

    const handleAdd = async (values: {
        title: string;
        artist: string;
        year: number;
    }) => {
        try {
            await createSong(values);
            message.success("Song created");
            setModalOpen(false);
            form.resetFields();
            loadSongs();
        } catch {
            message.error("Failed to create song");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteSong(id);
            message.success("Song deleted");
            loadSongs();
        } catch {
            message.error("Failed to delete song");
        }
    };

    const columns = [
        { title: "Title", dataIndex: "title", key: "title" },
        { title: "Artist", dataIndex: "artist", key: "artist" },
        {
            title: "Year",
            dataIndex: "year",
            key: "year",
            render: (y: number) => String(y),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: unknown, record: Song) => (
                <Popconfirm
                    title="Delete this song?"
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
                    Songs
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setModalOpen(true)}
                >
                    Add Song
                </Button>
            </Space>

            <Table
                dataSource={songs}
                columns={columns}
                rowKey="_id"
                loading={loading}
            />

            <Modal
                title="Add Song"
                open={modalOpen}
                onOk={() => form.submit()}
                onCancel={() => {
                    setModalOpen(false);
                    form.resetFields();
                }}
            >
                <Form form={form} layout="vertical" onFinish={handleAdd}>
                    <Form.Item
                        label="Title"
                        name="title"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Artist"
                        name="artist"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Year"
                        name="year"
                        rules={[{ required: true }]}
                    >
                        <InputNumber style={{ width: "100%" }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
