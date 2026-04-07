import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.js";

const { Title } = Typography;

export default function LoginPage() {
    const { login, register, isAuthenticated } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    if (isAuthenticated) {
        return <Navigate to="/admin" replace />;
    }

    const onFinish = async (values: { username: string; password: string }) => {
        setError(null);
        setLoading(true);
        try {
            if (isRegistering) {
                await register(values.username, values.password);
            } else {
                await login(values.username, values.password);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "100px auto", padding: "0 16px" }}>
            <Card>
                <Title level={3} style={{ textAlign: "center" }}>
                    {isRegistering ? "Create Admin Account" : "Admin Login"}
                </Title>
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Username"
                        name="username"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Password"
                        name="password"
                        rules={[{ required: true }]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                        >
                            {isRegistering ? "Create Account" : "Login"}
                        </Button>
                    </Form.Item>
                </Form>
                <div style={{ textAlign: "center" }}>
                    <Button
                        type="link"
                        data-testid="toggle-auth-mode"
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError(null);
                        }}
                    >
                        {isRegistering
                            ? "Already have an account? Login"
                            : "First time? Create admin account"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
