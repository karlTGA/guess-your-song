import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { login as apiLogin, register as apiRegister } from "../api";

interface AuthState {
    token: string | null;
    username: string | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() =>
        localStorage.getItem("token"),
    );
    const [username, setUsername] = useState<string | null>(() =>
        localStorage.getItem("username"),
    );

    useEffect(() => {
        if (token) {
            localStorage.setItem("token", token);
        } else {
            localStorage.removeItem("token");
        }
    }, [token]);

    useEffect(() => {
        if (username) {
            localStorage.setItem("username", username);
        } else {
            localStorage.removeItem("username");
        }
    }, [username]);

    const login = useCallback(async (user: string, password: string) => {
        const result = await apiLogin(user, password);
        setToken(result.token);
        setUsername(result.admin.username);
    }, []);

    const register = useCallback(async (user: string, password: string) => {
        const result = await apiRegister(user, password);
        setToken(result.token);
        setUsername(result.admin.username);
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUsername(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                token,
                username,
                isAuthenticated: !!token,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
