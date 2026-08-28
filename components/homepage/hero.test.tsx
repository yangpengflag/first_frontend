import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Hero } from "./hero";

describe("Hero", () => {
  const BG = "https://picsum.photos/1920/1080";

  it("renders default headline, subheadline and search placeholder", () => {
    render(<Hero backgroundImageUrl={BG} onSearch={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /Discover China Like a Local/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your AI-powered travel companion for exploring China/i)
    ).toBeInTheDocument();

    const input = screen.getByPlaceholderText(
      /Search destinations, tips, or ask AI/i
    );
    expect(input).toBeInTheDocument();
  });

  it("calls onSearch with the trimmed query on submit (non-empty)", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<Hero backgroundImageUrl={BG} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText(/Search destinations, tips, or ask AI/i);
    await user.type(input, "  Beijing  ");
    await user.keyboard("{Enter}");

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("Beijing");
  });

  it("does NOT call onSearch when the query is empty or whitespace", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<Hero backgroundImageUrl={BG} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText(/Search destinations, tips, or ask AI/i);
    // empty
    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(onSearch).not.toHaveBeenCalled();

    // whitespace only
    await user.type(input, "   ");
    await user.keyboard("{Enter}");
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("renders a dark fallback background on the image container", () => {
    const { container } = render(<Hero backgroundImageUrl={BG} onSearch={vi.fn()} />);
    // 外层容器含兜底底色 bg-slate-800
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("bg-slate-800");
  });

  it("keeps the dark fallback background when the hero image fails to load", () => {
    const { container } = render(<Hero backgroundImageUrl={BG} onSearch={vi.fn()} />);
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    // 模拟背景图 404 / 网络失败
    fireEvent.error(img!);
    const root = container.firstElementChild as HTMLElement;
    // 兜底底色仍生效，无白块
    expect(root.className).toContain("bg-slate-800");
  });
});
