"use client";
import Link from "next/link";

export function LeftSidebar() {
  return (
    <aside className="w-[56px] flex-shrink-0 bg-white border-r border-[#e0e0e0] flex flex-col items-center py-2 gap-1 z-10">
      <Link
        href="/"
        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity mb-2"
        title="Home"
      >
        <img
          src="/airtable_assets/airtable_bw_logo.svg"
          alt="Airtable"
          width={24}
          height={24}
          draggable={false}
        />
      </Link>
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
