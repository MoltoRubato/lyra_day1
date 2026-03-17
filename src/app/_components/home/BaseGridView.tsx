import Link from "next/link";
import { timeAgo } from "~/app/_components/home/helpers";
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
    <div className="grid gap-5 pt-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))" }}>
      {bases.map((base) => (
        <div key={base.id}
          className="group relative overflow-hidden rounded-[12px] border border-[#d8dadd] bg-white transition-all duration-150 hover:shadow-sm">
          <div className="p-6">
            <div className="mb-4 flex items-start gap-4">
              <BaseIcon base={base} size={80}/>
              <div className="min-w-0 flex-1 pt-1">
                {base.id.startsWith("temp-") ? (
                  <span className="flex items-center gap-1.5 truncate text-[17px] font-semibold leading-snug text-[#9ca3af]">
                    {base.name}
                    <span className="w-2.5 h-2.5 border border-[#ccc] border-t-[#888] rounded-full animate-spin flex-shrink-0 inline-block"/>
                  </span>
                ) : (
                  <Link href={`/base/${base.id}`}
                    className="block truncate text-[17px] font-semibold leading-snug text-[#172b4d] transition-colors hover:text-[#0069ff]">
                    {base.name}
                  </Link>
                )}
                <p className="mt-2 truncate text-[15px] text-[#6b7280]">
                  {timeAgo(base.lastOpenedAt)}
                </p>
              </div>
              <button onClick={() => onStar(base)}
                className={`text-[14px] flex-shrink-0 mt-0.5 transition-all ${
                  base.starred ? "text-yellow-400" : "opacity-0 group-hover:opacity-100 text-[#ddd] hover:text-yellow-400"
                }`}><StarIco/></button>
            </div>
            <div className="flex items-center justify-end border-t border-[#eceff3] pt-3">
              <div className="flex items-center gap-0 opacity-0 transition-opacity group-hover:opacity-100">
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

