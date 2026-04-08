import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import LoginPage from "./LoginPage";

function renderLoginPage() {
    return render(
        <AuthProvider>
            <MemoryRouter initialEntries={["/admin/login"]}>
                <Routes>
                    <Route path="/admin/login" element={<LoginPage />} />
                    <Route path="/admin" element={<div>Admin Dashboard</div>} />
                </Routes>
            </MemoryRouter>
        </AuthProvider>,
    );
}

describe("LoginPage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        cleanup();
    });

    it("shows login form with username and password fields", () => {
        renderLoginPage();

        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /login/i }),
        ).toBeInTheDocument();
    });

    it("submits credentials and navigates to admin on success", async () => {
        const user = userEvent.setup();
        renderLoginPage();

        await user.type(screen.getByLabelText(/username/i), "admin");
        await user.type(screen.getByLabelText(/password/i), "password");
        await user.click(screen.getAllByRole("button", { name: /login/i })[0]);

        await waitFor(() => {
            expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
        });
        expect(localStorage.getItem("token")).toBe("fake-jwt-token");
    });

    it("shows error message on failed login", async () => {
        const user = userEvent.setup();
        renderLoginPage();

        await user.type(screen.getByLabelText(/username/i), "admin");
        await user.type(screen.getByLabelText(/password/i), "wrongpass");
        await user.click(screen.getAllByRole("button", { name: /login/i })[0]);

        await waitFor(() => {
            expect(
                screen.getByText(/invalid credentials/i),
            ).toBeInTheDocument();
        });
    });

    it("can switch to registration mode and create admin", async () => {
        const user = userEvent.setup();
        renderLoginPage();

        await user.click(screen.getByTestId("toggle-auth-mode"));

        expect(
            screen.getByText(/create admin account/i, { selector: "h3" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /create account/i }),
        ).toBeInTheDocument();

        await user.type(screen.getByLabelText(/username/i), "admin");
        await user.type(screen.getByLabelText(/password/i), "securepass");
        await user.click(
            screen.getAllByRole("button", { name: /create account/i })[0],
        );

        await waitFor(() => {
            expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
        });
        expect(localStorage.getItem("token")).toBe("fake-jwt-token");
    });

    it("can switch back from registration to login mode", async () => {
        const user = userEvent.setup();
        renderLoginPage();

        await user.click(screen.getByTestId("toggle-auth-mode"));
        expect(
            screen.getByText(/create admin account/i, { selector: "h3" }),
        ).toBeInTheDocument();

        await user.click(screen.getByTestId("toggle-auth-mode"));
        expect(
            screen.getByText(/admin login/i, { selector: "h3" }),
        ).toBeInTheDocument();
    });
});
