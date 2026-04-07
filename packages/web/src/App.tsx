import {
    PlayCircleOutlined,
    SoundOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";
import { ConfigProvider, Layout, Menu } from "antd";
import {
    BrowserRouter,
    Link,
    Navigate,
    Outlet,
    Route,
    Routes,
} from "react-router-dom";
import LoginPage from "./admin/pages/LoginPage.js";
import PlaylistsPage from "./admin/pages/PlaylistsPage.js";
import SessionsPage from "./admin/pages/SessionsPage.js";
import SongsPage from "./admin/pages/SongsPage.js";
import { AuthProvider, useAuth } from "./contexts/AuthContext.js";
import JoinPage from "./game/pages/JoinPage.js";
import PlayPage from "./game/pages/PlayPage.js";
import ResultsPage from "./game/pages/ResultsPage.js";

const { Header, Content, Sider } = Layout;

function AdminLayout() {
    const { isAuthenticated, logout, username } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    const menuItems = [
        {
            key: "songs",
            icon: <SoundOutlined />,
            label: <Link to="/admin/songs">Songs</Link>,
        },
        {
            key: "playlists",
            icon: <UnorderedListOutlined />,
            label: <Link to="/admin/playlists">Playlists</Link>,
        },
        {
            key: "sessions",
            icon: <PlayCircleOutlined />,
            label: <Link to="/admin/sessions">Sessions</Link>,
        },
    ];

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider breakpoint="lg" collapsedWidth={0}>
                <div
                    style={{
                        color: "white",
                        padding: 16,
                        textAlign: "center",
                        fontWeight: "bold",
                    }}
                >
                    Guess Your Song
                </div>
                <Menu theme="dark" mode="inline" items={menuItems} />
            </Sider>
            <Layout>
                <Header
                    style={{
                        background: "#fff",
                        padding: "0 16px",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                    }}
                >
                    <span style={{ marginRight: 16 }}>{username}</span>
                    <button type="button" onClick={logout}>
                        Logout
                    </button>
                </Header>
                <Content
                    style={{ margin: 24, padding: 24, background: "#fff" }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}

function App() {
    return (
        <ConfigProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<JoinPage />} />
                        <Route path="/admin/login" element={<LoginPage />} />
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route
                                index
                                element={<Navigate to="songs" replace />}
                            />
                            <Route path="songs" element={<SongsPage />} />
                            <Route
                                path="playlists"
                                element={<PlaylistsPage />}
                            />
                            <Route path="sessions" element={<SessionsPage />} />
                        </Route>
                        <Route path="/game/:code/play" element={<PlayPage />} />
                        <Route
                            path="/game/:code/results"
                            element={<ResultsPage />}
                        />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ConfigProvider>
    );
}

export default App;
