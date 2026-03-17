"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ViewType } from "@prisma/client";
import type { ViewConfig } from "~/app/_components/ViewToolbar";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { StarIco } from "~/app/_components/home/icons";
import { AddViewModal, CreateViewMenu, ViewOptionsMenu } from "~/app/_components/base/ViewSidebarPanels";

const VIEW_META: Record<ViewType, { icon: React.ReactNode; color: string }> = {
  GRID: {
    color: "#2d7ff9",
    icon: <AirtableAssetIcon asset={236} alt="" size={16} tintColor="#2d7ff9" />,
  },
  KANBAN: {
    color: "#22c55e",
    icon: <AirtableAssetIcon asset={207} alt="" size={16} tintColor="#22c55e" />,
  },
};
const HollowStar = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 3l2.7 5.7 6.3.9-4.5 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L3 9.6l6.3-.9L12 3z" />
  </svg>
);

type ViewSidebarProps = {
  open: boolean;
  views: Array<{ id: string; name: string; type: ViewType }>;
  activeViewId: string | null;
  getViewConfig: (viewId: string) => ViewConfig;
  getViewDescription: (viewId: string) => string | null;
  tables: Array<{ id: string; name: string }>;
  activeTableId: string | null;
  favorites: Record<string, boolean>;
  onToggleFavorite: (viewId: string) => void;
  onDuplicateView: (viewId: string) => void;
  canDeleteView: (viewId: string) => boolean;
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
  getViewDescription,
  tables,
  activeTableId,
  favorites,
  onToggleFavorite,
  onDuplicateView,
  canDeleteView,
  onSelectView,
  onRenameView,
  onDeleteView,
  onCreateView,
}: ViewSidebarProps) {
  const [renamingView, setRenamingView] = useState<{ id: string; value: string } | null>(null);
  const [addingView, setAddingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewType, setNewViewType] = useState<ViewType>("GRID");
  const [query, setQuery] = useState("");
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createMenuAnchor, setCreateMenuAnchor] = useState<{ left: number; top: number; height: number } | null>(null);
  const [viewMenuOpen, setViewMenuOpen] = useState<{ id: string; left: number; top: number } | null>(null);
  const [deleteError, setDeleteError] = useState<{ left: number; top: number } | null>(null);
  const [hoveredViewId, setHoveredViewId] = useState<string | null>(null);
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [orderedViewIds, setOrderedViewIds] = useState<string[]>([]);
  const [draggingViewId, setDraggingViewId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [resizing, setResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);

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

  const q = query.trim().toLowerCase();
  useEffect(() => {
    setOrderedViewIds((prev) => {
      const ids = views.map((v) => v.id);
      if (!prev.length) return ids;
      const next = prev.filter((id) => ids.includes(id));
      const missing = ids.filter((id) => !next.includes(id));
      return [...next, ...missing];
    });
  }, [views]);

  const orderedViews = useMemo(() => {
    if (!orderedViewIds.length) return views;
    const map = new Map(views.map((v) => [v.id, v]));
    return orderedViewIds.map((id) => map.get(id)).filter(Boolean) as typeof views;
  }, [orderedViewIds, views]);

  const filteredViews = orderedViews.filter((v) => !q || v.name.toLowerCase().includes(q));
  const favoriteViews = filteredViews.filter((v) => favorites[v.id]);
  const otherTables = tables.filter((t) => t.id !== activeTableId);
  const otherViews = otherTables
    .map((t) => ({ id: `other-${t.id}`, name: `Grid view in ${t.name}` }))
    .filter((v) => !q || v.name.toLowerCase().includes(q));
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const createMenuLeft = createMenuAnchor ? Math.min(createMenuAnchor.left + 200, viewportW - 260) : 260;
  const createMenuTop = createMenuAnchor ? createMenuAnchor.top + createMenuAnchor.height + 6 : 120;
  const menuWidth = 240;
  const viewMenuLeft = viewMenuOpen ? Math.min(viewMenuOpen.left, viewportW - menuWidth - 12) : 12;

  useEffect(() => {
    if (!resizing) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (e: MouseEvent) => {
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const next = Math.max(220, Math.min(720, e.clientX - left));
      setSidebarWidth(next);
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [resizing]);

  return (
    <aside
      ref={sidebarRef}
      className={`relative flex-shrink-0 bg-white border-r border-[#e0e0e0] flex flex-col overflow-hidden ${open ? "" : "w-0"} ${resizing ? "" : "transition-all duration-200"}`}
      style={open ? { width: sidebarWidth } : {}}
    >
      <div className="px-2 py-1.5 flex-shrink-0">
        <button
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            setCreateMenuAnchor({ left: rect.left, top: rect.top, height: rect.height });
            setCreateMenuOpen((p) => !p);
          }}
          className="flex items-center gap-2 w-full px-2.5 py-2 text-[13px] text-[#222] font-medium rounded hover:bg-[#f5f5f4] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M7 2v10M2 7h10" />
          </svg>
          Create new...
        </button>
      </div>

      <CreateViewMenu
        open={createMenuOpen}
        left={createMenuLeft}
        top={createMenuTop}
        onClose={() => setCreateMenuOpen(false)}
        onSelectType={(type) => {
          if (type === "GRID" || type === "KANBAN") {
            setNewViewType(type);
            setAddingView(true);
            setNewViewName("");
          }
          setCreateMenuOpen(false);
        }}
      />
      <div className="px-2 py-1.5 flex-shrink-0">
        <div className="flex items-center gap-2 px-2 py-1 bg-white rounded text-[12px] text-[#666] hover:bg-[#f5f5f4] transition-colors">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="5" cy="5" r="3.5" />
            <path d="M8 8L10 10" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a view"
            className="flex-1 bg-transparent outline-none text-[12px] text-[#444] placeholder-[#aaa]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {favoriteViews.length > 0 && !q && (
          <div className="px-2 pt-2 pb-1">
            <button
              onClick={() => setFavoritesOpen((p) => !p)}
              className="w-full flex items-center gap-2 px-1.5 py-1 text-[12px] text-[#555] hover:text-[#222]"
            >
              <span className="text-yellow-400"><StarIco/></span>
              <span className="font-medium">My favorites</span>
              <span className="ml-auto text-[#999]">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className={`transition-transform ${favoritesOpen ? "rotate-90" : ""}`}>
                  <path d="M3 2l4 3-4 3" />
                </svg>
              </span>
            </button>
            <div className="mt-1 space-y-1">
              {(favoritesOpen ? favoriteViews : favoriteViews.slice(0, 1)).map((view) => (
                <div
                  key={`fav-${view.id}`}
                  className="flex items-center gap-2 mx-1 px-2 py-1.5 rounded cursor-pointer hover:bg-[#f5f5f4] text-[12px]"
                  onClick={() => onSelectView(view.id)}
                >
                  <span className="text-[#2d7ff9]">{VIEW_META.GRID.icon}</span>
                  <span className="truncate">{view.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {filteredViews.map((view) => {
          const isActive = activeViewId === view.id;
          const isRenaming = renamingView?.id === view.id;
          const meta = VIEW_META[view.type];
          const vcfg = getViewConfig(view.id);
          const desc = getViewDescription(view.id);
          const isFavorite = !!favorites[view.id];
          const isHovered = hoveredViewId === view.id;
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
              onMouseEnter={() => setHoveredViewId(view.id)}
              onMouseLeave={() => setHoveredViewId((prev) => (prev === view.id ? null : prev))}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                if (!draggingViewId || draggingViewId === view.id) return;
                setOrderedViewIds((prev) => {
                  const ids = prev.length ? [...prev] : views.map((v) => v.id);
                  const from = ids.indexOf(draggingViewId);
                  const to = ids.indexOf(view.id);
                  if (from === -1 || to === -1) return prev;
                  ids.splice(to, 0, ids.splice(from, 1)[0]!);
                  return ids;
                });
                setDraggingViewId(null);
              }}
            >
              {(isHovered || isFavorite) ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(view.id);
                  }}
                  className={`flex-shrink-0 ${isFavorite ? "text-yellow-400" : "text-[#c2c2c2] hover:text-yellow-400"}`}
                >
                  {isFavorite ? <StarIco/> : <HollowStar/>}
                </button>
              ) : (
                <span className="flex-shrink-0" style={{ color: isActive ? meta?.color : "#999" }}>
                  {meta?.icon}
                </span>
              )}
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
                <div
                  className="flex-1 min-w-0"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenamingView({ id: view.id, value: view.name });
                  }}
                >
                  <div className={`text-[12px] truncate ${isActive ? "text-[#172b4d] font-medium" : "text-[#444]"}`}>
                    {view.name}
                  </div>
                  {desc && <div className="text-[11px] text-[#999] truncate">{desc}</div>}
                </div>
              )}
              <div className={`ml-auto flex items-center gap-2 ${isHovered || viewMenuOpen?.id === view.id ? "opacity-100" : "opacity-0"} transition-opacity`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                    setViewMenuOpen({ id: view.id, left: rect.left - 130, top: rect.top });
                    setDeleteError(null);
                  }}
                  className="text-[#9aa0a6] hover:text-[#6b7280]"
                  title="View options"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <circle cx="3" cy="7" r="1.1" />
                    <circle cx="7" cy="7" r="1.1" />
                    <circle cx="11" cy="7" r="1.1" />
                  </svg>
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#9aa0a6] hover:text-[#6b7280]"
                  title="Reorder"
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggingViewId(view.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDraggingViewId(null)}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <circle cx="4" cy="4" r="1" />
                    <circle cx="10" cy="4" r="1" />
                    <circle cx="4" cy="7" r="1" />
                    <circle cx="10" cy="7" r="1" />
                    <circle cx="4" cy="10" r="1" />
                    <circle cx="10" cy="10" r="1" />
                  </svg>
                </button>
              </div>
              {hasActive && !isRenaming && <span className="w-1.5 h-1.5 rounded-full bg-[#0069ff] flex-shrink-0" />}
            </div>
          );
        })}
        {q && otherViews.length > 0 && (
          <div className="px-3 pt-3 pb-1 text-[11px] text-[#9aa0a6]">
            {otherViews.length} views from other tables
          </div>
        )}
        {q && otherViews.map((view) => (
          <div key={view.id} className="mx-1 px-2 py-1.5 rounded hover:bg-[#f5f5f4] flex items-center gap-2 text-[12px] text-[#444]">
            <span className="text-[#2d7ff9]">
              {VIEW_META.GRID.icon}
            </span>
            <span className="truncate">{view.name}</span>
          </div>
        ))}
      </div>

      <ViewOptionsMenu
        open={!!viewMenuOpen}
        left={viewMenuLeft}
        top={(viewMenuOpen?.top ?? 0) + 18}
        favorites={favorites}
        viewId={viewMenuOpen?.id ?? ""}
        onClose={() => { setViewMenuOpen(null); setDeleteError(null); }}
        onToggleFavorite={onToggleFavorite}
        onRename={(id) => {
          const v = views.find((it) => it.id === id);
          if (v) setRenamingView({ id: v.id, value: v.name });
        }}
        onDuplicate={onDuplicateView}
        canDelete={!!viewMenuOpen && canDeleteView(viewMenuOpen.id)}
        onDelete={(id) => {
          if (!canDeleteView(id)) {
            setDeleteError({ left: viewMenuLeft + 230, top: (viewMenuOpen?.top ?? 0) + 118 });
            return false;
          }
          onDeleteView(id);
          setViewMenuOpen(null);
          return true;
        }}
      />

      {deleteError && (
        <div
          className="fixed z-40 bg-[#2f3437] text-white text-[11px] px-3 py-2 rounded shadow-lg"
          style={{ left: deleteError.left, top: deleteError.top }}
        >
          You can’t delete a view when it’s the only grid view left in the table.
        </div>
      )}

      <AddViewModal
        open={addingView}
        name={newViewName}
        setName={setNewViewName}
        onClose={() => setAddingView(false)}
        onSubmit={handleAddView}
        left={sidebarWidth + 12}
      />
      {open && (
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20"
          onMouseDown={() => setResizing(true)}
        />
      )}
      {open && (
        <div className="absolute right-0 top-0 bottom-0 w-px bg-[#d8d8d8] z-10 pointer-events-none" />
      )}
    </aside>
  );
}
