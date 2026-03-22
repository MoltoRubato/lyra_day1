import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { timeAgo } from "~/app/_components/home/helpers";
import {
  CustomizeMenuIco,
  DeleteMenuIco,
  DuplicateMenuIco,
  GoToWorkspaceMenuIco,
  MoveMenuIco,
  RenameMenuIco,
  StarIco,
  ThreeDotsIco,
} from "~/app/_components/home/icons";
import type { BaseItem } from "~/app/_components/home/types";
import { BaseIcon } from "~/app/_components/home/ui";

export function BaseListView({
  bases,
  showWorkspace,
  onRename,
  onDelete,
  onStar,
  onMove,
  onDuplicate,
  onGoToWorkspace,
  onCustomizeAppearance,
}: {
  bases: BaseItem[];
  showWorkspace: boolean;
  onRename: (b: BaseItem) => void;
  onDelete: (id: string) => void;
  onStar: (b: BaseItem) => void;
  onMove: (b: BaseItem) => void;
  onDuplicate?: (b: BaseItem) => void;
  onGoToWorkspace?: (b: BaseItem) => void;
  onCustomizeAppearance?: (b: BaseItem) => void;
}) {
  const [openMenuBaseId, setOpenMenuBaseId] = useState<string | null>(null);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);

  const containerCols = "grid-cols-[500px_minmax(0,1fr)]";
  const metadataCols = showWorkspace ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)]";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfPastWeek = new Date(startOfToday);
  startOfPastWeek.setDate(startOfPastWeek.getDate() - 7);

  const groupedBases = {
    today: bases.filter((base) => {
      if (!base.lastOpenedAt) return true;
      return new Date(base.lastOpenedAt) >= startOfToday;
    }),
    pastWeek: bases.filter((base) => {
      if (!base.lastOpenedAt) return false;
      const opened = new Date(base.lastOpenedAt);
      return opened < startOfToday && opened >= startOfPastWeek;
    }),
    earlier: bases.filter((base) => {
      if (!base.lastOpenedAt) return false;
      return new Date(base.lastOpenedAt) < startOfPastWeek;
    }),
  };

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuWrapRef.current?.contains(event.target as Node)) {
        setOpenMenuBaseId(null);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuBaseId(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  function runAndClose(action: () => void) {
    action();
    setOpenMenuBaseId(null);
  }

  function MenuItem({
    icon,
    label,
    onClick,
    danger = false,
  }: {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
  }) {
    return (
      <li className="list-none">
        <button
          type="button"
          onClick={onClick}
          className={`flex h-[34px] w-full items-center rounded px-[10px] text-[13px] font-normal leading-[18px] transition-colors hover:bg-[#f3f4f6] ${
            danger ? "text-[#1d1f25]" : "text-[#1d1f25]"
          }`}
        >
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">{icon}</span>
          <span className="ml-2 block w-[176px] min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left">
            {label}
          </span>
        </button>
      </li>
    );
  }

  return (
    <div ref={menuWrapRef}>
      <div className={`grid h-11 items-center gap-6 border-b border-[#d6dae1] px-2 text-[13px] leading-[18px] text-[#6f7682] ${containerCols}`}>
        <span className="pl-1">Name</span>
        <div className={`grid items-center gap-6 ${metadataCols}`}>
          <span>Last opened</span>
          {showWorkspace ? <span>Workspace</span> : null}
        </div>
      </div>

      {[
        { label: "Today", items: groupedBases.today },
        { label: "Past 7 days", items: groupedBases.pastWeek },
        { label: "Earlier", items: groupedBases.earlier },
      ].map((section) =>
        section.items.length > 0 ? (
          <div key={section.label}>
            <h4 className="px-1 py-2 text-[13px] font-medium text-[#616670]">{section.label}</h4>
            {section.items.map((base) => (
              <div
                key={base.id}
                className={`group mx-1 grid h-11 items-center gap-6 rounded-[6px] px-2 text-[13px] font-normal leading-[18px] text-[#1d1f25] transition-colors hover:bg-[#eceef0] ${containerCols}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <BaseIcon base={base} size={24} />
                  {base.id.startsWith("temp-") ? (
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate whitespace-nowrap text-[13px] font-semibold leading-[18px] text-[#9ca3af]">
                      {base.name}
                      <span className="h-2.5 w-2.5 flex-shrink-0 animate-spin rounded-full border border-[#ccc] border-t-[#888]" />
                    </span>
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Link
                          href={`/base/${base.id}`}
                          className="min-w-0 max-w-fit truncate whitespace-nowrap text-[13px] font-semibold leading-[18px] text-[#1d1f25]"
                        >
                          {base.name}
                        </Link>
                        <span className="whitespace-nowrap text-[13px] leading-[18px] text-[#5f6672] opacity-0 transition-opacity group-hover:opacity-100">
                          Open data
                        </span>
                      </div>
                    </>
                  )}
                  <div className="relative ml-auto flex items-center">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onStar(base);
                      }}
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center transition-all ${
                        base.starred || openMenuBaseId === base.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <StarIco size={16} active={base.starred} />
                    </button>
                    <button
                      type="button"
                      title="More options"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setOpenMenuBaseId((current) => (current === base.id ? null : base.id));
                      }}
                      className={`ml-1 flex h-5 items-center justify-center overflow-hidden text-[#707784] transition-all ${
                        openMenuBaseId === base.id ? "w-4 opacity-100" : "w-0 opacity-0 group-hover:w-4 group-hover:opacity-100"
                      }`}
                    >
                      <ThreeDotsIco size={14} />
                    </button>

                    {openMenuBaseId === base.id ? (
                      <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[240px] rounded-[8px] border border-[#d0d4da] bg-white py-2 shadow-[0_8px_24px_rgba(16,24,40,0.16)]">
                        <ul className="m-0 list-none p-0">
                          <MenuItem icon={<RenameMenuIco />} label="Rename" onClick={() => runAndClose(() => onRename(base))} />
                          <MenuItem icon={<DuplicateMenuIco />} label="Duplicate" onClick={() => runAndClose(() => onDuplicate?.(base))} />
                          <MenuItem icon={<MoveMenuIco />} label="Move" onClick={() => runAndClose(() => onMove(base))} />
                          <MenuItem icon={<GoToWorkspaceMenuIco />} label="Go to workspace" onClick={() => runAndClose(() => onGoToWorkspace?.(base))} />
                          <MenuItem icon={<CustomizeMenuIco />} label="Customize appearance" onClick={() => runAndClose(() => onCustomizeAppearance?.(base))} />
                          <li className="my-1 h-px bg-[#e7e9ee]" />
                          <MenuItem icon={<DeleteMenuIco />} label="Delete" onClick={() => runAndClose(() => onDelete(base.id))} danger />
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={`grid items-center gap-6 ${metadataCols}`}>
                  <span className="truncate whitespace-nowrap text-[13px] leading-[18px] text-[#4f5561]">{timeAgo(base.lastOpenedAt)}</span>
                  {showWorkspace ? <span className="truncate whitespace-nowrap text-[13px] leading-[18px] text-[#4f5561]">{base.workspace?.name ?? "-"}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null,
      )}
    </div>
  );
}
