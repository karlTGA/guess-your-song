import { DeleteOutlined, PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import {
    Button,
    Form,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Typography,
    message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlaylist, getSongs, updatePlaylist } from "../../api";

const { Title } = Typography;

interface Song {
    _id: string;
    title: string;
    artist: string;
    year: number;
}

interface PlaylistDetail {
    _id: string;
    name: string;
    songs: Song[];
}

export default function PlaylistSongsPage() {
    const { playlistId } = useParams<{ playlistId: string }>();
    const navigate = useNavigate();
    const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
    const [allSongs, setAllSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addForm] = Form.useForm();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    const loadPlaylist = useCallback(async () => {
        if (!playlistId) return;
        setLoading(true);
        try {
            const data = await getPlaylist(playlistId);
            setPlaylist(data);
        } finally {
            setLoading(false);
        }
    }, [playlistId]);

    const loadAllSongs = useCallback(async () => {
        try {
            const data = await getSongs();
            setAllSongs(data);
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => {
        loadPlaylist();
    }, [loadPlaylist]);

    const handleRemoveSong = async (songId: string) => {
        if (!playlist || !playlistId) return;
        try {
            const remainingSongIds = playlist.songs
                .filter((s) => s._id !== songId)
                .map((s) => s._id);
            await updatePlaylist(playlistId, { songs: remainingSongIds });
            message.success("Song removed from playlist");
            loadPlaylist();
        } catch {
            message.error("Failed to remove song");
        }
    };

    const handleRemoveSelected = async () => {
        if (!playlist || !playlistId) return;
        try {
            const selectedIds = new Set(selectedRowKeys as string[]);
            const remainingSongIds = playlist.songs
                .filter((s) => !selectedIds.has(s._id))
                .map((s) => s._id);
            await updatePlaylist(playlistId, { songs: remainingSongIds });
            message.success(`${selectedRowKeys.length} songs removed from playlist`);
            setSelectedRowKeys([]);
            loadPlaylist();
        } catch {
            message.error("Failed to remove songs");
        }
    };

    const handleOpenAddModal = () => {
        loadAllSongs();
        setAddModalOpen(true);
    };

    const handleAddSongs = async (values: { songs: string[] }) => {
        if (!playlist || !playlistId) return;
        try {
            const currentSongIds = playlist.songs.map((s) => s._id);
            await updatePlaylist(playlistId, {
                songs: [...currentSongIds, ...values.songs],
            });
            message.success("Songs added to playlist");
            setAddModalOpen(false);
            addForm.resetFields();
            loadPlaylist();
        } catch {
            message.error("Failed to add songs");
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
                <Space>
                    <Popconfirm
                        title="Remove this song from the playlist?"
                        onConfirm={() => handleRemoveSong(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            aria-label="Remove"
                        >
                            Remove
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const playlistSongIds = new Set(
        playlist?.songs.map((s) => s._id) ?? [],
    );
    const availableSongs = allSongs.filter((s) => !playlistSongIds.has(s._id));

    return (
        <div>
            <Space
                style={{
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: "space-between",
                }}
            >
                <Space>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate("/admin/playlists")}
                        aria-label="Back to Playlists"
                    >
                        Back to Playlists
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>
                        {playlist?.name ?? "Loading..."}
                    </Title>
                </Space>
                <Space>
                    {selectedRowKeys.length > 0 && (
                        <Popconfirm
                            title={`Remove ${selectedRowKeys.length} selected songs?`}
                            onConfirm={handleRemoveSelected}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                aria-label="Remove Selected"
                            >
                                Remove Selected ({selectedRowKeys.length})
                            </Button>
                        </Popconfirm>
                    )}
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleOpenAddModal}
                    >
                        Add Song
                    </Button>
                </Space>
            </Space>

            <Table
                dataSource={playlist?.songs ?? []}
                columns={columns}
                rowKey="_id"
                loading={loading}
                rowSelection={{
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                }}
            />

            <Modal
                title="Add Songs to Playlist"
                open={addModalOpen}
                onOk={() => addForm.submit()}
                onCancel={() => {
                    setAddModalOpen(false);
                    addForm.resetFields();
                }}
            >
                <Form
                    form={addForm}
                    layout="vertical"
                    onFinish={handleAddSongs}
                >
                    <Form.Item
                        label="Songs"
                        name="songs"
                        rules={[
                            {
                                required: true,
                                message: "Please select at least one song",
                            },
                        ]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="Select songs to add"
                            options={availableSongs.map((s) => ({
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
