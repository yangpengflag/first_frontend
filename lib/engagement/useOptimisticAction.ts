import { useCallback, useEffect, useRef, useState } from "react";

/** 乐观更新回调集合。 */
export type OptimisticHandlers<T> = {
  /** 立即应用的乐观状态更新（在发起请求前同步执行）。 */
  optimistic: () => void;
  /** 失败后回滚到操作前快照。 */
  rollback: () => void;
  /** 成功后用服务端响应校准本地态。 */
  onOk: (res: T) => void;
  /** 失败时将异常映射为提示文案；缺省回退到通用文案。 */
  onError?: (err: unknown) => string;
};

/** 运行选项。 */
export type RunOptions = {
  /**
   * 并发语义：
   * - `"scalar"`（默认）：单值状态（如投票/收藏），启用 latest-wins 守卫，过期响应一律丢弃；
   * - `"list"`：列表追加（如评论），不启用守卫，每次 onOk 均按各自 tempId 应用，回滚仅移除对应项。
   */
  mode?: "scalar" | "list";
};

const DEFAULT_ERROR = "操作未成功，请重试";
const ALERT_TTL = 4000;

/**
 * 乐观更新公共能力：latest-wins 竞态守卫 + 瞬时回滚提示。
 *
 * <p>调用 {@link run} 时立即执行 optimistic，再发起请求。默认（{@code mode:"scalar"}）下
 * 仅当本次请求为「最新一次」时才应用 onOk / rollback，被后续点击覆盖的过期响应一律丢弃，避免乱序覆盖；
 * 列表追加场景传 {@code mode:"list"} 关闭守卫（每次 onOk 按各自 tempId 独立生效），回滚由调用方按 tempId 移除对应项。
 * 失败回滚后以 {@link alert} 暴露瞬时提示（约 4s 自动消失，组件卸载时清理定时器）。
 */
export function useOptimisticAction() {
  const [alert, setAlert] = useState<string | null>(null);
  const reqId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissAlert = useCallback(() => {
    setAlert(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showAlert = useCallback((msg: string) => {
    setAlert(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAlert(null), ALERT_TTL);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const run = useCallback(
    async <T>(
      call: () => Promise<T>,
      handlers: OptimisticHandlers<T>,
      options?: RunOptions,
    ): Promise<void> => {
      const listMode = options?.mode === "list";
      const id = ++reqId.current;
      handlers.optimistic();
      try {
        const res = await call();
        if (!listMode && id !== reqId.current) return; // scalar 模式：过期响应丢弃
        handlers.onOk(res);
      } catch (err) {
        if (!listMode && id !== reqId.current) return; // scalar 模式：过期响应丢弃
        handlers.rollback();
        showAlert(handlers.onError ? handlers.onError(err) : DEFAULT_ERROR);
      }
    },
    [showAlert],
  );

  return { run, alert, dismissAlert };
}
