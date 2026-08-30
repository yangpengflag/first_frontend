"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  maxTagLength?: number;
  id?: string;
}

/**
 * 标签输入：回车 / 逗号添加，去重、去空格、触顶与超长忽略。
 *
 * <p>不引入额外依赖；校验（数量 / 单条长度）由表单层的 zod 兜底，
 * 这里只做交互层的基本约束，避免用户输入明显非法值。
 */
export function TagInput({ value, onChange, max = 10, maxTagLength = 30, id }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const tag = draft.trim();
    setDraft("");
    if (!tag) return;
    if (tag.length > maxTagLength) return;
    if (value.includes(tag)) return;
    if (value.length >= max) return;
    onChange([...value, tag]);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
          >
            {tag}
            <button
              type="button"
              aria-label={`移除标签 ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="rounded-full hover:text-blue-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder="输入标签后回车，最多 10 个"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      />
      <p className="text-xs text-slate-500">
        {value.length}/{max}
      </p>
    </div>
  );
}
