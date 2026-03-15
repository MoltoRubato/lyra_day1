import Link from "next/link";
import { fallbackColor, timeAgo } from "~/app/_components/home/helpers";
import { MoveIco, PencilIco, StarIco, TrashIco } from "~/app/_components/home/icons";
import type { BaseItem } from "~/app/_components/home/types";
import { ActionBtn, BaseIcon } from "~/app/_components/home/ui";

export function BaseGridView({ bases, onRename, onDelete, onStar, onMove }: {
  bases: BaseItem[];
  onRename: (b: BaseItem) => void;
  onDelete: (id: string) => void;
  onStar: (b: BaseItem) => void;
  onMove: (b: BaseItem) => void;
}) {
  return (
    <div className="pt-4 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      {bases.map((base) => (
        <div key={base.id}
          className="group relative bg-white border border-[#e0e0e0] rounded-xl overflow-hidden hover:shadow-md transition-all duration-150">
          <div className="h-[6px]" style={{ background: base.color ?? fallbackColor(base.id) }}/>
          <div className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <BaseIcon base={base} size={34}/>
              <div className="flex-1 min-w-0 pt-0.5">
                {base.id.startsWith("temp-") ? (
                  <span className="text-[13px] font-semibold text-[#9ca3af] block truncate leading-snug flex items-center gap-1.5">
                    {base.name}
                    <span className="w-2.5 h-2.5 border border-[#ccc] border-t-[#888] rounded-full animate-spin flex-shrink-0 inline-block"/>
                  </span>
                ) : (
                  <Link href={`/base/${base.id}`}
                    className="text-[13px] font-semibold text-[#172b4d] hover:text-[#0069ff] block truncate transition-colors leading-snug">
                    {base.name}
                  </Link>
                )}
                {base.workspace && <p className="text-[11px] text-[#888] truncate mt-0.5">{base.workspace.name}</p>}
              </div>
              <button onClick={() => onStar(base)}
                className={`text-[14px] flex-shrink-0 mt-0.5 transition-all ${
                  base.starred ? "text-yellow-400" : "opacity-0 group-hover:opacity-100 text-[#ddd] hover:text-yellow-400"
                }`}><StarIco/></button>
            </div>
            <div className="flex items-center justify-between border-t border-[#f0f0f0] pt-2.5">
              <span className="text-[11px] text-[#aaa]">{timeAgo(base.lastOpenedAt)}</span>
              <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionBtn title="Rename" onClick={() => onRename(base)}><PencilIco size={10}/></ActionBtn>
                <ActionBtn title="Move" onClick={() => onMove(base)}><MoveIco size={10}/></ActionBtn>
                <ActionBtn title="Delete" danger onClick={() => onDelete(base.id)}><TrashIco size={10}/></ActionBtn>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

