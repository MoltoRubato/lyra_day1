import Link from "next/link";
import { timeAgo } from "~/app/_components/home/helpers";
import { StarIco, WsIco } from "~/app/_components/home/icons";
import type { BaseItem, WsFull } from "~/app/_components/home/types";
import { BaseIcon } from "~/app/_components/home/ui";

type StarredViewsProps = {
  bases: BaseItem[];
  workspaces: WsFull[];
  onStarBase: (b: BaseItem) => void;
  onStarWorkspace: (w: WsFull) => void;
  onOpenWorkspace: (workspaceId: string) => void;
};

type StarredItem =
  | { kind: "workspace"; id: string; name: string; workspace: WsFull }
  | { kind: "base"; id: string; name: string; base: BaseItem };

function sortByRecent(bases: BaseItem[]) {
  return [...bases].sort((a, b) => {
    const at = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
    const bt = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
    return bt - at;
  });
}

function workspaceBadge() {
  return (
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] bg-[#edf0f4] text-[#1d1f25]">
      <WsIco size={16} />
    </span>
  );
}

export function StarredListView({
  bases,
  workspaces,
  onStarBase,
  onStarWorkspace,
  onOpenWorkspace,
}: StarredViewsProps) {
  const items: StarredItem[] = [
    ...workspaces.map((workspace) => ({ kind: "workspace" as const, id: workspace.id, name: workspace.name, workspace })),
    ...sortByRecent(bases).map((base) => ({ kind: "base" as const, id: base.id, name: base.name, base })),
  ];

  return (
    <div>
      <div className="grid h-11 grid-cols-[500px_1fr_1fr_1fr] items-center gap-6 border-b border-[#d6dae1] px-2 text-[13px] leading-[18px] text-[#6f7682]">
        <span className="pl-1">Name</span>
        <span>Type</span>
        <span>Last opened</span>
        <span>Workspace</span>
      </div>
      <div className="pt-2">
        {items.map((item) => (
          <div
            key={`${item.kind}-${item.id}`}
            className="mx-1 grid h-11 grid-cols-[500px_1fr_1fr_1fr] items-center gap-6 rounded-[6px] px-2 text-[13px] leading-[18px] text-[#1d1f25] transition-colors hover:bg-[#eceef0]"
          >
            <div className="flex min-w-0 items-center gap-3">
              {item.kind === "workspace" ? workspaceBadge() : <BaseIcon base={item.base} size={28} />}
              {item.kind === "workspace" ? (
                <button
                  type="button"
                  onClick={() => onOpenWorkspace(item.workspace.id)}
                  className="min-w-0 flex-1 truncate text-left text-[13px] font-normal leading-[18px] text-[#1d1f25]"
                >
                  {item.name}
                </button>
              ) : (
                <Link
                  href={`/base/${item.base.id}`}
                  className="min-w-0 flex-1 truncate text-[13px] font-normal leading-[18px] text-[#1d1f25]"
                >
                  {item.name}
                </Link>
              )}
              <button
                type="button"
                onClick={() => (item.kind === "workspace" ? onStarWorkspace(item.workspace) : onStarBase(item.base))}
                className="ml-auto flex h-5 w-5 items-center justify-center"
              >
                <StarIco size={16} active />
              </button>
            </div>

            <span className="truncate text-[13px] leading-[18px] text-[#4f5561]">
              {item.kind === "workspace" ? "Workspace" : "App"}
            </span>
            <span className="truncate text-[13px] leading-[18px] text-[#4f5561]">
              {item.kind === "workspace" ? "Not opened recently" : timeAgo(item.base.lastOpenedAt)}
            </span>
            <span className="truncate text-[13px] leading-[18px] text-[#4f5561]">
              {item.kind === "workspace" ? "" : item.base.workspace?.name ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StarredGridView({
  bases,
  workspaces,
  onStarBase,
  onStarWorkspace,
  onOpenWorkspace,
}: StarredViewsProps) {
  const items: StarredItem[] = [
    ...workspaces.map((workspace) => ({ kind: "workspace" as const, id: workspace.id, name: workspace.name, workspace })),
    ...sortByRecent(bases).map((base) => ({ kind: "base" as const, id: base.id, name: base.name, base })),
  ];

  return (
    <div className="grid gap-4 pt-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
      {items.map((item) => (
        <div key={`${item.kind}-${item.id}`} className="rounded-[8px] border border-[#d6dae1] bg-white p-4">
          <div className="flex items-start gap-3">
            {item.kind === "workspace" ? (
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] bg-[#edf0f4] text-[#1d1f25]">
                <WsIco size={16} />
              </span>
            ) : (
              <BaseIcon base={item.base} size={48} />
            )}
            <div className="min-w-0 flex-1">
              {item.kind === "workspace" ? (
                <button
                  type="button"
                  onClick={() => onOpenWorkspace(item.workspace.id)}
                  className="w-full truncate text-left text-[24px] font-semibold leading-[28px] text-[#1d1f25]"
                >
                  {item.name}
                </button>
              ) : (
                <Link
                  href={`/base/${item.base.id}`}
                  className="block truncate text-[24px] font-semibold leading-[28px] text-[#1d1f25]"
                >
                  {item.name}
                </Link>
              )}
              <p className="mt-1 text-[13px] leading-[18px] text-[#66707d]">
                {item.kind === "workspace" ? "Workspace" : timeAgo(item.base.lastOpenedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => (item.kind === "workspace" ? onStarWorkspace(item.workspace) : onStarBase(item.base))}
              className="flex h-5 w-5 items-center justify-center"
            >
              <StarIco size={16} active />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
