import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Home page (integration with Hero via HomepageLayout)", () => {
  it("renders the Hero as the first screen of the homepage", () => {
    render(<Home />);
    // Hero 标语作为 h1 出现（homepage-hero 5.3 联调验证）
    expect(
      screen.getByRole("heading", { name: /Discover China Like a Local/i, level: 1 })
    ).toBeInTheDocument();
    // Hero 副标题与搜索框占位
    expect(
      screen.getByText(/Your AI-powered travel companion for exploring China/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search destinations, tips, or ask AI/i)
    ).toBeInTheDocument();
  });
});
