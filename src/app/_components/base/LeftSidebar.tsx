"use client";
import Link from "next/link";

export function LeftSidebar() {
  return (
    <aside className="w-[48px] flex-shrink-0 bg-white border-r border-[#e0e0e0] flex flex-col items-center py-2 gap-1 z-10">
      <Link
        href="/"
        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity mb-2"
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
          <path d="M5 10.5L14 6l9 4.5v2.5L14 17.5l-9-4.5V10.5z" fill="white" fillOpacity="0.95" />
          <path d="M5 13v4.5L14 22V18L5 13z" fill="white" fillOpacity="0.7" />
          <path d="M23 13v4.5L14 22V18L23 13z" fill="white" fillOpacity="0.5" />
        </svg>
      </Link>

      <button className="w-8 h-8 rounded flex items-center justify-center text-[#666] hover:bg-[#f5f5f4] hover:text-[#172b4d] transition-colors" title="Search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="6.5" cy="6.5" r="4.5" />
          <path d="M10.5 10.5L14 14" strokeLinecap="round" />
        </svg>
      </button>

      <button className="w-8 h-8 rounded flex items-center justify-center text-[#666] hover:bg-[#f5f5f4] hover:text-[#172b4d] transition-colors" title="Home">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M2 7.5L8 2L14 7.5V14H10V10H6V14H2V7.5Z" />
        </svg>
      </button>

      <div className="flex-1" />

      <button className="w-8 h-8 rounded flex items-center justify-center text-[#666] hover:bg-[#f5f5f4] hover:text-[#172b4d] transition-colors" title="Help">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6" />
          <path d="M6 6a2 2 0 114 0c0 1-1 1.5-2 2M8 12v.5" strokeLinecap="round" />
        </svg>
      </button>

      <button className="w-8 h-8 rounded flex items-center justify-center text-[#666] hover:bg-[#f5f5f4] hover:text-[#172b4d] transition-colors" title="Notifications">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M8 1.5a5 5 0 015 5v3l1.5 2h-13L3 9.5v-3a5 5 0 015-5zM6 12a2 2 0 004 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button className="w-8 h-8 rounded-full bg-[#c0392b] flex items-center justify-center text-white text-[12px] font-bold mt-1 flex-shrink-0" title="Account">
        R
      </button>
    </aside>
  );
}
