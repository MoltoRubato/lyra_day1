import Link from "next/link";
import { timeAgo } from "~/app/_components/home/helpers";
import { MoveIco, PencilIco, StarIco, TrashIco } from "~/app/_components/home/icons";
import type { BaseItem, WorkspaceBaseItem, WsFull } from "~/app/_components/home/types";
import { ActionBtn, BaseIcon, WorkspaceIcon } from "~/app/_components/home/ui";

export function WorkspacesOverview({
  workspaces, allBases, onNavigate, onCreateBase, onCreateWorkspace,
  onRenameWs, onEditDesc, onDeleteWs, onStarWs,
  onRenameBase, onDeleteBase, onStarBase, onMoveBase,
}: {
  workspaces: WsFull[];
  allBases: BaseItem[];
  onNavigate: (p: string) => void;
  onCreateBase: (wsId: string) => void;
  onCreateWorkspace: () => void;
  onRenameWs: (ws: WsFull) => void;
  onEditDesc: (ws: WsFull) => void;
  onDeleteWs: (id: string) => void;
  onStarWs: (ws: WsFull) => void;
  onRenameBase: (b: BaseItem | WorkspaceBaseItem) => void;
  onDeleteBase: (id: string) => void;
  onStarBase: (b: BaseItem | WorkspaceBaseItem) => void;
  onMoveBase: (b: BaseItem | WorkspaceBaseItem) => void;
}) {
  const unassigned = allBases.filter((b) => !b.workspaceId);

  if (workspaces.length === 0 && unassigned.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#aaa]">
        <p className="text-[13px] mb-4">No workspaces yet.</p>
        <button onClick={onCreateWorkspace}
          className="text-[12px] bg-[#0069ff] hover:bg-[#0055d4] text-white px-4 py-2 rounded transition-colors font-medium">
          + Create workspace
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {workspaces.map((ws) => (
        <section key={ws.id}>
          <div className="group flex items-center gap-3 mb-3">
            <WorkspaceIcon size={32}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-[#172b4d]">{ws.name}</span>
                <button onClick={() => onStarWs(ws)}
                  className={`text-sm transition-all ${
                    ws.starred ? "text-yellow-400" : "opacity-0 group-hover:opacity-100 text-[#ddd] hover:text-yellow-400"
                  }`}><StarIco size={16} active={ws.starred} /></button>
              </div>
              {ws.description && <p className="text-[12px] text-[#888] mt-0.5">{ws.description}</p>}
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <ActionBtn title="Rename" onClick={() => onRenameWs(ws)}><PencilIco/></ActionBtn>
              <ActionBtn title="Edit description" onClick={() => onEditDesc(ws)}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <circle cx="6" cy="6" r="4.5"/><path d="M6 4v4M4 6h4"/>
                </svg>
              </ActionBtn>
              <ActionBtn title="Create base here" onClick={() => onCreateBase(ws.id)}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5.5 1v9M1 5.5h9"/></svg>
              </ActionBtn>
              <ActionBtn title="Delete workspace" danger onClick={() => onDeleteWs(ws.id)}><TrashIco/></ActionBtn>
            </div>
            <button onClick={() => onNavigate(ws.id)}
              className="text-[12px] text-[#0069ff] hover:underline flex-shrink-0 ml-2 font-medium">
              View workspace
            </button>
          </div>

          {ws.bases.length === 0 ? (
            <p className="ml-[44px] text-[12px] text-[#aaa] py-2">
              No bases.{" "}
              <button onClick={() => onCreateBase(ws.id)} className="text-[#0069ff] hover:underline">Create one</button>
            </p>
          ) : (
            <div className="ml-[44px] space-y-0">
              {ws.bases.slice(0, 6).map((base) => (
                <div key={base.id} className="group/row flex items-center gap-2.5 py-1.5 px-1 rounded hover:bg-white transition-colors -mx-1">
                  <BaseIcon base={base} size={22}/>
                  {base.id.startsWith("temp-") ? (
                    <span className="flex-1 min-w-0 text-[13px] font-medium text-[#9ca3af] truncate flex items-center gap-1.5">
                      {base.name}
                      <span className="w-2 h-2 border border-[#ccc] border-t-[#888] rounded-full animate-spin flex-shrink-0 inline-block"/>
                    </span>
                  ) : (
                    <Link href={`/base/${base.id}`}
                      className="flex-1 min-w-0 text-[13px] font-medium text-[#172b4d] hover:text-[#0069ff] truncate transition-colors">
                      {base.name}
                    </Link>
                  )}
                  <span className="text-[11px] text-[#bbb] flex-shrink-0">{timeAgo(base.lastOpenedAt)}</span>
                  <div className="flex items-center gap-0 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => onStarBase(base)}
                      className={`px-1 text-sm transition-colors ${base.starred ? "text-yellow-400" : "text-[#ddd] hover:text-yellow-400"}`}><StarIco size={16} active={base.starred} /></button>
                    <ActionBtn title="Rename" onClick={() => onRenameBase(base)}><PencilIco size={10}/></ActionBtn>
                    <ActionBtn title="Move workspace" onClick={() => onMoveBase(base)}><MoveIco size={10}/></ActionBtn>
                    <ActionBtn title="Delete" danger onClick={() => onDeleteBase(base.id)}><TrashIco size={10}/></ActionBtn>
                  </div>
                </div>
              ))}
              {ws.bases.length > 6 && (
                <button onClick={() => onNavigate(ws.id)} className="ml-[30px] text-[12px] text-[#0069ff] hover:underline py-1">
                  +{ws.bases.length - 6} more — View workspace
                </button>
              )}
            </div>
          )}
          <div className="border-b border-[#e0e0e0] mt-5"/>
        </section>
      ))}

      {unassigned.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-3">No workspace</p>
          <div className="space-y-0">
            {unassigned.map((base) => (
              <div key={base.id} className="group/row flex items-center gap-2.5 py-1.5 px-1 rounded hover:bg-white transition-colors -mx-1">
                <BaseIcon base={base} size={22}/>
                {base.id.startsWith("temp-") ? (
                  <span className="flex-1 min-w-0 text-[13px] font-medium text-[#9ca3af] truncate flex items-center gap-1.5">
                    {base.name}
                    <span className="w-2 h-2 border border-[#ccc] border-t-[#888] rounded-full animate-spin flex-shrink-0 inline-block"/>
                  </span>
                ) : (
                  <Link href={`/base/${base.id}`}
                    className="flex-1 min-w-0 text-[13px] font-medium text-[#172b4d] hover:text-[#0069ff] truncate transition-colors">
                    {base.name}
                  </Link>
                )}
                <span className="text-[11px] text-[#bbb] flex-shrink-0">{timeAgo(base.lastOpenedAt)}</span>
                <div className="flex items-center gap-0 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                  <ActionBtn title="Move workspace" onClick={() => onMoveBase(base)}><MoveIco size={10}/></ActionBtn>
                  <ActionBtn title="Delete" danger onClick={() => onDeleteBase(base.id)}><TrashIco size={10}/></ActionBtn>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

