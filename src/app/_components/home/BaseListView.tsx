import Link from "next/link";
import { groupByTime, timeAgo } from "~/app/_components/home/helpers";
import { MoveIco, PencilIco, StarIco, TrashIco } from "~/app/_components/home/icons";
import type { BaseItem } from "~/app/_components/home/types";
import { ActionBtn, BaseIcon } from "~/app/_components/home/ui";

export function BaseListView({ bases, showWorkspace, onRename, onDelete, onStar, onMove }: {
  bases: BaseItem[];
  showWorkspace: boolean;
  onRename: (b: BaseItem) => void;
  onDelete: (id: string) => void;
  onStar: (b: BaseItem) => void;
  onMove: (b: BaseItem) => void;
}) {
  const groups = groupByTime(bases);
  const cols = showWorkspace ? "grid-cols-[1fr_180px_160px_88px]" : "grid-cols-[1fr_180px_88px]";

  return (
    <div>
      <div className={`grid items-center px-1 py-2 text-[11px] font-medium text-[#888] border-b border-[#e0e0e0] ${cols}`}>
        <span className="pl-1">Name</span>
        <span>Last opened</span>
        {showWorkspace && <span>Workspace</span>}
        <span/>
      </div>

      {groups.map(({ label, items }) => (
        <div key={label}>
          <div className="px-1 pt-3 pb-1 text-[11px] font-medium text-[#888]">
            {label}
          </div>
          {items.map((base) => (
            <div key={base.id}
              className={`group grid items-center px-1 py-2 border-b border-[#ebebeb] hover:bg-white transition-colors -mx-1 rounded-sm ${cols}`}>
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                <BaseIcon base={base} size={24}/>
                {base.id.startsWith("temp-") ? (
                  <span className="text-[13px] font-medium text-[#9ca3af] truncate flex items-center gap-1.5">
                    {base.name}
                    <span className="w-2.5 h-2.5 border border-[#ccc] border-t-[#888] rounded-full animate-spin flex-shrink-0"/>
                  </span>
                ) : (
                  <Link href={`/base/${base.id}`}
                    className="text-[13px] font-medium text-[#172b4d] hover:text-[#0069ff] truncate transition-colors">
                    {base.name}
                  </Link>
                )}
                <button onClick={() => onStar(base)}
                  className={`text-[13px] flex-shrink-0 transition-all ${
                    base.starred ? "text-yellow-400" : "opacity-0 group-hover:opacity-100 text-[#ddd] hover:text-yellow-400"
                  }`}><StarIco/></button>
              </div>
              <span className="text-[12px] text-[#888]">{timeAgo(base.lastOpenedAt)}</span>
              {showWorkspace && <span className="text-[12px] text-[#555]">{base.workspace?.name ?? "—"}</span>}
              <div className="flex items-center justify-end gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionBtn title="Rename" onClick={() => onRename(base)}><PencilIco/></ActionBtn>
                <ActionBtn title="Move workspace" onClick={() => onMove(base)}><MoveIco/></ActionBtn>
                <ActionBtn title="Delete" danger onClick={() => onDelete(base.id)}><TrashIco/></ActionBtn>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

