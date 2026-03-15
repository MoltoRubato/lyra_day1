"use client";
import { useState } from "react";
import type { ViewType } from "@prisma/client";
import type { ViewConfig } from "~/app/_components/ViewToolbar";

const VIEW_META: Record<string, { icon: React.ReactNode; color: string }> = {
  GRID: {
    color: "#166a5b",
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1" y="1" width="5" height="5" rx="0.5" />
        <rect x="8" y="1" width="5" height="5" rx="0.5" />
        <rect x="1" y="8" width="5" height="5" rx="0.5" />
        <rect x="8" y="8" width="5" height="5" rx="0.5" />
      </svg>
    ),
  },
  KANBAN: {
    color: "#9b59b6",
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1" y="1" width="3.5" height="12" rx="0.5" />
        <rect x="5.25" y="1" width="3.5" height="8" rx="0.5" />
        <rect x="9.5" y="1" width="3.5" height="10" rx="0.5" />
      </svg>
    ),
  },
};

type ViewSidebarProps = {
  open: boolean;
  views: Array<{ id: string; name: string; type: ViewType }>;
  activeViewId: string | null;
  getViewConfig: (viewId: string) => ViewConfig;
  onSelectView: (viewId: string) => void;
  onRenameView: (viewId: string, name: string) => void;
  onDeleteView: (viewId: string) => void;
  onCreateView: (name: string, type: ViewType) => void;
};

export function ViewSidebar({
  open,
  views,
  activeViewId,
  getViewConfig,
  onSelectView,
  onRenameView,
  onDeleteView,
  onCreateView,
}: ViewSidebarProps) {
  const [renamingView, setRenamingView] = useState<{ id: string; value: string } | null>(null);
  const [addingView, setAddingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewType, setNewViewType] = useState<ViewType>("GRID");

  function commitViewRename() {
    if (!renamingView?.value.trim()) {
      setRenamingView(null);
      return;
    }
    onRenameView(renamingView.id, renamingView.value.trim());
    setRenamingView(null);
  }

  function handleAddView() {
    if (!newViewName.trim()) return;
    onCreateView(newViewName.trim(), newViewType);
    setNewViewName("");
    setAddingView(false);
  }

  return (
    <aside
      className={`flex-shrink-0 bg-white border-r border-[#e0e0e0] flex flex-col transition-all duration-200 overflow-hidden ${open ? "w-[248px]" : "w-0"}`}
    >
      <div className="px-2 py-1.5 border-b border-[#e0e0e0] flex-shrink-0">
        <button
          onClick={() => {
            setAddingView(true);
            setNewViewName("");
          }}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[12px] text-[#444] font-medium hover:bg-[#f5f5f4] rounded transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M6 1v10M1 6h10" />
          </svg>
          Create new…
        </button>
      </div>

      <div className="px-2 py-1.5 border-b border-[#e0e0e0] flex-shrink-0">
        <div className="flex items-center gap-2 px-2 py-1 bg-[#f5f5f4] rounded text-[12px] text-[#aaa]">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="5" cy="5" r="3.5" />
            <path d="M8 8L10 10" />
          </svg>
          Find a view
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {views.map((view) => {
          const isActive = activeViewId === view.id;
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
              className={`group/view flex items-center gap-2 mx-1 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                isActive ? "bg-[#eaf3f1] border-l-2 border-[#166a5b]" : "hover:bg-[#f5f5f4]"
              }`}
              style={isActive ? { borderRadius: "0 6px 6px 0" } : {}}
              onClick={() => onSelectView(view.id)}
            >
              <span className="flex-shrink-0" style={{ color: isActive ? meta?.color : "#999" }}>
                {meta?.icon}
              </span>
              {isRenaming ? (
                <input
                  autoFocus
                  value={renamingView.value}
                  className="flex-1 bg-white border border-[#0069ff] rounded px-1.5 py-0.5 text-[12px] outline-none min-w-0"
                  onChange={(e) => setRenamingView({ ...renamingView, value: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={commitViewRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitViewRename();
                    if (e.key === "Escape") setRenamingView(null);
                  }}
                />
              ) : (
                <span
                  className={`flex-1 text-[12px] truncate ${isActive ? "text-[#172b4d] font-medium" : "text-[#444]"}`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenamingView({ id: view.id, value: view.name });
                  }}
                >
                  {view.name}
                </span>
              )}
              {hasActive && !isRenaming && <span className="w-1.5 h-1.5 rounded-full bg-[#0069ff] flex-shrink-0" />}
              {!isRenaming && views.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteView(view.id);
                  }}
                  className="opacity-0 group-hover/view:opacity-100 text-[#ccc] hover:text-red-400 text-[10px] flex-shrink-0 transition-all"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {addingView && (
        <div className="border-t border-[#e0e0e0] p-3 space-y-2 flex-shrink-0">
          <input
            autoFocus
            value={newViewName}
            placeholder="View name…"
            className="w-full bg-white border border-[#0069ff] rounded px-2 py-1.5 text-[12px] outline-none"
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
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border text-[11px] font-medium transition-colors ${
                    newViewType === t ? "border-[#0069ff] text-[#0069ff] bg-[#f0f7ff]" : "border-[#e0e0e0] text-[#666] hover:border-[#ccc]"
                  }`}
                >
                  <span style={{ color: newViewType === t ? m?.color : "#aaa" }}>{m?.icon}</span>
                  {t === "GRID" ? "Grid" : "Kanban"}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleAddView}
              className="flex-1 py-1.5 bg-[#0069ff] hover:bg-[#0055d4] text-white rounded text-[11px] font-medium transition-colors"
            >
              Add view
            </button>
            <button
              onClick={() => setAddingView(false)}
              className="px-2 py-1.5 border border-[#e0e0e0] text-[#888] rounded text-[11px] hover:bg-[#f5f5f4] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
