import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinSession } from "../../api.js";

const { Title } = Typography;

export default function JoinPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleJoin = async (values: { code: string; playerName: string }) => {
        setError(null);
        setLoading(true);
        try {
            await joinSession(values.code, values.playerName);
            localStorage.setItem("playerName", values.playerName);
            localStorage.setItem("gameCode", values.code);
            navigate(`/game/${values.code}/play`);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to join session",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                padding: 16,
            }}
        >
            <Card style={{ width: "100%", maxWidth: 400 }}>
                <Title level={3} style={{ textAlign: "center" }}>
                    Guess Your Song
                </Title>
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Form layout="vertical" onFinish={handleJoin}>
                    <Form.Item
                        label="Game Code"
                        name="code"
                        rules={[
                            { required: true, message: "Enter the game code" },
                        ]}
                    >
                        <Input
                            placeholder="Enter 6-character code"
                            maxLength={6}
                            style={{ textTransform: "uppercase" }}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Your Name"
                        name="playerName"
                        rules={[{ required: true, message: "Enter your name" }]}
                    >
                        <Input placeholder="Enter your name" />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                        >
                            Join Game
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
