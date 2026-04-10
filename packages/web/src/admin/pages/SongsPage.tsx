import {
    CloseOutlined,
    DeleteOutlined,
    InboxOutlined,
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
    extractMetadata,
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

interface BatchEntry {
    file: File;
    title: string;
    artist: string;
    year: number | undefined;
    errors: { title?: string; artist?: string; year?: string };
}

export default function SongsPage() {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [form] = Form.useForm();
    const uploadRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([]);
    const [batchUploading, setBatchUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

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

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter((f) =>
            f.type.startsWith("audio/"),
        );
        if (files.length === 0) return;

        const entries: BatchEntry[] = await Promise.all(
            files.map(async (file) => {
                try {
                    const meta = await extractMetadata(file);
                    return {
                        file,
                        title: meta.title ?? "",
                        artist: meta.artist ?? "",
                        year: meta.year,
                        errors: {},
                    };
                } catch {
                    return {
                        file,
                        title: "",
                        artist: "",
                        year: undefined,
                        errors: {},
                    };
                }
            }),
        );
        setBatchEntries(entries);
    };

    const updateBatchEntry = (
        index: number,
        field: keyof Pick<BatchEntry, "title" | "artist" | "year">,
        value: string | number | undefined,
    ) => {
        setBatchEntries((prev) =>
            prev.map((entry, i) =>
                i === index
                    ? {
                          ...entry,
                          [field]: value,
                          errors: { ...entry.errors, [field]: undefined },
                      }
                    : entry,
            ),
        );
    };

    const removeBatchEntry = (index: number) => {
        setBatchEntries((prev) => prev.filter((_, i) => i !== index));
    };

    const handleBatchConfirm = async () => {
        // Validate all entries
        let hasErrors = false;
        const validated = batchEntries.map((entry) => {
            const errors: BatchEntry["errors"] = {};
            if (!entry.title.trim()) {
                errors.title = "Title is required";
                hasErrors = true;
            }
            if (!entry.artist.trim()) {
                errors.artist = "Artist is required";
                hasErrors = true;
            }
            if (!entry.year) {
                errors.year = "Year is required";
                hasErrors = true;
            }
            return { ...entry, errors };
        });

        if (hasErrors) {
            setBatchEntries(validated);
            return;
        }

        setBatchUploading(true);
        try {
            await Promise.all(
                batchEntries.map((entry) =>
                    uploadSongAudio({
                        title: entry.title,
                        artist: entry.artist,
                        year: entry.year as number,
                        file: entry.file,
                    }),
                ),
            );
            message.success(`${batchEntries.length} songs uploaded`);
            setBatchEntries([]);
            loadSongs();
        } catch {
            message.error("Failed to upload some songs");
        } finally {
            setBatchUploading(false);
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

            <section
                data-testid="drop-zone"
                aria-label="Drop zone for audio files"
                onDrop={handleDrop}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                style={{
                    border: `2px dashed ${dragOver ? "#1677ff" : "#d9d9d9"}`,
                    borderRadius: 8,
                    padding: 24,
                    textAlign: "center",
                    marginBottom: 16,
                    background: dragOver ? "#e6f4ff" : "#fafafa",
                    cursor: "pointer",
                    transition: "all 0.2s",
                }}
            >
                <InboxOutlined
                    style={{ fontSize: 32, color: "#999", display: "block" }}
                />
                <p style={{ margin: "8px 0 0", color: "#666" }}>
                    Drop audio files here for batch upload
                </p>
            </section>

            {batchEntries.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <Space
                        style={{
                            marginBottom: 8,
                            display: "flex",
                            justifyContent: "space-between",
                        }}
                    >
                        <Title level={5} style={{ margin: 0 }}>
                            Batch Upload
                        </Title>
                        <Space>
                            <Button onClick={() => setBatchEntries([])}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                onClick={handleBatchConfirm}
                                loading={batchUploading}
                            >
                                Confirm Upload
                            </Button>
                        </Space>
                    </Space>
                    {batchEntries.map((entry, index) => (
                        <div
                            key={`${entry.file.name}-${entry.file.size}`}
                            data-testid="batch-row"
                            style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                                marginBottom: 8,
                                padding: 8,
                                background: "#fafafa",
                                borderRadius: 4,
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <Input
                                    aria-label="Title"
                                    placeholder="Title"
                                    value={entry.title}
                                    status={
                                        entry.errors.title ? "error" : undefined
                                    }
                                    onChange={(e) =>
                                        updateBatchEntry(
                                            index,
                                            "title",
                                            e.target.value,
                                        )
                                    }
                                />
                                {entry.errors.title && (
                                    <div
                                        style={{
                                            color: "#ff4d4f",
                                            fontSize: 12,
                                        }}
                                    >
                                        {entry.errors.title}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <Input
                                    aria-label="Artist"
                                    placeholder="Artist"
                                    value={entry.artist}
                                    status={
                                        entry.errors.artist
                                            ? "error"
                                            : undefined
                                    }
                                    onChange={(e) =>
                                        updateBatchEntry(
                                            index,
                                            "artist",
                                            e.target.value,
                                        )
                                    }
                                />
                                {entry.errors.artist && (
                                    <div
                                        style={{
                                            color: "#ff4d4f",
                                            fontSize: 12,
                                        }}
                                    >
                                        {entry.errors.artist}
                                    </div>
                                )}
                            </div>
                            <div style={{ width: 100 }}>
                                <InputNumber
                                    aria-label="Year"
                                    placeholder="Year"
                                    value={entry.year}
                                    status={
                                        entry.errors.year ? "error" : undefined
                                    }
                                    style={{ width: "100%" }}
                                    onChange={(value) =>
                                        updateBatchEntry(
                                            index,
                                            "year",
                                            value ?? undefined,
                                        )
                                    }
                                />
                                {entry.errors.year && (
                                    <div
                                        style={{
                                            color: "#ff4d4f",
                                            fontSize: 12,
                                        }}
                                    >
                                        {entry.errors.year}
                                    </div>
                                )}
                            </div>
                            <div
                                style={{
                                    minWidth: 120,
                                    color: "#999",
                                    fontSize: 12,
                                    paddingTop: 4,
                                }}
                            >
                                {entry.file.name}
                            </div>
                            <Button
                                type="text"
                                danger
                                icon={<CloseOutlined />}
                                aria-label="Remove"
                                onClick={() => removeBatchEntry(index)}
                            />
                        </div>
                    ))}
                </div>
            )}

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
