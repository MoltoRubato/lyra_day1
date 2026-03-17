import Link from "next/link";

import { timeAgo } from "~/app/_components/home/helpers";
import { MoveIco, PencilIco, StarIco, TrashIco } from "~/app/_components/home/icons";
import type { BaseItem } from "~/app/_components/home/types";
import { ActionBtn, BaseIcon } from "~/app/_components/home/ui";

export function BaseListView({
  bases,
  showWorkspace,
  onRename,
  onDelete,
  onStar,
  onMove,
}: {
  bases: BaseItem[];
  showWorkspace: boolean;
  onRename: (b: BaseItem) => void;
  onDelete: (id: string) => void;
  onStar: (b: BaseItem) => void;
  onMove: (b: BaseItem) => void;
}) {
  const cols = showWorkspace ? "grid-cols-[1fr_240px_240px_96px]" : "grid-cols-[1fr_240px_96px]";

  return (
    <div>
      <div className={`grid items-center border-b border-[#d6dae1] px-2 py-3 text-[14px] font-medium text-[#6f7682] ${cols}`}>
        <span className="pl-1">Name</span>
        <span>Last opened</span>
        {showWorkspace ? <span>Workspace</span> : null}
        <span />
      </div>

      {bases.map((base) => (
        <div
          key={base.id}
          className={`group -mx-1 grid items-center rounded-sm border-b border-[#ebebeb] px-2 py-3 transition-colors hover:bg-white ${cols}`}
        >
          <div className="flex min-w-0 items-center gap-3 pr-4">
            <BaseIcon base={base} size={30} />

            {base.id.startsWith("temp-") ? (
              <span className="flex items-center gap-1.5 truncate text-[14px] font-medium text-[#9ca3af]">
                {base.name}
                <span className="h-2.5 w-2.5 flex-shrink-0 animate-spin rounded-full border border-[#ccc] border-t-[#888]" />
              </span>
            ) : (
              <Link
                href={`/base/${base.id}`}
                className="truncate text-[14px] font-semibold text-[#172b4d] transition-colors hover:text-[#0069ff]"
              >
                {base.name}
              </Link>
            )}

            <button
              onClick={() => onStar(base)}
              className={`flex-shrink-0 text-[13px] transition-all ${
                base.starred ? "text-yellow-400" : "text-[#ddd] opacity-0 group-hover:opacity-100 hover:text-yellow-400"
              }`}
            >
              <StarIco />
            </button>
          </div>

          <span className="text-[13px] text-[#6f7682]">{timeAgo(base.lastOpenedAt)}</span>
          {showWorkspace ? <span className="text-[13px] text-[#555]">{base.workspace?.name ?? "-"}</span> : null}

          <div className="flex items-center justify-end gap-0 opacity-0 transition-opacity group-hover:opacity-100">
            <ActionBtn title="Rename" onClick={() => onRename(base)}>
              <PencilIco />
            </ActionBtn>
            <ActionBtn title="Move workspace" onClick={() => onMove(base)}>
              <MoveIco />
            </ActionBtn>
            <ActionBtn title="Delete" danger onClick={() => onDelete(base.id)}>
              <TrashIco />
            </ActionBtn>
          </div>
        </div>
      ))}
    </div>
  );
}
