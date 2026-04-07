export interface Admin {
    _id: string;
    username: string;
}

export interface LoginInput {
    username: string;
    password: string;
}

export interface RegisterInput {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    admin: Admin;
}
