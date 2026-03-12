"use client";
// src/app/base/[baseId]/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { useState, use } from "react";
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
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
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
  const [tab, setTab]             = useState<"color"|"icon">("color");
  const [iconSearch, setIconSearch] = useState("");
  const [guideOpen, setGuideOpen]   = useState(true);
  const [guideMode, setGuideMode]   = useState<"view"|"edit">("view");
  const DEFAULT_GUIDE = `Use this space to share the goals and details of your base with your team.\n\nStart by outlining your goal.\n\nNext, share details about key information in your base:\n\nThis table contains...\n\nThis view shows...\n\nThis link contains...`;
  const [guideText, setGuideText] = useState(base.guide ?? DEFAULT_GUIDE);

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
              className={`text-lg transition-colors ${base.starred ? "text-yellow-400" : "text-[#ccc] hover:text-yellow-400"}`}>
              ★
            </button>
            <button className="text-[#999] hover:text-[#555] transition-colors" title="More options">
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

            <div className="flex mb-4 border border-[#e0e0e0] rounded-md overflow-hidden w-fit">
              {(["color","icon"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-1.5 text-[13px] transition-colors capitalize ${
                    tab === t ? "bg-white text-[#172b4d] font-medium border border-[#0069ff] -m-px rounded-md z-10"
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
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110 flex-shrink-0"
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
                <div className="flex items-center gap-2 border border-[#e0e0e0] rounded-md px-3 py-1.5 mb-3">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#aaa" strokeWidth="1.5">
                    <circle cx="5" cy="5" r="3.5"/><path d="M8 8l2.5 2.5"/>
                  </svg>
                  <input className="flex-1 text-xs outline-none text-[#172b4d] placeholder-[#aaa]"
                    placeholder="Search icons" value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}/>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {filteredIcons.map((icon) => (
                    <button key={icon.id} onClick={() => onUpdateIcon(icon.id)} title={icon.label}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
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
                  <span className="text-xs text-[#888]">Supports Markdown</span>
                  <div className="flex items-center gap-1">
                    {guideMode === "view" ? (
                      <button onClick={() => setGuideMode("edit")}
                        className="text-xs text-[#0069ff] hover:underline px-2 py-0.5 rounded hover:bg-[#f0f7ff] transition-colors">
                        Edit
                      </button>
                    ) : (
                      <>
                        <button onClick={() => setGuideMode("view")}
                          className="text-xs text-[#888] hover:text-[#555] px-2 py-0.5 rounded hover:bg-[#f5f5f5] transition-colors">
                          Cancel
                        </button>
                        <button onClick={() => { onUpdateGuide(guideText); setGuideMode("view"); }}
                          className="text-xs bg-[#0069ff] hover:bg-[#0055d4] text-white px-3 py-0.5 rounded transition-colors">
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {guideMode === "edit" ? (
                  <textarea autoFocus rows={8}
                    className="w-full border border-[#e0e0e0] rounded-lg p-3 text-[13px] text-[#172b4d] outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff]/20 resize-none font-mono leading-relaxed"
                    value={guideText}
                    onChange={(e) => setGuideText(e.target.value)}
                    placeholder="Write your base guide in Markdown..."/>
                ) : (
                  <div className="text-[13px] text-[#444] leading-relaxed min-h-[60px] cursor-text"
                    style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
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

// ─── Left icon sidebar ────────────────────────────────────────────────────────

function LeftSidebar() {
  return (
    <aside className="w-12 flex-shrink-0 bg-white border-r border-[#e0e0e0] flex flex-col items-center py-2 gap-1 z-10">
      <Link href="/"
        className="w-8 h-8 rounded-lg mb-2 flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
        title="Home">
        <svg width="32" height="32" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff6b35"/>
              <stop offset="50%" stopColor="#ffd700"/>
              <stop offset="100%" stopColor="#0080ff"/>
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="6" fill="url(#lg2)"/>
          <path d="M6 12l10-5 10 5v3L16 20 6 15v-3z" fill="white" fillOpacity="0.95"/>
          <path d="M6 15v5l10 5V20L6 15z" fill="white" fillOpacity="0.7"/>
          <path d="M26 15v5l-10 5V20L26 15z" fill="white" fillOpacity="0.5"/>
        </svg>
      </Link>

      <div className="flex-1"/>

      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#777] hover:bg-[#f5f5f4] hover:text-[#172b4d] transition-colors" title="Help">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6"/>
          <path d="M6 6a2 2 0 114 0c0 1-1 1.5-2 2M8 12v.5" strokeLinecap="round"/>
        </svg>
      </button>

      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#777] hover:bg-[#f5f5f4] hover:text-[#172b4d] transition-colors" title="Notifications">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M8 1.5a5 5 0 015 5v3l1.5 2h-13L3 9.5v-3a5 5 0 015-5zM6 12a2 2 0 004 0" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <button className="w-8 h-8 rounded-full bg-[#c0392b] flex items-center justify-center text-white text-xs font-bold mt-1 flex-shrink-0" title="Account">
        R
      </button>
    </aside>
  );
}

// ─── View meta ────────────────────────────────────────────────────────────────

const VIEW_META: Record<string, { icon: React.ReactNode; color: string }> = {
  GRID: {
    color: "#166a5b",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1" y="1" width="5" height="5" rx="0.5"/><rect x="8" y="1" width="5" height="5" rx="0.5"/>
        <rect x="1" y="8" width="5" height="5" rx="0.5"/><rect x="8" y="8" width="5" height="5" rx="0.5"/>
      </svg>
    ),
  },
  KANBAN: {
    color: "#9b59b6",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1"   y="1" width="3.5" height="12" rx="0.5"/>
        <rect x="5.25" y="1" width="3.5" height="8"  rx="0.5"/>
        <rect x="9.5" y="1" width="3.5" height="10" rx="0.5"/>
      </svg>
    ),
  },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BasePage({ params }: { params: Promise<{ baseId: string }> }) {
  const { baseId } = use(params);
  const utils = api.useUtils();

  const { data: base, isLoading } = api.base.getById.useQuery({ id: baseId });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const renameTable  = api.table.renameTable.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });
  const deleteTable  = api.table.deleteTable.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });
  const createTable  = api.table.create.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });

  const updateApp = api.base.updateAppearance.useMutation({
    onMutate: (vars) => {
      utils.base.getById.setData({ id: baseId }, (prev) => prev ? { ...prev, ...vars } : prev);
    },
    onSettled: () => {
      void utils.base.getById.invalidate({ id: baseId });
      void utils.base.getAll.invalidate();
    },
  });

  const toggleStar = api.base.toggleStar.useMutation({
    onMutate: ({ starred }) => {
      utils.base.getById.setData({ id: baseId }, (prev) => prev ? { ...prev, starred } : prev);
    },
    onSettled: () => {
      void utils.base.getById.invalidate({ id: baseId });
      void utils.base.getAll.invalidate();
    },
  });

  const createView  = api.view.create.useMutation({
    onSuccess: (v) => { void utils.view.getByTableId.invalidate({ tableId: v.tableId }); setActiveViewId(v.id); },
  });
  const renameView  = api.view.rename.useMutation({ onSuccess: (v) => void utils.view.getByTableId.invalidate({ tableId: v.tableId }) });
  const deleteView  = api.view.delete.useMutation({ onSuccess: () => void utils.view.getByTableId.invalidate({ tableId: activeTableId ?? "" }) });
  const updateConfig = api.view.updateConfig.useMutation({ onSuccess: (v) => void utils.view.getByTableId.invalidate({ tableId: v.tableId }) });

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId]   = useState<string | null>(null);
  const [viewSidebarOpen, setViewSidebar] = useState(true);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [renamingTable, setRenamingTable] = useState<{ id: string; value: string } | null>(null);
  const [renamingView, setRenamingView]   = useState<{ id: string; value: string } | null>(null);
  const [addingTable, setAddingTable]     = useState(false);
  const [newTableName, setNewTableName]   = useState("");
  const [addingView, setAddingView]       = useState(false);
  const [newViewName, setNewViewName]     = useState("");
  const [newViewType, setNewViewType]     = useState<ViewType>("GRID");

  // ── Per-view config (filter / sort / group / hide / rowHeight) ─────────────
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
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0] ?? null;

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
    createTable.mutate({ baseId, name: newTableName.trim() }, {
      onSuccess: (t) => { setActiveTableId(t.id); setActiveViewId(null); },
    });
    setNewTableName(""); setAddingTable(false);
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
  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center"
      style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="text-sm text-[#aaa] animate-pulse">Loading…</div>
    </div>
  );
  if (!base) return (
    <div className="min-h-screen bg-white flex items-center justify-center"
      style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="text-center">
        <p className="text-[#aaa] mb-4 text-sm">Base not found</p>
        <Link href="/" className="text-[#0069ff] text-sm hover:underline">← Home</Link>
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

        {/* ── Top nav bar ─────────────────────────────────────────────────── */}
        <header className="h-[52px] bg-white border-b border-[#e0e0e0] flex items-center px-4 gap-3 flex-shrink-0 relative">
          <button onClick={() => setPanelOpen((p) => !p)}
            className="flex items-center gap-2 group rounded-md hover:bg-[#f5f5f4] px-2 py-1.5 transition-colors -ml-2">
            <BaseIconSVG iconId={baseIcon} color={baseColor} size={30}/>
            <span className="text-[14px] font-semibold text-[#172b4d]">{base.name}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#aaa] group-hover:text-[#666] transition-colors">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-full">
            <div className="relative flex items-center h-full">
              <span className="text-[13px] font-medium text-[#166a5b] px-3">Data</span>
              <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#166a5b] rounded-full"/>
            </div>
            {["Automations","Interfaces"].map((t) => (
              <button key={t} className="text-[13px] text-[#666] hover:text-[#172b4d] px-3 transition-colors">{t}</button>
            ))}
          </div>

          <div className="ml-auto">
            <button className="px-4 py-1.5 bg-[#0069ff] hover:bg-[#0055d4] text-white text-[13px] font-medium rounded-md transition-colors">
              Share
            </button>
          </div>
        </header>

        {/* ── Table tabs bar ───────────────────────────────────────────────── */}
        <div className="flex items-center px-3 flex-shrink-0 h-10 overflow-x-auto"
          style={{ background: tabBarBg(baseColor), borderBottom: `1px solid ${tabBarBorder(baseColor)}` }}>

          <button onClick={() => setViewSidebar((p) => !p)}
            className="mr-2 p-1.5 rounded hover:bg-black/10 text-[#555] transition-colors flex-shrink-0"
            title="Toggle view sidebar">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="2" width="4" height="12" rx="1" fill="currentColor" opacity="0.6"/>
              <rect x="6" y="2" width="9" height="4" rx="1" fill="currentColor" opacity="0.35"/>
              <rect x="6" y="7" width="9" height="4" rx="1" fill="currentColor" opacity="0.35"/>
            </svg>
          </button>

          {base.tables.map((table) => {
            const isActive   = currentTableId === table.id;
            const isRenaming = renamingTable?.id === table.id;
            return (
              <div key={table.id}
                className={`group/tab relative flex items-center flex-shrink-0 h-10 transition-all ${
                  isActive ? "bg-white rounded-t border-l border-t border-r border-[#e0e0e0] -mb-px z-10" : ""
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
                    className={`px-3 h-full text-[12px] font-medium transition-colors ${
                      isActive ? "text-[#172b4d]" : "text-[#555] hover:text-[#172b4d] hover:bg-black/5 rounded-t"
                    }`}
                    title="Double-click to rename">
                    {table.name}
                  </button>
                )}
                {!isRenaming && base.tables.length > 1 && (
                  <button onClick={() => handleDeleteTable(table.id)}
                    className="opacity-0 group-hover/tab:opacity-100 mr-1 text-[#aaa] hover:text-red-500 transition-all text-[10px] p-0.5 rounded">✕</button>
                )}
              </div>
            );
          })}

          {addingTable ? (
            <div className="flex items-center gap-1 ml-2">
              <input autoFocus value={newTableName} placeholder="Table name…"
                className="bg-white border border-[#0069ff] rounded px-2 py-0.5 text-[12px] outline-none w-28"
                onChange={(e) => setNewTableName(e.target.value)}
                onBlur={() => { if (!newTableName.trim()) setAddingTable(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddTable(); if (e.key === "Escape") { setAddingTable(false); setNewTableName(""); } }}/>
              <button onClick={handleAddTable} className="px-2 py-0.5 bg-[#166a5b] text-white rounded text-[11px]">Add</button>
              <button onClick={() => { setAddingTable(false); setNewTableName(""); }} className="text-[#888] text-[10px] px-1">✕</button>
            </div>
          ) : (
            <button onClick={() => setAddingTable(true)}
              className="ml-2 flex items-center gap-1.5 px-3 py-1 text-[#555] hover:text-[#172b4d] hover:bg-black/5 rounded text-[12px] font-medium transition-colors flex-shrink-0">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5.5 1v9M1 5.5h9"/>
              </svg>
              Add or import
            </button>
          )}
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* View sidebar */}
          <aside className={`flex-shrink-0 bg-white border-r border-[#e0e0e0] flex flex-col transition-all duration-200 overflow-hidden ${viewSidebarOpen ? "w-[248px]" : "w-0"}`}>
            <div className="flex items-center gap-1 px-3 py-2 border-b border-[#e0e0e0] flex-shrink-0">
              <button onClick={() => { setAddingView(true); setNewViewName(""); }}
                className="flex items-center gap-1.5 px-2 py-1.5 text-[12px] text-[#555] font-medium hover:bg-[#f5f5f4] rounded transition-colors">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M6 1v10M1 6h10"/>
                </svg>
                Create new…
              </button>
            </div>

            <div className="px-3 py-2 border-b border-[#e0e0e0]">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[#f8f8f7] rounded-md border border-[#e8e8e8] text-[12px] text-[#aaa]">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="5" cy="5" r="3.5"/><path d="M8 8L10 10"/>
                </svg>
                Find a view
              </div>
            </div>

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
                    className={`group/view flex items-center gap-2 mx-1.5 px-2 py-2 rounded-md cursor-pointer transition-colors ${
                      isActive ? "bg-[#f9fafb]" : "hover:bg-[#f8f8f7]"
                    }`}
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
                      <span className={`flex-1 text-[12px] truncate font-medium ${isActive ? "text-[#172b4d]" : "text-[#555]"}`}
                        onDoubleClick={(e) => { e.stopPropagation(); setRenamingView({ id: view.id, value: view.name }); }}>
                        {view.name}
                      </span>
                    )}
                    {/* Dot indicator if view has active config */}
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

            {addingView && (
              <div className="border-t border-[#e0e0e0] p-3 space-y-2">
                <input autoFocus value={newViewName} placeholder="View name…"
                  className="w-full bg-white border border-[#0069ff] rounded-md px-2 py-1.5 text-[12px] outline-none"
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddView(); if (e.key === "Escape") setAddingView(false); }}/>
                <div className="flex gap-1">
                  {(["GRID","KANBAN"] as ViewType[]).map((t) => {
                    const m = VIEW_META[t];
                    return (
                      <button key={t} onClick={() => setNewViewType(t)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border text-[11px] font-medium transition-colors ${
                          newViewType === t ? "border-[#0069ff] text-[#0069ff] bg-[#f0f7ff]" : "border-[#e0e0e0] text-[#777] hover:border-[#ccc]"
                        }`}>
                        <span style={{ color: newViewType === t ? m?.color : "#aaa" }}>{m?.icon}</span>
                        {t === "GRID" ? "Grid" : "Kanban"}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={handleAddView}
                    className="flex-1 py-1.5 bg-[#0069ff] hover:bg-[#0055d4] text-white rounded-md text-[11px] font-medium transition-colors">
                    Add view
                  </button>
                  <button onClick={() => setAddingView(false)}
                    className="px-2 py-1.5 border border-[#e0e0e0] text-[#888] rounded-md text-[11px] hover:bg-[#f5f5f4] transition-colors">✕</button>
                </div>
              </div>
            )}
          </aside>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ── Toolbar (ViewToolbar replaces old static buttons) ── */}
            {activeView && currentTable ? (
              <ViewToolbar
                columns={currentTable.columns}
                config={currentCfg}
                onConfigChange={(patch) => updateViewConfig(activeView.id, patch)}
                activeViewName={activeView.name}
                activeViewType={activeView.type}
              />
            ) : (
              <div className="h-10 border-b border-[#e0e0e0] bg-white flex-shrink-0"/>
            )}

            {/* View content */}
            <div className="flex-1 overflow-auto bg-white">
              {!currentTableId ? (
                <div className="flex items-center justify-center h-full text-sm text-[#aaa]">
                  No tables yet — click &ldquo;+ Add or import&rdquo; to create one.
                </div>
              ) : !activeView ? (
                <div className="flex items-center justify-center h-full text-sm text-[#aaa] animate-pulse">Loading views…</div>
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
            name: base.name,
            color: base.color ?? "#f82b60",
            icon:  base.icon  ?? "default",
            guide: base.guide ?? null,
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