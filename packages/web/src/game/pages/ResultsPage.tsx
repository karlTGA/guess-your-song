import { TrophyOutlined } from "@ant-design/icons";
import { Card, List, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getResults } from "../../api.js";

const { Title, Text } = Typography;

interface SongInfo {
    _id: string;
    title: string;
    artist: string;
    year: number;
}

interface PlayerResult {
    name: string;
    score: number;
    timeline: SongInfo[];
}

export default function ResultsPage() {
    const { code } = useParams<{ code: string }>();
    const [players, setPlayers] = useState<PlayerResult[]>([]);

    useEffect(() => {
        if (!code) return;
        getResults(code).then((data) => {
            setPlayers(data.players.sort((a, b) => b.score - a.score));
        });
    }, [code]);

    return (
        <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Title level={3} style={{ textAlign: "center" }}>
                    <TrophyOutlined /> Game Results
                </Title>

                {players.map((player, index) => (
                    <Card
                        key={player.name}
                        title={
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span>
                                    {index === 0 && "🏆 "}
                                    {player.name}
                                </span>
                                <Tag color="blue">Score: {player.score}</Tag>
                            </div>
                        }
                    >
                        <List
                            size="small"
                            dataSource={player.timeline}
                            renderItem={(song) => (
                                <List.Item>
                                    <Text>{song.title}</Text> —{" "}
                                    <Text type="secondary">
                                        {song.artist} ({song.year})
                                    </Text>
                                </List.Item>
                            )}
                        />
                    </Card>
                ))}
            </Space>
        </div>
    );
}
