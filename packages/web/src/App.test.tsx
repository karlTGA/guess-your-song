import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App.js";

describe("App", () => {
    it("renders without crashing", () => {
        render(<App />);
        expect(screen.getByText("Guess Your Song")).toBeInTheDocument();
    });
});
