import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SpotGallery } from "./SpotGallery";

const PICS = ["https://x/a.jpg", "https://x/b.jpg", "https://x/c.jpg"];

describe("SpotGallery", () => {
  it("无图片时显示渐变占位", () => {
    render(<SpotGallery images={[]} nameEn="West Lake" />);
    expect(screen.getByLabelText("暂无图片")).toBeInTheDocument();
  });

  it("单张图隐藏前后切换与圆点", () => {
    render(<SpotGallery images={[PICS[0]]} nameEn="West Lake" />);
    expect(screen.queryByLabelText("上一张")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("下一张")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByAltText("West Lake")).toHaveAttribute("src", PICS[0]);
  });

  it("多张图：next/prev 与圆点切换主图", async () => {
    render(<SpotGallery images={PICS} nameEn="West Lake" />);
    expect(screen.getByAltText("West Lake")).toHaveAttribute("src", PICS[0]);

    await userEvent.click(screen.getByLabelText("下一张"));
    expect(screen.getByAltText("West Lake")).toHaveAttribute("src", PICS[1]);

    await userEvent.click(screen.getByLabelText("上一张"));
    expect(screen.getByAltText("West Lake")).toHaveAttribute("src", PICS[0]);

    const dots = screen.getAllByRole("tab");
    await userEvent.click(dots[2]);
    expect(screen.getByAltText("West Lake")).toHaveAttribute("src", PICS[2]);
  });

  it("聚焦区域时键盘 ←/→ 切换", async () => {
    render(<SpotGallery images={PICS} nameEn="West Lake" />);
    const region = screen.getByRole("region", { name: /图片/ });
    region.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByAltText("West Lake")).toHaveAttribute("src", PICS[1]);
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByAltText("West Lake")).toHaveAttribute("src", PICS[0]);
  });
});
