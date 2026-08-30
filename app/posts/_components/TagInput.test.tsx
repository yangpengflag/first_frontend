import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TagInput } from "./TagInput";

describe("TagInput", () => {
  it("回车添加标签", async () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText(/输入标签后回车/), "hiking{Enter}");
    expect(onChange).toHaveBeenCalledWith(["hiking"]);
  });

  it("去重、去空格、超长忽略", async () => {
    const onChange = vi.fn();
    render(<TagInput value={["hiking"]} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/输入标签后回车/);
    await userEvent.type(input, "  hiking  {Enter}");
    await userEvent.type(input, "a".repeat(31) + "{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("触顶后不再添加", async () => {
    const onChange = vi.fn();
    const value = Array.from({ length: 10 }, (_, i) => `t${i}`);
    render(<TagInput value={value} onChange={onChange} max={10} />);
    await userEvent.type(screen.getByPlaceholderText(/输入标签后回车/), "extra{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("移除标签", async () => {
    const onChange = vi.fn();
    render(<TagInput value={["hiking"]} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("移除标签 hiking"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
