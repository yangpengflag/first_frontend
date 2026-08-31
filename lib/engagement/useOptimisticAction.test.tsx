import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { useOptimisticAction } from "./useOptimisticAction";

function Harness({ resolver }: { resolver: () => Promise<string> }) {
  const [value, setValue] = useState("init");
  const { run, alert, dismissAlert } = useOptimisticAction();
  return (
    <div>
      <span data-testid="value">{value}</span>
      <button
        onClick={() =>
          run(resolver, {
            optimistic: () => setValue("optimistic"),
            rollback: () => setValue("init"),
            onOk: (res) => setValue(res),
            onError: () => "failed",
          })
        }
      >
        go
      </button>
      {alert && (
        <div role="alert" aria-live="polite">
          {alert}
          <button onClick={dismissAlert}>x</button>
        </div>
      )}
    </div>
  );
}

describe("useOptimisticAction", () => {
  it("先乐观更新，成功后用响应校准", async () => {
    let resolveFn!: (v: string) => void;
    const resolver = vi.fn(() => new Promise<string>((res) => (resolveFn = res)));
    render(<Harness resolver={resolver} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "go" }));
    // 乐观态立即生效（此时响应尚未 resolve）
    expect(screen.getByTestId("value")).toHaveTextContent("optimistic");
    resolveFn("server");
    await waitFor(() => expect(screen.getByTestId("value")).toHaveTextContent("server"));
  });

  it("失败后回滚并显示瞬时提示", async () => {
    let rejectFn!: (e: unknown) => void;
    const resolver = vi.fn(() => new Promise<string>((_res, rej) => (rejectFn = rej)));
    render(<Harness resolver={resolver} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByTestId("value")).toHaveTextContent("optimistic");
    rejectFn(new Error("boom"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
    expect(alert).toHaveTextContent("failed");
    await waitFor(() => expect(screen.getByTestId("value")).toHaveTextContent("init"));
  });

  it("可手动关闭提示", async () => {
    let rejectFn!: (e: unknown) => void;
    const resolver = vi.fn(() => new Promise<string>((_res, rej) => (rejectFn = rej)));
    render(<Harness resolver={resolver} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "go" }));
    rejectFn(new Error("boom"));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "x" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("list 模式：并发提交的 onOk 均生效（关闭 latest-wins 守卫）", async () => {
    const applied: string[] = [];
    const resolvers: Array<(v: string) => void> = [];
    function ListHarness() {
      const { run } = useOptimisticAction();
      return (
        <button
          onClick={() =>
            run(
              () => new Promise<string>((res) => resolvers.push(res)),
              { optimistic: () => {}, rollback: () => {}, onOk: (res) => applied.push(res) },
              { mode: "list" },
            )
          }
        >
          go
        </button>
      );
    }
    render(<ListHarness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button")); // -> resolvers[0]
    await user.click(screen.getByRole("button")); // -> resolvers[1]
    // 故意让「先发起」的 resolvers[0] 在其后（resolvers[1] 之后）才 resolve：
    // scalar 模式下前者会被丢弃，list 模式下两者都生效
    resolvers[1]("second");
    resolvers[0]("first");
    await waitFor(() => expect(applied).toEqual(["second", "first"]));
  });
});
