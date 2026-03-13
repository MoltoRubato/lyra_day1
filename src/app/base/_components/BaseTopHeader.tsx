import {
  BaseIconSVG,
  SyncIndicator,
} from "~/app/base/_components/basePagePrimitives";
import type { BasePageShellProps } from "~/app/base/_components/basePageTypes";

type BaseTopHeaderProps = Pick<BasePageShellProps, "base" | "setPanelOpen">;

export function BaseTopHeader({ base, setPanelOpen }: BaseTopHeaderProps) {
  const baseColor = base.color ?? "#f82b60";
  const baseIcon = base.icon ?? "default";

  return (
    <header className="relative flex h-[44px] flex-shrink-0 items-center gap-0 border-b border-[#e0e0e0] bg-white px-3">
      <button
        onClick={() => setPanelOpen((p) => !p)}
        className="group mr-2 flex flex-shrink-0 items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-[#f0f0ef]"
      >
        <BaseIconSVG iconId={baseIcon} color={baseColor} size={22} />
        <span className="max-w-[160px] truncate text-[13px] font-semibold text-[#172b4d]">
          {base.name}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="flex-shrink-0 text-[#999] transition-colors group-hover:text-[#555]"
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="absolute left-1/2 flex h-full -translate-x-1/2 items-center">
        <div className="relative flex h-full items-center">
          <span className="cursor-default px-3 text-[13px] font-medium text-[#172b4d]">
            Data
          </span>
          <div className="absolute right-3 bottom-0 left-3 h-[2px] rounded-full bg-[#166a5b]" />
        </div>
        {["Automations", "Interfaces", "Forms"].map((t) => (
          <button
            key={t}
            className="h-full px-3 text-[13px] text-[#555] transition-colors hover:text-[#172b4d]"
          >
            {t}
          </button>
        ))}
      </div>

      <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
        <SyncIndicator />
        <button
          className="rounded p-1.5 text-[#555] transition-colors hover:bg-[#f0f0ef] hover:text-[#172b4d]"
          title="Revision history"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3l2 2" strokeLinecap="round" />
          </svg>
        </button>
        <button className="flex items-center gap-1 rounded border border-[#d8d8d8] px-2.5 py-1 text-[12px] font-medium text-[#172b4d] transition-colors hover:bg-[#f5f5f4]">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M6 1l1.5 3.5L11 5l-2.5 2.5L9 11l-3-1.5L3 11l.5-3.5L1 5l3.5-.5L6 1z" />
          </svg>
          Upgrade
        </button>
        <button className="flex items-center gap-1 rounded border border-[#d8d8d8] px-2.5 py-1 text-[12px] font-medium text-[#172b4d] transition-colors hover:bg-[#f5f5f4]">
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M10 2L6 6M10 2H7M10 2v3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M5 3H3a1 1 0 00-1 1v5a1 1 0 001 1h5a1 1 0 001-1V7" />
          </svg>
          Launch
        </button>
        <button className="rounded p-1.5 text-[#555] transition-colors hover:bg-[#f0f0ef] hover:text-[#172b4d]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path
              d="M7 9a3 3 0 004.5.5l2-2a3 3 0 00-4.25-4.25L8 4.5M9 7a3 3 0 00-4.5-.5l-2 2A3 3 0 006.75 12.75L8 11.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button className="rounded bg-[#0069ff] px-3 py-1 text-[13px] font-medium text-white transition-colors hover:bg-[#0055d4]">
          Share
        </button>
      </div>
    </header>
  );
}
