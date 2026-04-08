import {
    DeleteOutlined,
    PlusOutlined,
    UploadOutlined,
} from "@ant-design/icons";
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
    Tag,
    Typography,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    createSong,
    deleteSong,
    getSongs,
    uploadAudioForSong,
    uploadSongAudio,
} from "../../api";

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
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [form] = Form.useForm();
    const uploadRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
            if (audioFile) {
                await uploadSongAudio({ ...values, file: audioFile });
            } else {
                await createSong(values);
            }
            message.success("Song created");
            setModalOpen(false);
            setAudioFile(null);
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

    const handleUploadAudio = async (id: string, file: File) => {
        try {
            await uploadAudioForSong(id, file);
            message.success("Audio uploaded");
            loadSongs();
        } catch {
            message.error("Failed to upload audio");
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
            title: "Audio",
            key: "audio",
            render: (_: unknown, record: Song) =>
                record.audioFilename ? (
                    <Tag color="green">Has audio</Tag>
                ) : (
                    <Tag>No audio</Tag>
                ),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: unknown, record: Song) => (
                <Space>
                    <Button
                        icon={<UploadOutlined />}
                        aria-label="Upload Audio"
                        onClick={() => uploadRefs.current[record._id]?.click()}
                    >
                        Upload Audio
                    </Button>
                    <input
                        type="file"
                        accept="audio/*"
                        data-testid="audio-upload-input"
                        ref={(el) => {
                            uploadRefs.current[record._id] = el;
                        }}
                        style={{ display: "none" }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                handleUploadAudio(record._id, file);
                            }
                        }}
                    />
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
                    setAudioFile(null);
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
                    <Form.Item label="Audio File">
                        <input
                            type="file"
                            accept="audio/*"
                            aria-label="Audio File"
                            onChange={(e) => {
                                setAudioFile(e.target.files?.[0] ?? null);
                            }}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
