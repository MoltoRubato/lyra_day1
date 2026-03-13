import type { ViewType } from "@prisma/client";
import { VIEW_META } from "~/app/base/_components/basePagePrimitives";
import type { BasePageShellProps } from "~/app/base/_components/basePageTypes";

type BaseViewSidebarProps = Pick<
  BasePageShellProps,
  | "viewSidebarOpen"
  | "activeView"
  | "setAddingView"
  | "setNewViewName"
  | "views"
  | "renamingView"
  | "setRenamingView"
  | "getViewConfig"
  | "commitViewRename"
  | "setActiveViewId"
  | "deleteView"
  | "addingView"
  | "newViewName"
  | "handleAddView"
  | "newViewType"
  | "setNewViewType"
>;

export function BaseViewSidebar({
  viewSidebarOpen,
  activeView,
  setAddingView,
  setNewViewName,
  views,
  renamingView,
  setRenamingView,
  getViewConfig,
  commitViewRename,
  setActiveViewId,
  deleteView,
  addingView,
  newViewName,
  handleAddView,
  newViewType,
  setNewViewType,
}: BaseViewSidebarProps) {
  return (
    <aside
      className={`flex flex-shrink-0 flex-col overflow-hidden border-r border-[#e0e0e0] bg-white transition-all duration-200 ${viewSidebarOpen ? "w-[248px]" : "w-0"}`}
    >
      {activeView && (
        <div className="flex min-w-0 flex-shrink-0 items-center gap-1 border-b border-[#e0e0e0] px-2 py-1.5">
          <button className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-1 transition-colors hover:bg-[#f0f0ef]">
            <span
              className="flex-shrink-0"
              style={{ color: VIEW_META[activeView.type]?.color ?? "#166a5b" }}
            >
              {VIEW_META[activeView.type]?.icon}
            </span>
            <span className="truncate text-[12px] font-semibold text-[#172b4d]">
              {activeView.name}
            </span>
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="flex-shrink-0 text-[#888]"
            >
              <path d="M2.5 4l2.5 2.5L7.5 4" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-shrink-0 border-b border-[#e0e0e0] px-2 py-1.5">
        <button
          onClick={() => {
            setAddingView(true);
            setNewViewName("");
          }}
          className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[12px] font-medium text-[#444] transition-colors hover:bg-[#f5f5f4]"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="M6 1v10M1 6h10" />
          </svg>
          Create new…
        </button>
      </div>

      <div className="flex-shrink-0 border-b border-[#e0e0e0] px-2 py-1.5">
        <div className="flex items-center gap-2 rounded bg-[#f5f5f4] px-2 py-1 text-[12px] text-[#aaa]">
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <circle cx="5" cy="5" r="3.5" />
            <path d="M8 8L10 10" />
          </svg>
          Find a view
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {views.map((view) => {
          const isActive = activeView?.id === view.id;
          const isRenaming = renamingView?.id === view.id;
          const meta = VIEW_META[view.type];
          const vcfg = getViewConfig(view.id);
          const hasActive =
            vcfg.filters.length > 0 ||
            vcfg.sorts.length > 0 ||
            vcfg.groups.length > 0 ||
            Object.values(vcfg.hiddenFields).some(Boolean);
          return (
            <div
              key={view.id}
              className={`group/view mx-1 flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors ${
                isActive
                  ? "border-l-2 border-[#166a5b] bg-[#eaf3f1]"
                  : "hover:bg-[#f5f5f4]"
              }`}
              style={isActive ? { borderRadius: "0 6px 6px 0" } : {}}
              onClick={() => setActiveViewId(view.id)}
            >
              <span
                className="flex-shrink-0"
                style={{ color: isActive ? meta?.color : "#999" }}
              >
                {meta?.icon}
              </span>
              {isRenaming ? (
                <input
                  autoFocus
                  value={renamingView.value}
                  className="min-w-0 flex-1 rounded border border-[#0069ff] bg-white px-1.5 py-0.5 text-[12px] outline-none"
                  onChange={(e) =>
                    setRenamingView({
                      ...renamingView,
                      value: e.target.value,
                    })
                  }
                  onClick={(e) => e.stopPropagation()}
                  onBlur={commitViewRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitViewRename();
                    if (e.key === "Escape") setRenamingView(null);
                  }}
                />
              ) : (
                <span
                  className={`flex-1 truncate text-[12px] ${isActive ? "font-medium text-[#172b4d]" : "text-[#444]"}`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenamingView({ id: view.id, value: view.name });
                  }}
                >
                  {view.name}
                </span>
              )}
              {hasActive && !isRenaming && (
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0069ff]" />
              )}
              {!isRenaming && views.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteView.mutate({ viewId: view.id });
                  }}
                  className="flex-shrink-0 text-[10px] text-[#ccc] opacity-0 transition-all group-hover/view:opacity-100 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {addingView && (
        <div className="flex-shrink-0 space-y-2 border-t border-[#e0e0e0] p-3">
          <input
            autoFocus
            value={newViewName}
            placeholder="View name…"
            className="w-full rounded border border-[#0069ff] bg-white px-2 py-1.5 text-[12px] outline-none"
            onChange={(e) => setNewViewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddView();
              if (e.key === "Escape") setAddingView(false);
            }}
          />
          <div className="flex gap-1">
            {(["GRID", "KANBAN"] as ViewType[]).map((t) => {
              const m = VIEW_META[t];
              return (
                <button
                  key={t}
                  onClick={() => setNewViewType(t)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    newViewType === t
                      ? "border-[#0069ff] bg-[#f0f7ff] text-[#0069ff]"
                      : "border-[#e0e0e0] text-[#666] hover:border-[#ccc]"
                  }`}
                >
                  <span
                    style={{ color: newViewType === t ? m?.color : "#aaa" }}
                  >
                    {m?.icon}
                  </span>
                  {t === "GRID" ? "Grid" : "Kanban"}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleAddView}
              className="flex-1 rounded bg-[#0069ff] py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#0055d4]"
            >
              Add view
            </button>
            <button
              onClick={() => setAddingView(false)}
              className="rounded border border-[#e0e0e0] px-2 py-1.5 text-[11px] text-[#888] transition-colors hover:bg-[#f5f5f4]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
