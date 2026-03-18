"use client";
import Link from "next/link";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";

export function LeftSidebar() {
  return (
    <aside className="w-[56px] flex-shrink-0 bg-white border-r border-[#e0e0e0] flex flex-col items-center py-2 gap-1 z-10">
      <Link
        href="/"
        className="group relative mb-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded overflow-hidden"
        title="Home"
      >
        <AirtableAssetIcon
          asset={453}
          alt="Airtable"
          size={20}
          tintColor="#010101"
          className="transition-all duration-200 ease-out group-hover:scale-[0.8] group-hover:opacity-0"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <AirtableAssetIcon
            asset={437}
            alt=""
            size={14}
            tintColor="#010101"
            className="opacity-0 transition-all duration-200 ease-out group-hover:opacity-100"
          />
        </span>
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
