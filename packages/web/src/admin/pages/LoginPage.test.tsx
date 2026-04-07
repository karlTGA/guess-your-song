import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../contexts/AuthContext.js";
import LoginPage from "./LoginPage.js";

function renderLoginPage() {
    return render(
        <AuthProvider>
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        </AuthProvider>,
    );
}

describe("LoginPage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("shows login form with username and password fields", () => {
        renderLoginPage();

        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    });

    it("submits credentials and stores JWT on success", async () => {
        const user = userEvent.setup();
        renderLoginPage();

        await user.type(screen.getByLabelText(/username/i), "admin");
        await user.type(screen.getByLabelText(/password/i), "password");
        await user.click(screen.getAllByRole("button", { name: /login/i })[0]);

        await waitFor(() => {
            expect(localStorage.getItem("token")).toBe("fake-jwt-token");
        });
    });

    it("shows error message on failed login", async () => {
        const user = userEvent.setup();
        renderLoginPage();

        await user.type(screen.getByLabelText(/username/i), "admin");
        await user.type(screen.getByLabelText(/password/i), "wrongpass");
        await user.click(screen.getAllByRole("button", { name: /login/i })[0]);

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
    });
});
