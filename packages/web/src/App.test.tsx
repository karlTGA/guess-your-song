import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App.js";

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByText("Guess Your Song")).toBeInTheDocument();
  });
});
