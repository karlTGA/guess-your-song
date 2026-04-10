import {
    CloseOutlined,
    DeleteOutlined,
    InboxOutlined,
    PlusOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import {
    Button,
    Input,
    InputNumber,
    Modal,
    message,
    Popconfirm,
    Radio,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    createPlaylist,
    deleteSong,
    extractMetadata,
    getPlaylists,
    getSongs,
    updatePlaylist,
    updateSong,
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

interface Playlist {
    _id: string;
    name: string;
    songs: string[];
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
    const uploadRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([]);
    const [batchUploading, setBatchUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [playlistMode, setPlaylistMode] = useState<
        "none" | "existing" | "new"
    >("none");
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<
        string | undefined
    >();
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [editingCell, setEditingCell] = useState<{
        id: string;
        field: "title" | "artist" | "year";
    } | null>(null);
    const [editValue, setEditValue] = useState<string | number>("");

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

    const loadPlaylists = useCallback(async () => {
        try {
            const data = await getPlaylists();
            setPlaylists(data);
        } catch {
            // silently fail - playlists are optional
        }
    }, []);

    useEffect(() => {
        loadSongs();
    }, [loadSongs]);

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

    const handleOpenModal = () => {
        setModalOpen(true);
        loadPlaylists();
    };

    const startEditing = (
        id: string,
        field: "title" | "artist" | "year",
        currentValue: string | number,
    ) => {
        setEditingCell({ id, field });
        setEditValue(currentValue);
    };

    const cancelEditing = () => {
        setEditingCell(null);
        setEditValue("");
    };

    const saveEdit = async () => {
        if (!editingCell) return;
        try {
            await updateSong(editingCell.id, {
                [editingCell.field]: editValue,
            });
            loadSongs();
        } catch {
            message.error("Failed to update song");
        }
        setEditingCell(null);
        setEditValue("");
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setBatchEntries([]);
        setDragOver(false);
        setPlaylistMode("none");
        setSelectedPlaylistId(undefined);
        setNewPlaylistName("");
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
        setBatchEntries((prev) => [...prev, ...entries]);
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
            const results = await Promise.all(
                batchEntries.map((entry) =>
                    uploadSongAudio({
                        title: entry.title,
                        artist: entry.artist,
                        year: entry.year as number,
                        file: entry.file,
                    }),
                ),
            );

            const newSongIds = results.map((r) => r._id);

            if (playlistMode === "existing" && selectedPlaylistId) {
                const playlist = playlists.find(
                    (p) => p._id === selectedPlaylistId,
                );
                if (playlist) {
                    await updatePlaylist(selectedPlaylistId, {
                        songs: [...playlist.songs, ...newSongIds],
                    });
                }
            } else if (playlistMode === "new" && newPlaylistName.trim()) {
                await createPlaylist({
                    name: newPlaylistName.trim(),
                    songs: newSongIds,
                });
            }

            message.success(`${batchEntries.length} songs uploaded`);
            handleCloseModal();
            loadSongs();
        } catch {
            message.error("Failed to upload some songs");
        } finally {
            setBatchUploading(false);
        }
    };

    const renderEditableCell = (
        value: string | number,
        record: Song,
        field: "title" | "artist" | "year",
    ) => {
        const isEditing =
            editingCell?.id === record._id && editingCell?.field === field;
        if (isEditing) {
            if (field === "year") {
                return (
                    <InputNumber
                        autoFocus
                        value={editValue as number}
                        onChange={(v) => setEditValue(v ?? 0)}
                        onPressEnter={saveEdit}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEditing();
                        }}
                        style={{ width: "100%" }}
                    />
                );
            }
            return (
                <Input
                    autoFocus
                    value={editValue as string}
                    onChange={(e) => setEditValue(e.target.value)}
                    onPressEnter={saveEdit}
                    onBlur={saveEdit}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") cancelEditing();
                    }}
                />
            );
        }
        return (
            <button
                type="button"
                style={{
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                    font: "inherit",
                    color: "inherit",
                    textAlign: "inherit",
                    width: "100%",
                }}
                onClick={() => startEditing(record._id, field, value)}
            >
                {String(value)}
            </button>
        );
    };

    const columns = [
        {
            title: "Title",
            dataIndex: "title",
            key: "title",
            render: (value: string, record: Song) =>
                renderEditableCell(value, record, "title"),
        },
        {
            title: "Artist",
            dataIndex: "artist",
            key: "artist",
            render: (value: string, record: Song) =>
                renderEditableCell(value, record, "artist"),
        },
        {
            title: "Year",
            dataIndex: "year",
            key: "year",
            render: (value: number, record: Song) =>
                renderEditableCell(value, record, "year"),
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
                    onClick={handleOpenModal}
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
                title="Add Songs"
                open={modalOpen}
                onCancel={handleCloseModal}
                width={720}
                footer={
                    batchEntries.length > 0
                        ? [
                              <Button key="cancel" onClick={handleCloseModal}>
                                  Cancel
                              </Button>,
                              <Button
                                  key="confirm"
                                  type="primary"
                                  onClick={handleBatchConfirm}
                                  loading={batchUploading}
                              >
                                  Confirm Upload
                              </Button>,
                          ]
                        : null
                }
            >
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
                        style={{
                            fontSize: 32,
                            color: "#999",
                            display: "block",
                        }}
                    />
                    <p style={{ margin: "8px 0 0", color: "#666" }}>
                        Drop audio files here for batch upload
                    </p>
                </section>

                {batchEntries.length > 0 && (
                    <>
                        <div style={{ marginBottom: 16 }}>
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
                                                entry.errors.title
                                                    ? "error"
                                                    : undefined
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
                                                entry.errors.year
                                                    ? "error"
                                                    : undefined
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

                        <div style={{ marginBottom: 16 }}>
                            <Radio.Group
                                value={playlistMode}
                                onChange={(e) =>
                                    setPlaylistMode(e.target.value)
                                }
                            >
                                <Radio value="none">No playlist</Radio>
                                <Radio value="existing">
                                    Existing playlist
                                </Radio>
                                <Radio value="new">New playlist</Radio>
                            </Radio.Group>

                            {playlistMode === "existing" && (
                                <Select
                                    aria-label="Playlist"
                                    placeholder="Select a playlist"
                                    value={selectedPlaylistId}
                                    onChange={setSelectedPlaylistId}
                                    style={{
                                        width: "100%",
                                        marginTop: 8,
                                    }}
                                    options={playlists.map((p) => ({
                                        label: p.name,
                                        value: p._id,
                                    }))}
                                />
                            )}

                            {playlistMode === "new" && (
                                <Input
                                    aria-label="Playlist Name"
                                    placeholder="Playlist name"
                                    value={newPlaylistName}
                                    onChange={(e) =>
                                        setNewPlaylistName(e.target.value)
                                    }
                                    style={{ marginTop: 8 }}
                                />
                            )}
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
