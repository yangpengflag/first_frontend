import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Ticket,
  Timer,
  Star,
  ExternalLink,
  Compass,
} from "lucide-react";

import type { Spot, RelatedPost } from "@/lib/places/types";
import { SPOT_CATEGORY_LABELS } from "@/lib/places/labels";
import { SpotCard } from "@/components/places/SpotCard";
import { SpotGallery } from "@/components/places/SpotGallery";
import { SpotCommentSection } from "@/components/places/SpotCommentSection";
import { BookmarkButton } from "@/app/posts/_components/BookmarkButton";
import { RelatedPosts } from "@/components/places/RelatedPosts";

export function SpotDetail({
  spot,
  neighbors,
  related,
}: {
  spot: Spot;
  neighbors: Spot[];
  related: RelatedPost[];
}) {
  const category = SPOT_CATEGORY_LABELS[spot.category];
  const cityName = spot.cityName ?? spot.citySlug;

  // 双语降级：英文缺失时以中文兜底（spec 场景）
  const descEn = spot.descriptionEn || spot.descriptionZh;
  const descZh = spot.descriptionEn ? spot.descriptionZh : null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
  const amapUrl = `https://uri.amap.com/marker?position=${spot.lng},${spot.lat}&name=${encodeURIComponent(
    spot.nameEn
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-8 py-16 sm:px-12 lg:px-16">
        <Link
          href="/spots"
          className="mb-6 inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          返回景点列表
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {category.en}
          </span>
          {spot.hiddenGem && (
            <span className="rounded-full bg-emerald-600/90 px-2.5 py-0.5 text-xs font-medium text-white">
              Hidden Gem
            </span>
          )}
          <Link
            href={`/cities/${spot.citySlug}`}
            className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {cityName}
          </Link>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-slate-900 lg:text-4xl">{spot.nameEn}</h1>
        <p className="mt-1 text-lg text-slate-500">
          {spot.nameZh} <span aria-hidden="true">·</span> {cityName}
        </p>

        <div className="mt-4">
          <BookmarkButton targetType="spot" targetId={spot.slug} />
        </div>

        <SpotGallery
          images={
            spot.gallery && spot.gallery.length > 0
              ? spot.gallery
              : spot.coverImage
                ? [spot.coverImage]
                : []
          }
          nameEn={spot.nameEn}
          nameZh={spot.nameZh}
        />

        <section className="mt-8 space-y-4">
          <p className="whitespace-pre-line text-slate-700">{descEn}</p>
          {descZh && <p className="whitespace-pre-line text-sm text-slate-500">中文：{descZh}</p>}
        </section>

        <section className="mt-8 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <InfoItem icon={<MapPin className="h-4 w-4" />} label="地址 / Address">
            <span>{spot.addressEn}</span>
            <span className="block text-sm text-slate-500">{spot.addressZh}</span>
          </InfoItem>
          {spot.openingHours && (
            <InfoItem icon={<Clock className="h-4 w-4" />} label="开放时间 / Hours">
              {spot.openingHours}
            </InfoItem>
          )}
          {spot.ticketInfo && (
            <InfoItem icon={<Ticket className="h-4 w-4" />} label="门票 / Tickets">
              {spot.ticketInfo}
            </InfoItem>
          )}
          {spot.visitDuration && (
            <InfoItem icon={<Timer className="h-4 w-4" />} label="建议时长 / Duration">
              {spot.visitDuration}
            </InfoItem>
          )}
          {spot.level && (
            <InfoItem icon={<Compass className="h-4 w-4" />} label="景区等级 / Level">
              {spot.level}
            </InfoItem>
          )}
          {spot.rating != null && (
            <InfoItem icon={<Star className="h-4 w-4" />} label="评分 / Rating">
              {spot.rating.toFixed(1)} / 5
            </InfoItem>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            位置 / Location
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Google Maps <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={amapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              高德地图 <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900">周边景点 / Nearby in {cityName}</h2>
          {neighbors.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">该城市暂无其他收录景点。</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {neighbors.map((n) => (
                <SpotCard key={n.slug} spot={n} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">评论 / Comments</h2>
          <div className="mt-4">
            <SpotCommentSection slug={spot.slug} />
          </div>
        </section>

        <RelatedPosts related={related} />
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <span className="text-slate-400" aria-hidden="true">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1 text-slate-600">{children}</div>
    </div>
  );
}


