"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buildQuery } from "@/lib/places/url";
import { SPOT_CATEGORIES, SPOT_CATEGORY_LABELS } from "@/lib/places/labels";

interface Props {
  cities: { slug: string; name: string; nameZh: string }[];
  tags: string[];
  initialQuery: Record<string, string | undefined>;
}

/** 景点列表筛选条：城市/分类/标签/排序（Select）+ 搜索（q）。改写 URL query。 */
export function SpotFilters({ cities, tags, initialQuery }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const update = (key: string, value: string) => {
    const next = buildQuery(initialQuery, { [key]: value, page: undefined });
    router.replace(`${pathname}${next}`, { scroll: false });
  };

  const current = {
    city: initialQuery.city ?? "all",
    category: initialQuery.category ?? "all",
    tag: initialQuery.tag ?? "all",
    q: initialQuery.q ?? "",
    sort: initialQuery.sort ?? "popular",
  };

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    update("q", String(fd.get("q") ?? "").trim());
  };

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <Field label="城市">
        <Select value={current.city} onValueChange={(v) => update("city", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="全部城市" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部城市</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="分类">
        <Select value={current.category} onValueChange={(v) => update("category", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {SPOT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {SPOT_CATEGORY_LABELS[c].en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="标签">
        <Select value={current.tag} onValueChange={(v) => update("tag", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="全部标签" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部标签</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="排序">
        <Select value={current.sort} onValueChange={(v) => update("sort", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="最热门" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">最热门</SelectItem>
            <SelectItem value="hidden">小众优先</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <form onSubmit={onSearch} className="flex items-end gap-2">
        <Field label="搜索">
          <Input name="q" defaultValue={current.q} placeholder="搜索景点…" className="w-52" />
        </Field>
        <Button type="submit" size="sm" className="mb-0.5">
          <Search className="h-4 w-4" />
          搜索
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
