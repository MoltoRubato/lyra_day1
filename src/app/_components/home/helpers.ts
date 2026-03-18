import type { BaseItem } from "~/app/_components/home/types";

const BASE_PALETTE = [
  "#dc043b", "#d54401", "#ffba05", "#048a0e", "#01ddd5",
  "#39caff", "#166ee1", "#dd04a8", "#7c37ef", "#616670",
];

export function fallbackColor(id: string): string {
  return BASE_PALETTE[id.charCodeAt(id.length - 1) % BASE_PALETTE.length]!;
}

export function timeAgo(date: Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date as string) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "Just now";
  if (s < 3600) {
    const m = Math.floor(s / 60);
    return `Opened ${m}m ago`;
  }
  if (s < 86400) {
    const h = Math.floor(s / 3600);
    return `Opened ${h}h ago`;
  }
  const dy = Math.floor(s / 86400);
  return `Opened ${dy}d ago`;
}

export function groupByTime(bases: BaseItem[]): { label: string; items: BaseItem[] }[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();
  const weekTs = todayTs - 6 * 24 * 60 * 60 * 1000;
  const monthTs = todayTs - 30 * 24 * 60 * 60 * 1000;

  const buckets: Record<string, BaseItem[]> = {
    "Today": [], "Past 7 days": [], "Past month": [], "Older": [], "—": [],
  };

  for (const b of bases) {
    if (!b.lastOpenedAt) {
      buckets["—"]!.push(b);
      continue;
    }
    const t = new Date(b.lastOpenedAt as unknown as string).getTime();
    if (t >= todayTs) buckets.Today!.push(b);
    else if (t >= weekTs) buckets["Past 7 days"]!.push(b);
    else if (t >= monthTs) buckets["Past month"]!.push(b);
    else buckets.Older!.push(b);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

