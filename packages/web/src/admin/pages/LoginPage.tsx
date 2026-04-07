import { useState } from "react";
import { Form, Input, Button, Alert, Card, Typography } from "antd";
import { useAuth } from "../../contexts/AuthContext.js";

const { Title } = Typography;

export default function LoginPage() {
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { username: string; password: string }) => {
        setError(null);
        setLoading(true);
        try {
            await login(values.username, values.password);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "100px auto", padding: "0 16px" }}>
            <Card>
                <Title level={3} style={{ textAlign: "center" }}>Admin Login</Title>
                {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item label="Username" name="username" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Password" name="password" rules={[{ required: true }]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            Login
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
