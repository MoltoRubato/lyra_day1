"use client";
// src/app/base/[baseId]/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { useState, use, useEffect, useRef } from "react";
import { useIsMutating } from "@tanstack/react-query";
import GridView from "~/app/_components/GridView";
import KanbanView from "~/app/_components/KanbanView";
import ViewToolbar, {
  DEFAULT_VIEW_CONFIG,
  type ViewConfig,
} from "~/app/_components/ViewToolbar";
import { BASE_ICONS } from "~/app/_components/baseIcons";
import type { ViewType } from "@prisma/client";

// ─── Colour palette ───────────────────────────────────────────────────────────

const COLOR_PALETTE = [
  ["#ffdce5","#fde8d8","#fdf5d4","#d1f7c4","#c2f5e9","#d0effd","#cfdfff","#fce4f9","#ede2fe","#e8e8e8"],
  ["#f82b60","#ff6f2c","#fcb400","#20c933","#00b2a0","#18bfff","#2d7ff9","#ff08c2","#8b46ff","#444444"],
];

function tabBarBg(hex: string): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const m = (c: number) => Math.round(c + (255-c)*0.88);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function tabBarBorder(hex: string): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const m = (c: number) => Math.round(c + (255-c)*0.72);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

// ─── Base icon renderer ───────────────────────────────────────────────────────

function BaseIconSVG({ iconId, color, size = 28 }: { iconId: string; color: string; size?: number }) {
  const def = BASE_ICONS.find((i) => i.id === iconId);
  return (
    <div className="rounded flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {def?.path ? (
        <svg width={size*0.6} height={size*0.6} viewBox="0 0 16 16" fill="none"
          stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d={def.path}/>
        </svg>
      ) : "Un"}
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/^### (.+)$/gm,"<h3 style='font-size:13px;font-weight:700;margin:12px 0 4px'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 style='font-size:15px;font-weight:700;margin:14px 0 4px'>$1</h2>")
    .replace(/^# (.+)$/gm,  "<h1 style='font-size:17px;font-weight:700;margin:16px 0 6px'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,    "<em>$1</em>")
    .replace(/`(.+?)`/g,"<code style='background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:11px;font-family:monospace'>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g,"<a href='$2' target='_blank' style='color:#0069ff;text-decoration:underline'>$1</a>")
    .replace(/^[-*] (.+)$/gm,"<li style='margin:2px 0;padding-left:4px'>$1</li>")
    .replace(/(<li[\s\S]*?<\/li>)/g,"<ul style='padding-left:16px;list-style:disc;margin:6px 0'>$1</ul>")
    .replace(/\n\n/g,"</p><p style='margin:6px 0'>")
    .replace(/\n/g,"<br/>");
}

// ─── Appearance panel ─────────────────────────────────────────────────────────

function AppearancePanel({ base, onClose, onUpdateColor, onUpdateIcon, onUpdateGuide, onToggleStar }: {
  base: { name: string; color: string; icon: string; guide: string | null; starred: boolean };
  onClose: () => void;
  onUpdateColor: (c: string) => void;
  onUpdateIcon: (i: string) => void;
  onUpdateGuide: (g: string) => void;
  onToggleStar: () => void;
}) {
  const [tab, setTab]               = useState<"color"|"icon">("color");
  const [iconSearch, setIconSearch] = useState("");
  const [guideOpen, setGuideOpen]   = useState(true);
  const [guideMode, setGuideMode]   = useState<"view"|"edit">("view");
  const DEFAULT_GUIDE = `Use this space to share the goals and details of your base with your team.\n\nStart by outlining your goal.\n\nNext, share details about key information in your base:\n\nThis table contains...\n\nThis view shows...\n\nThis link contains...`;
  const [guideText, setGuideText]   = useState(base.guide ?? DEFAULT_GUIDE);

  const filteredIcons = BASE_ICONS.filter((i) =>
    !iconSearch.trim() || i.label.toLowerCase().includes(iconSearch.toLowerCase())
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}/>
      <div className="fixed left-[52px] top-[52px] z-50 w-[480px] bg-white border border-[#e0e0e0] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-[#f0f0f0]">
          <span className="text-[17px] font-semibold text-[#172b4d]">{base.name}</span>
          <div className="flex items-center gap-2">
            <button onClick={onToggleStar}
              className={`text-lg transition-colors ${base.starred ? "text-yellow-400" : "text-[#ccc] hover:text-yellow-400"}`}>★</button>
            <button className="text-[#999] hover:text-[#555] transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-4">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#172b4d" strokeWidth="1.4">
                <path d="M7 1a6 6 0 100 12A6 6 0 007 1zM2.5 9C4 8 5.5 7.5 7 7.5s3 .5 4.5 1.5"/>
                <circle cx="7" cy="5" r="1.5"/>
              </svg>
              <span className="text-[13px] font-bold text-[#172b4d]">Appearance</span>
            </div>

            <div className="flex mb-4 border border-[#e0e0e0] rounded overflow-hidden w-fit">
              {(["color","icon"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-1.5 text-[13px] transition-colors capitalize ${
                    tab === t ? "bg-white text-[#172b4d] font-medium border border-[#0069ff] -m-px rounded z-10"
                              : "bg-[#f8f8f8] text-[#666] hover:bg-[#f0f0f0]"
                  }`}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            {tab === "color" && (
              <div className="space-y-2">
                {COLOR_PALETTE.map((row, ri) => (
                  <div key={ri} className="flex gap-2">
                    {row.map((hex) => (
                      <button key={hex} onClick={() => onUpdateColor(hex)} title={hex}
                        className="w-8 h-8 rounded flex items-center justify-center transition-transform hover:scale-110 flex-shrink-0"
                        style={{ background: hex }}>
                        {base.color === hex && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7l4 4 6-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {tab === "icon" && (
              <div>
                <div className="flex items-center gap-2 border border-[#e0e0e0] rounded px-3 py-1.5 mb-3">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#aaa" strokeWidth="1.5">
                    <circle cx="5" cy="5" r="3.5"/><path d="M8 8l2.5 2.5"/>
                  </svg>
                  <input className="flex-1 text-[12px] outline-none text-[#172b4d] placeholder-[#aaa]"
                    placeholder="Search icons" value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}/>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {filteredIcons.map((icon) => (
                    <button key={icon.id} onClick={() => onUpdateIcon(icon.id)} title={icon.label}
                      className={`w-9 h-9 rounded flex items-center justify-center transition-all hover:scale-110 ${
                        base.icon === icon.id ? "ring-2 ring-[#0069ff] ring-offset-1" : "hover:bg-[#f5f5f4]"
                      }`}
                      style={{ background: base.icon === icon.id ? base.color : undefined }}>
                      {icon.path ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                          stroke={base.icon === icon.id ? "white" : "#555"}
                          strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                          <path d={icon.path}/>
                        </svg>
                      ) : (
                        <span className="text-[10px] font-bold" style={{ color: base.icon === icon.id ? "white" : "#666" }}>Un</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#f0f0f0]">
            <button className="w-full flex items-center gap-2 px-5 py-3 hover:bg-[#f8f8f8] transition-colors"
              onClick={() => setGuideOpen((p) => !p)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="1.5"
                className={`transition-transform ${guideOpen ? "rotate-90" : ""}`}>
                <path d="M4 2l4 4-4 4"/>
              </svg>
              <span className="text-[13px] font-bold text-[#172b4d]">Base guide</span>
            </button>

            {guideOpen && (
              <div className="px-5 pb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-[#888]">Supports Markdown</span>
                  <div className="flex items-center gap-1">
                    {guideMode === "view" ? (
                      <button onClick={() => setGuideMode("edit")}
                        className="text-[12px] text-[#0069ff] hover:underline px-2 py-0.5 rounded hover:bg-[#f0f7ff] transition-colors">
                        Edit
                      </button>
                    ) : (
                      <>
                        <button onClick={() => setGuideMode("view")}
                          className="text-[12px] text-[#888] hover:text-[#555] px-2 py-0.5 rounded hover:bg-[#f5f5f5] transition-colors">
                          Cancel
                        </button>
                        <button onClick={() => { onUpdateGuide(guideText); setGuideMode("view"); }}
                          className="text-[12px] bg-[#0069ff] hover:bg-[#0055d4] text-white px-3 py-0.5 rounded transition-colors">
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {guideMode === "edit" ? (
                  <textarea autoFocus rows={8}
                    className="w-full border border-[#e0e0e0] rounded p-3 text-[13px] text-[#172b4d] outline-none focus:border-[#0069ff] resize-none font-mono leading-relaxed"
                    value={guideText}
                    onChange={(e) => setGuideText(e.target.value)}/>
                ) : (
                  <div className="text-[13px] text-[#444] leading-relaxed min-h-[60px] cursor-text"
                    onClick={() => setGuideMode("edit")}
                    dangerouslySetInnerHTML={{ __html: `<p style='margin:6px 0'>${renderMarkdown(guideText)}</p>` }}/>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Saving indicator ─────────────────────────────────────────────────────────

function SyncIndicator() {
  const isMutating                = useIsMutating();
  const [showSaved, setShowSaved] = useState(false);
  const wasActive                 = useRef(false);

  useEffect(() => {
    if (isMutating > 0) {
      wasActive.current = true;
      setShowSaved(false);
    } else if (wasActive.current) {
      wasActive.current = false;
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 2200);
      return () => clearTimeout(t);
    }
  }, [isMutating]);

  if (isMutating > 0) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[#888] select-none">
        <div className="w-3 h-3 border-[1.5px] border-[#ccc] border-t-[#555] rounded-full animate-spin flex-shrink-0"/>
        <span>Saving</span>
      </div>
    );
  }
  if (showSaved) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[#22c55e] select-none">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>All changes saved</span>
      </div>
    );
  }
  return null;
}

// ─── Left icon sidebar ─────────────────────────────────────────────────────────

function LeftSidebar() {
  return (
    <aside className="w-[48px] flex-shrink-0 bg-white border-r border-[#e0e0e0] flex flex-col items-center py-2 gap-1 z-10">
      <Link href="/"
        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity mb-2"
        title="Home">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <defs>
            <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#ff6b35"/>
              <stop offset="50%"  stopColor="#ffd700"/>
              <stop offset="100%" stopColor="#0080ff"/>
            </linearGradient>
          </defs>
          <rect width="28" height="28" rx="5" fill="url(#lg2)"/>
          <path d="M5 10.5L14 6l9 4.5v2.5L14 17.5l-9-4.5V10.5z" fill="white" fillOpacity="0.95"/>
          <path d="M5 13v4.5L14 22V18L5 13z" fill="white" fillOpacity="0.7"/>
          <path d="M23 13v4.5L14 22V18L23 13z" fill="white" fillOpacity="0.5"/>
        </svg>
      </Link>

      <button className="w-8 h-8 rounded flex items-center justify-center text-[#666] hover:bg-[#f5f5f4] hover:text-[#172b4d] transition-colors" title="Search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5L14 14" strokeLinecap="round"/>
        </svg>
      </button>

      <button className="w-8 h-8 rounded flex items-center justify-center text-[#666] hover:bg-[#f5f5f4] hover:text-[#172b4d] transition-colors" title="Home">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M2 7.5L8 2L14 7.5V14H10V10H6V14H2V7.5Z"/>
        </svg>
      </button>

      <div className="flex-1"/>

      <button className="w-8 h-8 rounded flex items-center justify-center text-[#666] hover:bg-[#f5f5f4] hover:text-[#172b4d] transition-colors" title="Help">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6"/>
          <path d="M6 6a2 2 0 114 0c0 1-1 1.5-2 2M8 12v.5" strokeLinecap="round"/>
        </svg>
      </button>

      <button className="w-8 h-8 rounded flex items-center justify-center text-[#666] hover:bg-[#f5f5f4] hover:text-[#172b4d] transition-colors" title="Notifications">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M8 1.5a5 5 0 015 5v3l1.5 2h-13L3 9.5v-3a5 5 0 015-5zM6 12a2 2 0 004 0" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <button className="w-8 h-8 rounded-full bg-[#c0392b] flex items-center justify-center text-white text-[12px] font-bold mt-1 flex-shrink-0" title="Account">
        R
      </button>
    </aside>
  );
}

// ─── View meta ─────────────────────────────────────────────────────────────────

const VIEW_META: Record<string, { icon: React.ReactNode; color: string }> = {
  GRID: {
    color: "#166a5b",
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1" y="1" width="5" height="5" rx="0.5"/><rect x="8" y="1" width="5" height="5" rx="0.5"/>
        <rect x="1" y="8" width="5" height="5" rx="0.5"/><rect x="8" y="8" width="5" height="5" rx="0.5"/>
      </svg>
    ),
  },
  KANBAN: {
    color: "#9b59b6",
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1"    y="1" width="3.5" height="12" rx="0.5"/>
        <rect x="5.25" y="1" width="3.5" height="8"  rx="0.5"/>
        <rect x="9.5"  y="1" width="3.5" height="10" rx="0.5"/>
      </svg>
    ),
  },
};

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BasePage({ params }: { params: Promise<{ baseId: string }> }) {
  const { baseId } = use(params);
  const utils = api.useUtils();

  const { data: base, isLoading, error } = api.base.getById.useQuery(
    { id: baseId },
    {
      retry: (failureCount, err) => {
        const isNotFound = (err as { data?: { code?: string } })?.data?.code === "NOT_FOUND";
        return isNotFound && failureCount < 4;
      },
      retryDelay: (attempt) => Math.min(300 * 2 ** attempt, 3000),
    }
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const cancelBase    = () => utils.base.getById.cancel({ id: baseId });
  const snapshotBase  = () => utils.base.getById.getData({ id: baseId });
  const patchBase     = (updater: Parameters<typeof utils.base.getById.setData>[1]) =>
    utils.base.getById.setData({ id: baseId }, updater);
  const restoreBase   = (snap: ReturnType<typeof snapshotBase>) =>
    utils.base.getById.setData({ id: baseId }, snap);
  const invalidateBase = () => {
    void utils.base.getById.invalidate({ id: baseId });
    void utils.base.getAll.invalidate();
  };

  const cancelViews   = (tableId: string) => utils.view.getByTableId.cancel({ tableId });
  const snapshotViews = (tableId: string) => utils.view.getByTableId.getData({ tableId });
  const patchViews    = (tableId: string, updater: Parameters<typeof utils.view.getByTableId.setData>[1]) =>
    utils.view.getByTableId.setData({ tableId }, updater);
  const invalidateViews = (tableId: string) =>
    void utils.view.getByTableId.invalidate({ tableId });

  const renameTable = api.table.renameTable.useMutation({
    onMutate: async ({ tableId, name }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((p) => p ? { ...p, tables: p.tables.map((t) => t.id === tableId ? { ...t, name } : t) } : p);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const deleteTable = api.table.deleteTable.useMutation({
    onMutate: async ({ tableId }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((p) => p ? { ...p, tables: p.tables.filter((t) => t.id !== tableId) } : p);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const createTable = api.table.create.useMutation({
    onMutate: async ({ name }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      const tempId = `temp-tbl-${Date.now()}`;
      patchBase((p) => p ? {
        ...p,
        tables: [...p.tables, {
          id: tempId, name, baseId, order: p.tables.length,
          createdAt: new Date(), updatedAt: new Date(),
          _count: { rows: 0 },
        }],
      } : p);
      return { snapshot, tempId };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const createView = api.view.create.useMutation({
    onMutate: async ({ tableId, name, type }) => {
      await cancelViews(tableId);
      const snapshot = snapshotViews(tableId);
      const tempId   = `temp-view-${Date.now()}`;
      patchViews(tableId, (p) => {
        const views = p ?? [];
        return [...views, {
          id: tempId, name, type: type ?? "GRID",
          order: views.length, groupByColumnId: null,
          tableId, createdAt: new Date(), updatedAt: new Date(),
        }];
      });
      return { snapshot, tempId, tableId };
    },
    onSuccess: (v, _vars, ctx) => {
      if (ctx?.tempId) tempViewToRealId.current[ctx.tempId] = v.id;
      patchViews(v.tableId, (p) =>
        p?.map((view) => view.id === ctx?.tempId ? v : view)
      );
      setActiveViewId((prev) =>
        prev === null || prev === ctx?.tempId ? v.id : prev
      );
    },
    onError: (_e, vars, ctx) => {
      utils.view.getByTableId.setData({ tableId: vars.tableId }, ctx?.snapshot);
    },
    onSettled: (_d, _e, vars) => invalidateViews(vars.tableId),
  });

  const renameView = api.view.rename.useMutation({
    onMutate: async ({ viewId, name }) => {
      const tid = currentTableId ?? "";
      await cancelViews(tid);
      const snapshot = snapshotViews(tid);
      patchViews(tid, (p) => p?.map((v) => v.id === viewId ? { ...v, name } : v));
      return { snapshot, tid };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.tid) utils.view.getByTableId.setData({ tableId: ctx.tid }, ctx.snapshot);
    },
    onSettled: (_d, _e, _v, ctx) => {
      if ((ctx as { tid?: string })?.tid) invalidateViews((ctx as { tid: string }).tid);
    },
  });

  const deleteView = api.view.delete.useMutation({
    onMutate: async ({ viewId }) => {
      const tid = currentTableId ?? "";
      await cancelViews(tid);
      const snapshot = snapshotViews(tid);
      patchViews(tid, (p) => p?.filter((v) => v.id !== viewId));
      return { snapshot, tid };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.tid) utils.view.getByTableId.setData({ tableId: ctx.tid }, ctx.snapshot);
    },
    onSettled: (_d, _e, _v, ctx) => {
      invalidateViews((ctx as { tid?: string })?.tid ?? currentTableId ?? "");
    },
  });

  const updateApp = api.base.updateAppearance.useMutation({
    onMutate: async (vars) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((prev) => prev ? { ...prev, ...vars } : prev);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const toggleStar = api.base.toggleStar.useMutation({
    onMutate: async ({ starred }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((prev) => prev ? { ...prev, starred } : prev);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const [bulkAdding, setBulkAdding] = useState(false);
  const bulkAddRows = api.table.bulkAddRows.useMutation({
    onSuccess: () => { void utils.table.getById.invalidate({ id: currentTableId ?? "" }); },
    onSettled: () => setBulkAdding(false),
  });

  function handleBulkAddRows() {
    if (!currentTableId || bulkAdding) return;
    setBulkAdding(true);
    bulkAddRows.mutate({ tableId: currentTableId, count: 100_000 });
  }

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId]   = useState<string | null>(null);
  const tempViewToRealId                  = useRef<Record<string, string>>({});
  const [viewSidebarOpen, setViewSidebar] = useState(true);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [renamingTable, setRenamingTable] = useState<{ id: string; value: string } | null>(null);
  const [renamingView, setRenamingView]   = useState<{ id: string; value: string } | null>(null);
  const [addingTable, setAddingTable]     = useState(false);
  const [newTableName, setNewTableName]   = useState("");
  const [addingView, setAddingView]       = useState(false);
  const [newViewName, setNewViewName]     = useState("");
  const [newViewType, setNewViewType]     = useState<ViewType>("GRID");

  const [viewConfigs, setViewConfigs] = useState<Record<string, ViewConfig>>({});

  function getViewConfig(viewId: string): ViewConfig {
    return viewConfigs[viewId] ?? { ...DEFAULT_VIEW_CONFIG };
  }
  function updateViewConfig(viewId: string, patch: Partial<ViewConfig>) {
    setViewConfigs((prev) => ({
      ...prev,
      [viewId]: { ...getViewConfig(viewId), ...patch },
    }));
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const currentTableId = activeTableId ?? base?.tables[0]?.id ?? null;

  const { data: views = [] } = api.view.getByTableId.useQuery(
    { tableId: currentTableId ?? "" },
    { enabled: !!currentTableId },
  );
  const resolvedActiveViewId = activeViewId
    ? (tempViewToRealId.current[activeViewId] ?? activeViewId)
    : null;
  const activeView = views.find((v) => v.id === resolvedActiveViewId) ?? views[0] ?? null;

  const { data: currentTable } = api.table.getById.useQuery(
    { id: currentTableId ?? "" },
    { enabled: !!currentTableId },
  );

  const currentCfg = activeView ? getViewConfig(activeView.id) : DEFAULT_VIEW_CONFIG;

  // ── Handlers ───────────────────────────────────────────────────────────────
  function commitTableRename() {
    if (!renamingTable?.value.trim()) { setRenamingTable(null); return; }
    renameTable.mutate({ tableId: renamingTable.id, name: renamingTable.value.trim() });
    setRenamingTable(null);
  }
  function handleDeleteTable(tableId: string) {
    if ((activeTableId ?? base?.tables[0]?.id) === tableId) setActiveTableId(null);
    deleteTable.mutate({ tableId });
  }
  function handleAddTable() {
    if (!newTableName.trim()) return;
    const name = newTableName.trim();
    setNewTableName(""); setAddingTable(false);
    createTable.mutate({ baseId, name }, {
      onSuccess: (t) => { setActiveTableId(t.id); setActiveViewId(null); },
    });
  }
  function commitViewRename() {
    if (!renamingView?.value.trim()) { setRenamingView(null); return; }
    renameView.mutate({ viewId: renamingView.id, name: renamingView.value.trim() });
    setRenamingView(null);
  }
  function handleAddView() {
    if (!newViewName.trim() || !currentTableId) return;
    createView.mutate({ tableId: currentTableId, name: newViewName.trim(), type: newViewType });
    setNewViewName(""); setAddingView(false);
  }

  // ── Loading / error ────────────────────────────────────────────────────────
  if (isLoading || (!base && !error)) return (
    <div className="min-h-screen bg-white flex items-center justify-center"
      style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="text-[13px] text-[#aaa] animate-pulse">Loading…</div>
    </div>
  );
  if (!base) return (
    <div className="min-h-screen bg-white flex items-center justify-center"
      style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="text-center">
        <p className="text-[#aaa] mb-4 text-[13px]">Base not found</p>
        <Link href="/" className="text-[#0069ff] text-[13px] hover:underline">← Home</Link>
      </div>
    </div>
  );

  const baseColor = base.color ?? "#f82b60";
  const baseIcon  = base.icon  ?? "default";

  return (
    <div className="h-screen flex overflow-hidden"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif", fontSize: "13px" }}>

      <LeftSidebar/>

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top nav bar ──────────────────────────────────────────────────── */}
        <header className="h-[44px] bg-white border-b border-[#e0e0e0] flex items-center px-3 gap-0 flex-shrink-0 relative">

          {/* Left: base name button */}
          <button onClick={() => setPanelOpen((p) => !p)}
            className="flex items-center gap-1.5 group rounded hover:bg-[#f0f0ef] px-2 py-1 transition-colors mr-2 flex-shrink-0">
            <BaseIconSVG iconId={baseIcon} color={baseColor} size={22}/>
            <span className="text-[13px] font-semibold text-[#172b4d] max-w-[160px] truncate">{base.name}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[#999] group-hover:text-[#555] transition-colors flex-shrink-0">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Center: nav tabs */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-full">
            <div className="relative flex items-center h-full">
              <span className="text-[13px] font-medium text-[#172b4d] px-3 cursor-default">Data</span>
              <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#166a5b] rounded-full"/>
            </div>
            {["Automations","Interfaces","Forms"].map((t) => (
              <button key={t} className="text-[13px] text-[#555] hover:text-[#172b4d] px-3 h-full transition-colors">{t}</button>
            ))}
          </div>

          {/* Right: actions */}
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <SyncIndicator/>
            {/* History / revision */}
            <button className="p-1.5 rounded text-[#555] hover:bg-[#f0f0ef] hover:text-[#172b4d] transition-colors" title="Revision history">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Upgrade */}
            <button className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-[#172b4d] border border-[#d8d8d8] rounded hover:bg-[#f5f5f4] transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 1l1.5 3.5L11 5l-2.5 2.5L9 11l-3-1.5L3 11l.5-3.5L1 5l3.5-.5L6 1z"/>
              </svg>
              Upgrade
            </button>
            {/* Launch */}
            <button className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-[#172b4d] border border-[#d8d8d8] rounded hover:bg-[#f5f5f4] transition-colors">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 2L6 6M10 2H7M10 2v3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 3H3a1 1 0 00-1 1v5a1 1 0 001 1h5a1 1 0 001-1V7"/>
              </svg>
              Launch
            </button>
            {/* Link icon */}
            <button className="p-1.5 rounded text-[#555] hover:bg-[#f0f0ef] hover:text-[#172b4d] transition-colors">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M7 9a3 3 0 004.5.5l2-2a3 3 0 00-4.25-4.25L8 4.5M9 7a3 3 0 00-4.5-.5l-2 2A3 3 0 006.75 12.75L8 11.5" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Share */}
            <button className="px-3 py-1 bg-[#0069ff] hover:bg-[#0055d4] text-white text-[13px] font-medium rounded transition-colors">
              Share
            </button>
          </div>
        </header>

        {/* ── Table tabs bar ───────────────────────────────────────────────── */}
        <div className="flex items-center px-2 flex-shrink-0 h-9 overflow-x-auto"
          style={{ background: tabBarBg(baseColor), borderBottom: `1px solid ${tabBarBorder(baseColor)}` }}>

          {/* View sidebar toggle */}
          <button onClick={() => setViewSidebar((p) => !p)}
            className="mr-1 p-1.5 rounded hover:bg-black/10 text-[#444] transition-colors flex-shrink-0"
            title="Toggle view sidebar">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="2" width="4" height="12" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="6" y="2" width="9" height="4" rx="1" fill="currentColor" opacity="0.3"/>
              <rect x="6" y="7" width="9" height="4" rx="1" fill="currentColor" opacity="0.3"/>
            </svg>
          </button>

          {/* Table tabs */}
          {base.tables.map((table) => {
            const isActive   = currentTableId === table.id;
            const isRenaming = renamingTable?.id === table.id;
            return (
              <div key={table.id}
                className={`group/tab relative flex items-center flex-shrink-0 h-9 transition-all ${
                  isActive
                    ? "bg-white rounded-t border-l border-t border-r border-[#d8d8d8] -mb-px z-10"
                    : ""
                }`}>
                {isRenaming ? (
                  <input autoFocus value={renamingTable.value}
                    className="mx-2 my-1 bg-white border border-[#0069ff] rounded px-2 py-0.5 text-[12px] outline-none w-28"
                    onChange={(e) => setRenamingTable({ ...renamingTable, value: e.target.value })}
                    onBlur={commitTableRename}
                    onKeyDown={(e) => { if (e.key === "Enter") commitTableRename(); if (e.key === "Escape") setRenamingTable(null); }}/>
                ) : (
                  <button
                    onClick={() => { setActiveTableId(table.id); setActiveViewId(null); }}
                    onDoubleClick={() => setRenamingTable({ id: table.id, value: table.name })}
                    className={`flex items-center gap-1 px-3 h-full text-[12px] font-medium transition-colors ${
                      isActive
                        ? "text-[#172b4d]"
                        : "text-[#444] hover:text-[#172b4d] hover:bg-black/5 rounded-t"
                    }`}>
                    {table.name}
                    {/* Active tab gets dropdown arrow */}
                    {isActive && (
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#888]">
                        <path d="M2.5 4l2.5 2.5L7.5 4"/>
                      </svg>
                    )}
                  </button>
                )}
                {!isRenaming && !isActive && base.tables.length > 1 && (
                  <button onClick={() => handleDeleteTable(table.id)}
                    className="opacity-0 group-hover/tab:opacity-100 mr-1 text-[#888] hover:text-red-500 transition-all text-[10px] p-0.5 rounded">✕</button>
                )}
              </div>
            );
          })}

          {/* Add table */}
          {addingTable ? (
            <div className="flex items-center gap-1 ml-2">
              <input autoFocus value={newTableName} placeholder="Table name…"
                className="bg-white border border-[#0069ff] rounded px-2 py-0.5 text-[12px] outline-none w-28"
                onChange={(e) => setNewTableName(e.target.value)}
                onBlur={() => { if (!newTableName.trim()) setAddingTable(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddTable(); if (e.key === "Escape") { setAddingTable(false); setNewTableName(""); } }}/>
              <button onClick={handleAddTable} className="px-2 py-0.5 bg-[#166a5b] text-white rounded text-[11px]">Add</button>
              <button onClick={() => { setAddingTable(false); setNewTableName(""); }} className="text-[#666] text-[10px] px-1">✕</button>
            </div>
          ) : (
            <button onClick={() => setAddingTable(true)}
              className="ml-1 flex items-center gap-1 px-2 py-1 text-[#444] hover:text-[#172b4d] hover:bg-black/5 rounded text-[12px] font-medium transition-colors flex-shrink-0">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5.5 1v9M1 5.5h9"/>
              </svg>
              Add or import
            </button>
          )}

          {/* Tools button on far right */}
          <div className="ml-auto flex-shrink-0">
            <button className="flex items-center gap-1 px-2 py-1 text-[#444] hover:text-[#172b4d] hover:bg-black/5 rounded text-[12px] transition-colors">
              Tools
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 2l4 3-4 3"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* View sidebar */}
          <aside className={`flex-shrink-0 bg-white border-r border-[#e0e0e0] flex flex-col transition-all duration-200 overflow-hidden ${viewSidebarOpen ? "w-[248px]" : "w-0"}`}>

            {/* Sidebar header: shows active view type + dropdown */}
            {activeView && (
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#e0e0e0] flex-shrink-0 min-w-0">
                <button className="flex items-center gap-1.5 flex-1 min-w-0 px-1 py-1 rounded hover:bg-[#f0f0ef] transition-colors">
                  <span className="flex-shrink-0" style={{ color: VIEW_META[activeView.type]?.color ?? "#166a5b" }}>
                    {VIEW_META[activeView.type]?.icon}
                  </span>
                  <span className="text-[12px] font-semibold text-[#172b4d] truncate">
                    {activeView.name}
                  </span>
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#888] flex-shrink-0">
                    <path d="M2.5 4l2.5 2.5L7.5 4"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Create new */}
            <div className="px-2 py-1.5 border-b border-[#e0e0e0] flex-shrink-0">
              <button onClick={() => { setAddingView(true); setNewViewName(""); }}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[12px] text-[#444] font-medium hover:bg-[#f5f5f4] rounded transition-colors">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M6 1v10M1 6h10"/>
                </svg>
                Create new…
              </button>
            </div>

            {/* Find a view */}
            <div className="px-2 py-1.5 border-b border-[#e0e0e0] flex-shrink-0">
              <div className="flex items-center gap-2 px-2 py-1 bg-[#f5f5f4] rounded text-[12px] text-[#aaa]">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="5" cy="5" r="3.5"/><path d="M8 8L10 10"/>
                </svg>
                Find a view
              </div>
            </div>

            {/* View list */}
            <div className="flex-1 overflow-y-auto py-1">
              {views.map((view) => {
                const isActive   = activeView?.id === view.id;
                const isRenaming = renamingView?.id === view.id;
                const meta       = VIEW_META[view.type];
                const vcfg       = getViewConfig(view.id);
                const hasActive  = vcfg.filters.length > 0 || vcfg.sorts.length > 0 || vcfg.groups.length > 0
                  || Object.values(vcfg.hiddenFields).some(Boolean);
                return (
                  <div key={view.id}
                    className={`group/view flex items-center gap-2 mx-1 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      isActive
                        ? "bg-[#eaf3f1] border-l-2 border-[#166a5b]"
                        : "hover:bg-[#f5f5f4]"
                    }`}
                    style={isActive ? { borderRadius: "0 6px 6px 0" } : {}}
                    onClick={() => setActiveViewId(view.id)}>
                    <span className="flex-shrink-0" style={{ color: isActive ? meta?.color : "#999" }}>{meta?.icon}</span>
                    {isRenaming ? (
                      <input autoFocus value={renamingView.value}
                        className="flex-1 bg-white border border-[#0069ff] rounded px-1.5 py-0.5 text-[12px] outline-none min-w-0"
                        onChange={(e) => setRenamingView({ ...renamingView, value: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={commitViewRename}
                        onKeyDown={(e) => { if (e.key === "Enter") commitViewRename(); if (e.key === "Escape") setRenamingView(null); }}/>
                    ) : (
                      <span className={`flex-1 text-[12px] truncate ${isActive ? "text-[#172b4d] font-medium" : "text-[#444]"}`}
                        onDoubleClick={(e) => { e.stopPropagation(); setRenamingView({ id: view.id, value: view.name }); }}>
                        {view.name}
                      </span>
                    )}
                    {hasActive && !isRenaming && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0069ff] flex-shrink-0"/>
                    )}
                    {!isRenaming && views.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); deleteView.mutate({ viewId: view.id }); }}
                        className="opacity-0 group-hover/view:opacity-100 text-[#ccc] hover:text-red-400 text-[10px] flex-shrink-0 transition-all">✕</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add view form */}
            {addingView && (
              <div className="border-t border-[#e0e0e0] p-3 space-y-2 flex-shrink-0">
                <input autoFocus value={newViewName} placeholder="View name…"
                  className="w-full bg-white border border-[#0069ff] rounded px-2 py-1.5 text-[12px] outline-none"
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddView(); if (e.key === "Escape") setAddingView(false); }}/>
                <div className="flex gap-1">
                  {(["GRID","KANBAN"] as ViewType[]).map((t) => {
                    const m = VIEW_META[t];
                    return (
                      <button key={t} onClick={() => setNewViewType(t)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border text-[11px] font-medium transition-colors ${
                          newViewType === t ? "border-[#0069ff] text-[#0069ff] bg-[#f0f7ff]" : "border-[#e0e0e0] text-[#666] hover:border-[#ccc]"
                        }`}>
                        <span style={{ color: newViewType === t ? m?.color : "#aaa" }}>{m?.icon}</span>
                        {t === "GRID" ? "Grid" : "Kanban"}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={handleAddView}
                    className="flex-1 py-1.5 bg-[#0069ff] hover:bg-[#0055d4] text-white rounded text-[11px] font-medium transition-colors">
                    Add view
                  </button>
                  <button onClick={() => setAddingView(false)}
                    className="px-2 py-1.5 border border-[#e0e0e0] text-[#888] rounded text-[11px] hover:bg-[#f5f5f4] transition-colors">✕</button>
                </div>
              </div>
            )}
          </aside>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ── Toolbar ── */}
            {activeView && currentTable ? (
              <ViewToolbar
                columns={currentTable.columns}
                config={currentCfg}
                onConfigChange={(patch) => updateViewConfig(activeView.id, patch)}
                activeViewName={activeView.name}
                activeViewType={activeView.type}
                onBulkAddRows={activeView.type === "GRID" ? handleBulkAddRows : undefined}
                bulkAdding={bulkAdding}
              />
            ) : (
              <div className="h-10 border-b border-[#e0e0e0] bg-white flex-shrink-0"/>
            )}

            {/* View content */}
            <div className="flex-1 overflow-hidden bg-white">
              {!currentTableId ? (
                <div className="flex items-center justify-center h-full text-[13px] text-[#aaa]">
                  No tables yet — click &ldquo;Add or import&rdquo; to create one.
                </div>
              ) : !activeView ? (
                <div className="flex items-center justify-center h-full text-[13px] text-[#aaa] animate-pulse">Loading views…</div>
              ) : activeView.type === "GRID" ? (
                <GridView
                  key={activeView.id}
                  tableId={currentTableId}
                  hiddenFields={currentCfg.hiddenFields}
                  filters={currentCfg.filters}
                  sorts={currentCfg.sorts}
                  groups={currentCfg.groups}
                  rowHeight={currentCfg.rowHeight}
                  onSortsChange={(sorts) => updateViewConfig(activeView.id, { sorts })}
                />
              ) : (
                <KanbanView
                  key={activeView.id}
                  tableId={currentTableId}
                  groupByColumnId={activeView.groupByColumnId}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appearance panel */}
      {panelOpen && (
        <AppearancePanel
          base={{
            name:    base.name,
            color:   base.color ?? "#f82b60",
            icon:    base.icon  ?? "default",
            guide:   base.guide ?? null,
            starred: base.starred,
          }}
          onClose={() => setPanelOpen(false)}
          onUpdateColor={(c) => updateApp.mutate({ id: baseId, color: c })}
          onUpdateIcon={(i) => updateApp.mutate({ id: baseId, icon: i })}
          onUpdateGuide={(g) => updateApp.mutate({ id: baseId, guide: g })}
          onToggleStar={() => toggleStar.mutate({ id: baseId, starred: !base.starred })}
        />
      )}
    </div>
  );
}