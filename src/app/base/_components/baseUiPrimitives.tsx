import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { BASE_ICONS } from "~/app/_components/baseIcons";

export function tabBarBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  const m = (c: number) => Math.round(c + (255 - c) * 0.88);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

export function tabBarBorder(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  const m = (c: number) => Math.round(c + (255 - c) * 0.72);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

export function BaseIconSVG({
  iconId,
  color,
  size = 28,
}: {
  iconId: string;
  color: string;
  size?: number;
}) {
  const def = BASE_ICONS.find((i) => i.id === iconId);
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded font-bold text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.36,
      }}
    >
      {def?.path ? (
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 16 16"
          fill="none"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={def.path} />
        </svg>
      ) : (
        "Un"
      )}
    </div>
  );
}

export function SyncIndicator() {
  const isMutating = useIsMutating();
  const [showSaved, setShowSaved] = useState(false);
  const wasActive = useRef(false);

  useEffect(() => {
    if (isMutating > 0) {
      wasActive.current = true;
      setShowSaved(false);
    } else if (wasActive.current) {
      wasActive.current = false;
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 2200);
      return () => clearTimeout(t);
    }
  }, [isMutating]);

  if (isMutating > 0) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[#888] select-none">
        <div className="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-[1.5px] border-[#ccc] border-t-[#555]" />
        <span>Saving</span>
      </div>
    );
  }
  if (showSaved) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[#22c55e] select-none">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>All changes saved</span>
      </div>
    );
  }
  return null;
}

export function LeftSidebar() {
  return (
    <aside className="z-10 flex w-[48px] flex-shrink-0 flex-col items-center gap-1 border-r border-[#e0e0e0] bg-white py-2">
      <Link
        href="/"
        className="mb-2 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded transition-opacity hover:opacity-80"
        title="Home"
      >
        <svg width="28" height="28" viewBox="0 0 28 28">
          <defs>
            <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff6b35" />
              <stop offset="50%" stopColor="#ffd700" />
              <stop offset="100%" stopColor="#0080ff" />
            </linearGradient>
          </defs>
          <rect width="28" height="28" rx="5" fill="url(#lg2)" />
          <path
            d="M5 10.5L14 6l9 4.5v2.5L14 17.5l-9-4.5V10.5z"
            fill="white"
            fillOpacity="0.95"
          />
          <path d="M5 13v4.5L14 22V18L5 13z" fill="white" fillOpacity="0.7" />
          <path d="M23 13v4.5L14 22V18L23 13z" fill="white" fillOpacity="0.5" />
        </svg>
      </Link>

      <button
        className="flex h-8 w-8 items-center justify-center rounded text-[#666] transition-colors hover:bg-[#f5f5f4] hover:text-[#172b4d]"
        title="Search"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <circle cx="6.5" cy="6.5" r="4.5" />
          <path d="M10.5 10.5L14 14" strokeLinecap="round" />
        </svg>
      </button>

      <button
        className="flex h-8 w-8 items-center justify-center rounded text-[#666] transition-colors hover:bg-[#f5f5f4] hover:text-[#172b4d]"
        title="Home"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        >
          <path d="M2 7.5L8 2L14 7.5V14H10V10H6V14H2V7.5Z" />
        </svg>
      </button>

      <div className="flex-1" />

      <button
        className="flex h-8 w-8 items-center justify-center rounded text-[#666] transition-colors hover:bg-[#f5f5f4] hover:text-[#172b4d]"
        title="Help"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <circle cx="8" cy="8" r="6" />
          <path
            d="M6 6a2 2 0 114 0c0 1-1 1.5-2 2M8 12v.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <button
        className="flex h-8 w-8 items-center justify-center rounded text-[#666] transition-colors hover:bg-[#f5f5f4] hover:text-[#172b4d]"
        title="Notifications"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path
            d="M8 1.5a5 5 0 015 5v3l1.5 2h-13L3 9.5v-3a5 5 0 015-5zM6 12a2 2 0 004 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button
        className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#c0392b] text-[12px] font-bold text-white"
        title="Account"
      >
        R
      </button>
    </aside>
  );
}

export const VIEW_META: Record<string, { icon: ReactNode; color: string }> = {
  GRID: {
    color: "#166a5b",
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      >
        <rect x="1" y="1" width="5" height="5" rx="0.5" />
        <rect x="8" y="1" width="5" height="5" rx="0.5" />
        <rect x="1" y="8" width="5" height="5" rx="0.5" />
        <rect x="8" y="8" width="5" height="5" rx="0.5" />
      </svg>
    ),
  },
  KANBAN: {
    color: "#9b59b6",
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      >
        <rect x="1" y="1" width="3.5" height="12" rx="0.5" />
        <rect x="5.25" y="1" width="3.5" height="8" rx="0.5" />
        <rect x="9.5" y="1" width="3.5" height="10" rx="0.5" />
      </svg>
    ),
  },
};
