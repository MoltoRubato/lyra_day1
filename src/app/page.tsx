"use client";
// src/app/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { BASE_ICONS } from "~/app/_components/baseIcons";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageView = "home" | "starred" | "workspaces" | string;
type DispMode  = "list" | "grid";
type ModalState =
  | { kind: "createBase";      workspaceId?: string }
  | { kind: "createWorkspace" }
  | { kind: "renameBase";      id: string; value: string }
  | { kind: "renameWorkspace"; id: string; value: string }
  | { kind: "moveBase";        id: string; currentWorkspaceId: string | null }
  | { kind: "editDesc";        id: string; value: string }
  | null;

type BaseItem = {
  id: string; name: string; starred: boolean;
  color: string; icon: string;
  workspaceId: string | null;
  lastOpenedAt: Date | null;
  workspace: { id: string; name: string } | null;
  tables: { id: string; name: string; _count: { rows: number } }[];
};
type WsFull = {
  id: string; name: string; description: string | null; starred: boolean;
  bases: BaseItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_PALETTE = [
  "#f82b60","#ff6f2c","#fcb400","#20c933","#00b2a0",
  "#18bfff","#2d7ff9","#ff08c2","#8b46ff","#444444",
];
function fallbackColor(id: string): string {
  return BASE_PALETTE[id.charCodeAt(id.length - 1) % BASE_PALETTE.length]!;
}

function timeAgo(date: Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date as string) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5)     return "Just now";
  if (s < 3600)  { const m = Math.floor(s / 60);  return `Opened ${m}m ago`; }
  if (s < 86400) { const h = Math.floor(s / 3600); return `Opened ${h}h ago`; }
  const dy = Math.floor(s / 86400);
  return `Opened ${dy}d ago`;
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function BaseIcon({ base, size = 28 }: { base: Pick<BaseItem, "id" | "name" | "color" | "icon">; size?: number }) {
  const color = base.color ?? fallbackColor(base.id);
  const def   = base.icon && base.icon !== "default" ? BASE_ICONS.find((i) => i.id === base.icon) : null;
  return (
    <div className="rounded flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.42) }}>
      {def?.path ? (
        <svg width={Math.round(size * 0.58)} height={Math.round(size * 0.58)}
          viewBox="0 0 16 16" fill="none" stroke="white"
          strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d={def.path}/>
        </svg>
      ) : (base.name[0]?.toUpperCase() ?? "?")}
    </div>
  );
}

function WorkspaceIcon({ size = 28 }: { size?: number }) {
  return (
    <div className="rounded flex items-center justify-center bg-[#4d3f85] text-white flex-shrink-0"
      style={{ width: size, height: size }}>
      <svg width={Math.round(size * 0.54)} height={Math.round(size * 0.54)} viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
        <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.7"/>
        <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.7"/>
        <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
      </svg>
    </div>
  );
}

function NavBtn({ icon, label, active, collapsed, onClick, children }: {
  icon: React.ReactNode; label: string; active: boolean;
  collapsed: boolean; onClick: () => void; children?: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors leading-tight ${
        active ? "bg-[#f9fafb] text-[#172b4d] font-semibold" : "text-[#444] hover:bg-[#f5f5f4] hover:text-[#172b4d]"
      } ${collapsed ? "justify-center" : ""}`}>
      <span className={`flex-shrink-0 ${active ? "text-[#172b4d]" : "text-[#888]"}`}>{icon}</span>
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
      {!collapsed && children}
    </button>
  );
}

function ActionBtn({ children, onClick, title, danger = false }: {
  children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean;
}) {
  return (
    <button title={title}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded transition-colors ${
        danger
          ? "text-[#bbb] hover:text-red-500 hover:bg-red-50"
          : "text-[#bbb] hover:text-[#555] hover:bg-[#ebebeb]"
      }`}>
      {children}
    </button>
  );
}

// ─── Icon components ──────────────────────────────────────────────────────────

const HomeIco      = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="M2 7.5L8 2L14 7.5V14H10V10H6V14H2V7.5Z"/></svg>;
const StarIco      = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="M8 2L9.8 6.2L14 6.5L10.8 9.3L11.8 13.5L8 11.2L4.2 13.5L5.2 9.3L2 6.5L6.2 6.2L8 2Z"/></svg>;
const WsIco        = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>;
const PencilIco    = ({ size = 11 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" strokeLinejoin="round"/></svg>;
const MoveIco      = ({ size = 11 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1.5" y="2" width="4" height="8" rx="0.5"/><rect x="6.5" y="2" width="4" height="8" rx="0.5"/></svg>;
const TrashIco     = ({ size = 11 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 2L10 10M10 2L2 10" strokeLinecap="round"/></svg>;
const ChevronRight = ({ className = "" }: { className?: string }) => <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}><path d="M3.5 2l3 3-3 3"/></svg>;
const ListIco      = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 4h10M2 7h10M2 10h10" strokeLinecap="round"/></svg>;
const GridIco      = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2" width="4" height="4" rx="0.5"/><rect x="8" y="2" width="4" height="4" rx="0.5"/><rect x="2" y="8" width="4" height="4" rx="0.5"/><rect x="8" y="8" width="4" height="4" rx="0.5"/></svg>;

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const utils = api.useUtils();

  // ── Queries (two related datasets per workshop requirement) ────────────────
  const { data: bases = [], isLoading: basesLoading, error: basesError } = api.base.getAll.useQuery();
  const { data: workspaces = [], isLoading: wsLoading, error: wsError }  = api.workspace.getAll.useQuery();
  const isLoading = basesLoading || wsLoading;
  const error     = basesError ?? wsError;

  // ── Base mutations ─────────────────────────────────────────────────────────
  const createBase = api.base.create.useMutation({
    onSuccess: () => {
      void utils.base.getAll.invalidate();
      void utils.workspace.getAll.invalidate();
    },
  });

  const renameBase = api.base.rename.useMutation({
    // Optimistic: update name immediately
    onMutate: ({ id, name }) =>
      utils.base.getAll.setData(undefined, (p) => p?.map((b) => b.id === id ? { ...b, name } : b)),
    onSettled: () => void utils.base.getAll.invalidate(),
  });

  const deleteBase = api.base.delete.useMutation({
    // Optimistic: remove from list immediately
    onMutate: ({ id }) =>
      utils.base.getAll.setData(undefined, (p) => p?.filter((b) => b.id !== id)),
    onSettled: () => {
      void utils.base.getAll.invalidate();
      void utils.workspace.getAll.invalidate();
    },
  });

  const toggleBaseStar = api.base.toggleStar.useMutation({
    // Optimistic: flip star immediately
    onMutate: ({ id, starred }) =>
      utils.base.getAll.setData(undefined, (p) => p?.map((b) => b.id === id ? { ...b, starred } : b)),
    onSettled: () => void utils.base.getAll.invalidate(),
  });

  const moveBase = api.base.moveToWorkspace.useMutation({
    onSuccess: () => {
      void utils.base.getAll.invalidate();
      void utils.workspace.getAll.invalidate();
    },
  });

  // ── Workspace mutations ────────────────────────────────────────────────────
  const createWs = api.workspace.create.useMutation({
    onSuccess: () => void utils.workspace.getAll.invalidate(),
  });

  const renameWs = api.workspace.rename.useMutation({
    onMutate: ({ id, name }) =>
      utils.workspace.getAll.setData(undefined, (p) => p?.map((w) => w.id === id ? { ...w, name } : w)),
    onSettled: () => void utils.workspace.getAll.invalidate(),
  });

  const updateDesc = api.workspace.updateDescription.useMutation({
    onSuccess: () => void utils.workspace.getAll.invalidate(),
  });

  const deleteWs = api.workspace.delete.useMutation({
    onMutate: ({ id }) =>
      utils.workspace.getAll.setData(undefined, (p) => p?.filter((w) => w.id !== id)),
    onSettled: () => {
      void utils.workspace.getAll.invalidate();
      void utils.base.getAll.invalidate();
    },
  });

  const toggleWsStar = api.workspace.toggleStar.useMutation({
    onMutate: ({ id, starred }) =>
      utils.workspace.getAll.setData(undefined, (p) => p?.map((w) => w.id === id ? { ...w, starred } : w)),
    onSettled: () => void utils.workspace.getAll.invalidate(),
  });

  // ── UI state ───────────────────────────────────────────────────────────────
  const [page, setPage]             = useState<PageView>("home");
  const [dispMode, setDispMode]     = useState<DispMode>("list");
  const [sidebarOpen, setSidebar]   = useState(true);
  const [wsExpanded, setWsExpanded] = useState(true);
  const [search, setSearch]         = useState("");
  const [modal, setModal]           = useState<ModalState>(null);
  const [newName, setNewName]       = useState("");
  const [newDesc, setNewDesc]       = useState("");
  const [moveTo, setMoveTo]         = useState("");

  // ── Derived data ───────────────────────────────────────────────────────────
  const currentWorkspace = useMemo(
    () => (page !== "home" && page !== "starred" && page !== "workspaces")
      ? (workspaces.find((w) => w.id === page) ?? null)
      : null,
    [page, workspaces],
  );

  const filteredBases = useMemo(() => {
    let list = [...(bases as BaseItem[])];
    if (search.trim()) list = list.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));
    if (page === "starred")    return list.filter((b) => b.starred);
    if (page === "workspaces") return list;
    if (page === "home")       return list;
    return list.filter((b) => b.workspaceId === page);
  }, [bases, page, search]);

  const filteredWs  = useMemo(() => {
    const all = workspaces as WsFull[];
    if (!search.trim()) return all;
    return all.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));
  }, [workspaces, search]);

  const starredWs = useMemo(() => (workspaces as WsFull[]).filter((w) => w.starred), [workspaces]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  function open(m: ModalState) {
    setModal(m);
    if (!m) return;
    if (m.kind === "createBase" || m.kind === "createWorkspace") { setNewName(""); setNewDesc(""); }
    if (m.kind === "renameBase" || m.kind === "renameWorkspace") setNewName(m.value);
    if (m.kind === "editDesc")  setNewDesc(m.value);
    if (m.kind === "moveBase")  setMoveTo(m.currentWorkspaceId ?? "");
  }
  function close() { setModal(null); }

  function submit() {
    if (!modal) return;
    switch (modal.kind) {
      case "createBase":
        if (!newName.trim()) return;
        createBase.mutate({ name: newName.trim(), workspaceId: modal.workspaceId ?? undefined });
        break;
      case "createWorkspace":
        if (!newName.trim()) return;
        createWs.mutate({ name: newName.trim(), description: newDesc.trim() || undefined });
        break;
      case "renameBase":
        if (!newName.trim()) return;
        renameBase.mutate({ id: modal.id, name: newName.trim() });
        break;
      case "renameWorkspace":
        if (!newName.trim()) return;
        renameWs.mutate({ id: modal.id, name: newName.trim() });
        break;
      case "editDesc":
        updateDesc.mutate({ id: modal.id, description: newDesc.trim() || null });
        break;
      case "moveBase":
        moveBase.mutate({ id: modal.id, workspaceId: moveTo || null });
        break;
    }
    close();
  }

  const pageTitle =
    page === "home"       ? "Home" :
    page === "starred"    ? "Starred" :
    page === "workspaces" ? "Workspaces" :
    currentWorkspace?.name ?? "Workspace";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-[#f9fafb]"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif", fontSize: "13px" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`fixed top-0 left-0 bottom-0 bg-white border-r border-[#e0e0e0] flex flex-col transition-all duration-200 z-20 overflow-hidden ${sidebarOpen ? "w-[232px]" : "w-[48px]"}`}>

        {/* Logo row */}
        <div className="h-[52px] flex items-center gap-2 px-3 border-b border-[#e0e0e0] flex-shrink-0">
          <button onClick={() => setSidebar((p) => !p)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f9fafb] text-[#666] transition-colors flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 3.5h11M2 7.5h11M2 11.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
          {sidebarOpen && (
            <button onClick={() => setPage("home")}
              className="flex items-center gap-2 ml-1 overflow-hidden hover:opacity-80 transition-opacity">
              <svg width="22" height="22" viewBox="0 0 22 22" className="flex-shrink-0">
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%"   stopColor="#ff6b35"/>
                    <stop offset="50%"  stopColor="#ffd700"/>
                    <stop offset="100%" stopColor="#0080ff"/>
                  </linearGradient>
                </defs>
                <rect width="22" height="22" rx="4" fill="url(#g1)"/>
                <path d="M4 7.5l7-3.2 7 3.2v2L11 13l-7-3.5V7.5z" fill="white" fillOpacity="0.9"/>
                <path d="M4 9.5v3.5l7 3.2V13L4 9.5z"              fill="white" fillOpacity="0.7"/>
                <path d="M18 9.5v3.5l-7 3.2V13L18 9.5z"           fill="white" fillOpacity="0.5"/>
              </svg>
              <span className="font-bold text-[#172b4d] text-sm truncate">Airtable</span>
            </button>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          <NavBtn icon={<HomeIco/>} label="Home"    active={page === "home"}    collapsed={!sidebarOpen} onClick={() => setPage("home")}/>
          <NavBtn icon={<StarIco/>} label="Starred" active={page === "starred"} collapsed={!sidebarOpen} onClick={() => setPage("starred")}/>

          <NavBtn
            icon={<WsIco/>} label="Workspaces"
            active={page === "workspaces" || !!currentWorkspace}
            collapsed={!sidebarOpen}
            onClick={() => {
              if (!sidebarOpen) { setSidebar(true); setWsExpanded(true); }
              setPage("workspaces");
              setWsExpanded((p) => !p);
            }}>
            {sidebarOpen && <ChevronRight className={`transition-transform duration-150 text-[#aaa] ${wsExpanded ? "rotate-90" : ""}`}/>}
          </NavBtn>

          {sidebarOpen && wsExpanded && (
            <div className="pl-3 pr-1 space-y-0.5">
              {(workspaces as WsFull[]).map((ws) => (
                <button key={ws.id} onClick={() => setPage(ws.id)}
                  className={`w-full flex items-center gap-2 px-2 py-[6px] rounded-md text-xs transition-colors text-left ${
                    page === ws.id
                      ? "bg-[#f9fafb] text-[#172b4d] font-semibold"
                      : "text-[#666] hover:bg-[#f5f5f4] hover:text-[#172b4d]"
                  }`}>
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.starred && <span className="text-yellow-400 text-[10px]">★</span>}
                </button>
              ))}
              <button onClick={() => open({ kind: "createWorkspace" })}
                className="w-full flex items-center gap-1.5 px-2 py-[6px] rounded-md text-xs text-[#aaa] hover:text-[#555] hover:bg-[#f5f5f4] transition-colors">
                <span className="text-sm leading-none font-light">+</span> Add workspace
              </button>
            </div>
          )}
        </nav>

        {/* Footer links */}
        {sidebarOpen && (
          <div className="border-t border-[#e0e0e0] px-2 py-2 space-y-0.5">
            {["Templates and apps", "Marketplace", "Import"].map((lbl) => (
              <button key={lbl} className="w-full flex items-center px-2.5 py-[7px] rounded-md text-xs text-[#888] hover:bg-[#f5f5f4] hover:text-[#555] transition-colors text-left">
                {lbl}
              </button>
            ))}
          </div>
        )}

        {/* Create button */}
        <div className={`flex-shrink-0 border-t border-[#e0e0e0] ${sidebarOpen ? "p-3" : "p-2"}`}>
          <button onClick={() => open({ kind: "createBase" })}
            className="w-full flex items-center justify-center gap-1.5 py-[7px] bg-[#0069ff] hover:bg-[#0055d4] text-white text-sm font-medium rounded-md transition-colors">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5.5 1v9M1 5.5h9"/>
            </svg>
            {sidebarOpen && "Create"}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${sidebarOpen ? "ml-[232px]" : "ml-[48px]"}`}>

        {/* Top bar */}
        <div className="h-[52px] bg-white border-b border-[#e0e0e0] flex items-center px-6 gap-3 flex-shrink-0">
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 bg-white border border-[#d8d8d8] rounded-full px-3.5 py-1.5 w-full max-w-[420px] shadow-sm">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#999] flex-shrink-0" stroke="currentColor" strokeWidth="1.5">
                <circle cx="5" cy="5" r="3.5"/><path d="M8 8l2.5 2.5"/>
              </svg>
              <input className="flex-1 bg-transparent outline-none text-[13px] text-[#172b4d] placeholder-[#aaa] min-w-0"
                placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}/>
              {search ? (
                <button onClick={() => setSearch("")} className="text-[#aaa] hover:text-[#555] text-xs">✕</button>
              ) : (
                <span className="text-[10px] text-[#bbb] border border-[#e0e0e0] rounded px-1 py-0.5 leading-none">ctrl K</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#333] transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3l1.5 1.5"/>
              </svg>
              Help
            </button>
            <button className="text-[#666] hover:text-[#333]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M8 2a5 5 0 0 1 4.33 7.5L14 12H2l1.67-2.5A5 5 0 0 1 8 2z M6 12a2 2 0 0 0 4 0"/>
              </svg>
            </button>
            <div className="w-[28px] h-[28px] rounded-full bg-[#c0392b] flex items-center justify-center text-white text-xs font-bold cursor-pointer">R</div>
          </div>
        </div>

        {/* Page body */}
        <div className="flex-1 px-8 py-7 max-w-[1080px] w-full">
          <h1 className="text-[22px] font-bold text-[#172b4d] mb-5">{pageTitle}</h1>

          {/* Error state */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              Failed to load data. Please refresh the page.
            </div>
          )}

          {/* ── Workspaces overview ── */}
          {page === "workspaces" && (
            <WorkspacesOverview
              workspaces={filteredWs}
              allBases={bases as BaseItem[]}
              onNavigate={setPage}
              onCreateBase={(wsId) => open({ kind: "createBase", workspaceId: wsId })}
              onCreateWorkspace={() => open({ kind: "createWorkspace" })}
              onRenameWs={(ws) => open({ kind: "renameWorkspace", id: ws.id, value: ws.name })}
              onEditDesc={(ws) => open({ kind: "editDesc", id: ws.id, value: ws.description ?? "" })}
              onDeleteWs={(id) => { if (confirm("Delete this workspace? Bases will be unassigned.")) deleteWs.mutate({ id }); }}
              onStarWs={(ws) => toggleWsStar.mutate({ id: ws.id, starred: !ws.starred })}
              onRenameBase={(b) => open({ kind: "renameBase", id: b.id, value: b.name })}
              onDeleteBase={(id) => deleteBase.mutate({ id })}
              onStarBase={(b) => toggleBaseStar.mutate({ id: b.id, starred: !b.starred })}
              onMoveBase={(b) => open({ kind: "moveBase", id: b.id, currentWorkspaceId: b.workspaceId })}
            />
          )}

          {/* ── Home / Starred / Workspace page ── */}
          {page !== "workspaces" && (
            <>
              <div className="flex items-center justify-between mb-0">
                <button className="flex items-center gap-1 text-[13px] text-[#555] hover:text-[#172b4d] transition-colors py-0.5">
                  Opened anytime
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="mt-px">
                    <path d="M2.5 4l2.5 2.5L7.5 4"/>
                  </svg>
                </button>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setDispMode("list")}
                    className={`p-1.5 rounded transition-colors ${dispMode === "list" ? "text-[#172b4d] bg-[#e8e8e8]" : "text-[#999] hover:text-[#555]"}`}
                    title="List view"><ListIco/></button>
                  <button onClick={() => setDispMode("grid")}
                    className={`p-1.5 rounded transition-colors ${dispMode === "grid" ? "text-[#172b4d] bg-[#e8e8e8]" : "text-[#999] hover:text-[#555]"}`}
                    title="Grid view"><GridIco/></button>
                </div>
              </div>
              <div className="border-b border-[#e0e0e0] mb-0"/>

              {/* Starred workspaces section */}
              {page === "starred" && starredWs.length > 0 && (
                <div className="mt-3 mb-2">
                  <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest px-1 mb-2">Starred workspaces</p>
                  {starredWs.map((ws) => (
                    <div key={ws.id}
                      className="group flex items-center gap-3 py-2 px-1 hover:bg-white rounded-md transition-colors cursor-pointer -mx-1"
                      onClick={() => setPage(ws.id)}>
                      <WorkspaceIcon size={26}/>
                      <span className="flex-1 text-[13px] font-medium text-[#172b4d]">{ws.name}</span>
                      <span className="text-yellow-400">★</span>
                      <span className="text-xs text-[#aaa]">{ws.bases.length} base{ws.bases.length !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                  <div className="border-b border-[#e0e0e0] my-3"/>
                  <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest px-1 mb-2">Starred bases</p>
                </div>
              )}

              {/* Individual workspace header */}
              {currentWorkspace && (
                <div className="flex items-start justify-between mt-3 mb-4">
                  <div>
                    {currentWorkspace.description && (
                      <p className="text-xs text-[#888]">{currentWorkspace.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleWsStar.mutate({ id: currentWorkspace.id, starred: !currentWorkspace.starred })}
                      className={`text-base transition-colors ${currentWorkspace.starred ? "text-yellow-400" : "text-[#ccc] hover:text-yellow-400"}`}>★</button>
                    <ActionBtn title="Rename workspace" onClick={() => open({ kind: "renameWorkspace", id: currentWorkspace.id, value: currentWorkspace.name })}><PencilIco/></ActionBtn>
                    <button onClick={() => open({ kind: "editDesc", id: currentWorkspace.id, value: currentWorkspace.description ?? "" })}
                      className="text-xs text-[#0069ff] hover:underline px-2 py-1">Edit description</button>
                    <button onClick={() => open({ kind: "createBase", workspaceId: currentWorkspace.id })}
                      className="text-xs bg-[#0069ff] hover:bg-[#0055d4] text-white px-3 py-1.5 rounded-md transition-colors font-medium">
                      + Create base
                    </button>
                  </div>
                </div>
              )}

              {/* Loading skeleton */}
              {isLoading && (
                <div className="mt-3 space-y-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#ebebeb] animate-pulse">
                      <div className="w-6 h-6 rounded bg-[#e8e8e8]"/>
                      <div className="h-3 bg-[#ebebeb] rounded flex-1 max-w-[200px]"/>
                      <div className="h-3 bg-[#ebebeb] rounded w-28"/>
                      <div className="h-3 bg-[#ebebeb] rounded w-20"/>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !error && filteredBases.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-[#bbb]">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-4 opacity-25" stroke="currentColor" strokeWidth="1.2">
                    <rect x="6" y="10" width="36" height="30" rx="3"/><path d="M6 18h36M16 10v8"/>
                  </svg>
                  <p className="text-sm text-[#888]">
                    {page === "starred" ? "Nothing starred yet — star a base or workspace to pin it here." :
                     page === "home"    ? "No bases yet — click Create to get started." :
                                         "No bases in this workspace yet."}
                  </p>
                  {currentWorkspace && (
                    <button onClick={() => open({ kind: "createBase", workspaceId: currentWorkspace.id })}
                      className="mt-4 text-xs bg-[#0069ff] hover:bg-[#0055d4] text-white px-4 py-2 rounded-md transition-colors font-medium">
                      + Create base
                    </button>
                  )}
                </div>
              )}

              {/* List view */}
              {!isLoading && filteredBases.length > 0 && dispMode === "list" && (
                <BaseListView
                  bases={filteredBases}
                  showWorkspace={page === "home" || page === "starred"}
                  onRename={(b) => open({ kind: "renameBase", id: b.id, value: b.name })}
                  onDelete={(id) => deleteBase.mutate({ id })}
                  onStar={(b) => toggleBaseStar.mutate({ id: b.id, starred: !b.starred })}
                  onMove={(b) => open({ kind: "moveBase", id: b.id, currentWorkspaceId: b.workspaceId })}
                />
              )}

              {/* Grid view */}
              {!isLoading && filteredBases.length > 0 && dispMode === "grid" && (
                <BaseGridView
                  bases={filteredBases}
                  onRename={(b) => open({ kind: "renameBase", id: b.id, value: b.name })}
                  onDelete={(id) => deleteBase.mutate({ id })}
                  onStar={(b) => toggleBaseStar.mutate({ id: b.id, starred: !b.starred })}
                  onMove={(b) => open({ kind: "moveBase", id: b.id, currentWorkspaceId: b.workspaceId })}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[1px]" onClick={close}>
          <div className="bg-white rounded-xl border border-[#e0e0e0] shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-semibold text-[#172b4d] mb-5">
              {modal.kind === "createBase"      ? "Create a base" :
               modal.kind === "createWorkspace" ? "Create a workspace" :
               modal.kind === "renameBase"      ? "Rename base" :
               modal.kind === "renameWorkspace" ? "Rename workspace" :
               modal.kind === "editDesc"        ? "Edit description" :
                                                  "Move to workspace"}
            </h2>

            {(modal.kind === "createBase" || modal.kind === "renameBase" || modal.kind === "renameWorkspace") && (
              <div className="mb-4">
                <label className="block text-xs text-[#666] mb-1.5">
                  {modal.kind === "renameWorkspace" ? "Workspace name" : "Base name"}
                </label>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") close(); }}
                  className="w-full border border-[#d8d8d8] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0069ff] focus:ring-2 focus:ring-[#0069ff]/10 transition-colors"
                  placeholder={modal.kind === "renameWorkspace" ? "Workspace name…" : "Base name…"}/>
              </div>
            )}

            {modal.kind === "createWorkspace" && (
              <>
                <div className="mb-3">
                  <label className="block text-xs text-[#666] mb-1.5">Workspace name</label>
                  <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") close(); }}
                    className="w-full border border-[#d8d8d8] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0069ff] focus:ring-2 focus:ring-[#0069ff]/10 transition-colors"
                    placeholder="My workspace…"/>
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-[#666] mb-1.5">Description <span className="text-[#bbb]">(optional)</span></label>
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2}
                    className="w-full border border-[#d8d8d8] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0069ff] focus:ring-2 focus:ring-[#0069ff]/10 transition-colors resize-none"
                    placeholder="Describe this workspace…"/>
                </div>
              </>
            )}

            {modal.kind === "editDesc" && (
              <div className="mb-4">
                <textarea autoFocus value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3}
                  className="w-full border border-[#d8d8d8] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0069ff] focus:ring-2 focus:ring-[#0069ff]/10 transition-colors resize-none"
                  placeholder="Describe this workspace…"/>
              </div>
            )}

            {modal.kind === "moveBase" && (
              <div className="mb-4">
                <label className="block text-xs text-[#666] mb-1.5">Select workspace</label>
                <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}
                  className="w-full border border-[#d8d8d8] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0069ff] bg-white transition-colors">
                  <option value="">— No workspace —</option>
                  {(workspaces as WsFull[]).map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={close}
                className="px-4 py-2 text-sm text-[#555] hover:bg-[#f5f5f4] rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={submit}
                className="px-4 py-2 text-sm font-medium bg-[#0069ff] hover:bg-[#0055d4] text-white rounded-lg transition-colors">
                {modal.kind === "createBase"      ? "Create base" :
                 modal.kind === "createWorkspace" ? "Create workspace" :
                 modal.kind === "moveBase"        ? "Move" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Base list view ───────────────────────────────────────────────────────────

function BaseListView({ bases, showWorkspace, onRename, onDelete, onStar, onMove }: {
  bases: BaseItem[]; showWorkspace: boolean;
  onRename: (b: BaseItem) => void; onDelete: (id: string) => void;
  onStar: (b: BaseItem) => void; onMove: (b: BaseItem) => void;
}) {
  const cols = showWorkspace ? "grid-cols-[1fr_180px_160px_96px]" : "grid-cols-[1fr_180px_96px]";
  return (
    <div>
      <div className={`grid items-center px-1 py-2 text-[11px] font-medium text-[#888] uppercase tracking-wider border-b border-[#e0e0e0] ${cols}`}>
        <span>Name</span>
        <span>Last opened</span>
        {showWorkspace && <span>Workspace</span>}
        <span/>
      </div>
      {bases.map((base) => (
        <div key={base.id}
          className={`group grid items-center px-1 py-2 border-b border-[#ebebeb] hover:bg-white transition-colors -mx-1 ${cols}`}>
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <BaseIcon base={base} size={26}/>
            <Link href={`/base/${base.id}`}
              className="text-[13px] font-medium text-[#172b4d] hover:text-[#0069ff] truncate transition-colors">
              {base.name}
            </Link>
            <button onClick={() => onStar(base)}
              className={`text-[13px] flex-shrink-0 transition-all ${
                base.starred ? "text-yellow-400" : "opacity-0 group-hover:opacity-100 text-[#ddd] hover:text-yellow-400"
              }`}>★</button>
          </div>
          <span className="text-xs text-[#888]">{timeAgo(base.lastOpenedAt)}</span>
          {showWorkspace && <span className="text-xs text-[#666]">{base.workspace?.name ?? "—"}</span>}
          <div className="flex items-center justify-end gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ActionBtn title="Rename"          onClick={() => onRename(base)}><PencilIco/></ActionBtn>
            <ActionBtn title="Move workspace"  onClick={() => onMove(base)}><MoveIco/></ActionBtn>
            <ActionBtn title="Delete" danger   onClick={() => onDelete(base.id)}><TrashIco/></ActionBtn>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Base grid view ───────────────────────────────────────────────────────────

function BaseGridView({ bases, onRename, onDelete, onStar, onMove }: {
  bases: BaseItem[];
  onRename: (b: BaseItem) => void; onDelete: (id: string) => void;
  onStar: (b: BaseItem) => void; onMove: (b: BaseItem) => void;
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
                <Link href={`/base/${base.id}`}
                  className="text-[13px] font-semibold text-[#172b4d] hover:text-[#0069ff] block truncate transition-colors leading-snug">
                  {base.name}
                </Link>
                {base.workspace && <p className="text-[11px] text-[#888] truncate mt-0.5">{base.workspace.name}</p>}
              </div>
              <button onClick={() => onStar(base)}
                className={`text-[14px] flex-shrink-0 mt-0.5 transition-all ${
                  base.starred ? "text-yellow-400" : "opacity-0 group-hover:opacity-100 text-[#ddd] hover:text-yellow-400"
                }`}>★</button>
            </div>
            <div className="flex items-center justify-between border-t border-[#f0f0f0] pt-2.5">
              <span className="text-[11px] text-[#aaa]">{timeAgo(base.lastOpenedAt)}</span>
              <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionBtn title="Rename" onClick={() => onRename(base)}><PencilIco size={10}/></ActionBtn>
                <ActionBtn title="Move"   onClick={() => onMove(base)}><MoveIco size={10}/></ActionBtn>
                <ActionBtn title="Delete" danger onClick={() => onDelete(base.id)}><TrashIco size={10}/></ActionBtn>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Workspaces overview ──────────────────────────────────────────────────────

function WorkspacesOverview({
  workspaces, allBases, onNavigate, onCreateBase, onCreateWorkspace,
  onRenameWs, onEditDesc, onDeleteWs, onStarWs,
  onRenameBase, onDeleteBase, onStarBase, onMoveBase,
}: {
  workspaces: WsFull[]; allBases: BaseItem[];
  onNavigate: (p: string) => void;
  onCreateBase: (wsId: string) => void;
  onCreateWorkspace: () => void;
  onRenameWs: (ws: WsFull) => void;
  onEditDesc: (ws: WsFull) => void;
  onDeleteWs: (id: string) => void;
  onStarWs: (ws: WsFull) => void;
  onRenameBase: (b: BaseItem) => void;
  onDeleteBase: (id: string) => void;
  onStarBase: (b: BaseItem) => void;
  onMoveBase: (b: BaseItem) => void;
}) {
  const unassigned = allBases.filter((b) => !b.workspaceId);

  if (workspaces.length === 0 && unassigned.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#aaa]">
        <p className="text-sm mb-4">No workspaces yet.</p>
        <button onClick={onCreateWorkspace}
          className="text-xs bg-[#0069ff] hover:bg-[#0055d4] text-white px-4 py-2 rounded-md transition-colors font-medium">
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
                  }`}>★</button>
              </div>
              {ws.description && <p className="text-xs text-[#888] mt-0.5">{ws.description}</p>}
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
              className="text-xs text-[#0069ff] hover:underline flex-shrink-0 ml-2 font-medium">
              View workspace →
            </button>
          </div>

          {ws.bases.length === 0 ? (
            <p className="ml-[44px] text-xs text-[#aaa] py-2">
              No bases.{" "}
              <button onClick={() => onCreateBase(ws.id)} className="text-[#0069ff] hover:underline">Create one →</button>
            </p>
          ) : (
            <div className="ml-[44px] space-y-0.5">
              {ws.bases.slice(0, 6).map((base) => (
                <div key={base.id} className="group/row flex items-center gap-2.5 py-1.5 px-1 rounded-md hover:bg-white transition-colors -mx-1">
                  <BaseIcon base={base} size={22}/>
                  <Link href={`/base/${base.id}`}
                    className="flex-1 min-w-0 text-[13px] font-medium text-[#172b4d] hover:text-[#0069ff] truncate transition-colors">
                    {base.name}
                  </Link>
                  <span className="text-[11px] text-[#bbb] flex-shrink-0">{timeAgo(base.lastOpenedAt)}</span>
                  <div className="flex items-center gap-0 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => onStarBase(base)}
                      className={`px-1 text-sm transition-colors ${base.starred ? "text-yellow-400" : "text-[#ddd] hover:text-yellow-400"}`}>★</button>
                    <ActionBtn title="Rename"            onClick={() => onRenameBase(base)}><PencilIco size={10}/></ActionBtn>
                    <ActionBtn title="Move workspace"    onClick={() => onMoveBase(base)}><MoveIco size={10}/></ActionBtn>
                    <ActionBtn title="Delete" danger     onClick={() => onDeleteBase(base.id)}><TrashIco size={10}/></ActionBtn>
                  </div>
                </div>
              ))}
              {ws.bases.length > 6 && (
                <button onClick={() => onNavigate(ws.id)} className="ml-[30px] text-xs text-[#0069ff] hover:underline py-1">
                  +{ws.bases.length - 6} more — View workspace →
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
          <div className="space-y-0.5">
            {unassigned.map((base) => (
              <div key={base.id} className="group/row flex items-center gap-2.5 py-1.5 px-1 rounded-md hover:bg-white transition-colors -mx-1">
                <BaseIcon base={base} size={22}/>
                <Link href={`/base/${base.id}`}
                  className="flex-1 min-w-0 text-[13px] font-medium text-[#172b4d] hover:text-[#0069ff] truncate transition-colors">
                  {base.name}
                </Link>
                <span className="text-[11px] text-[#bbb] flex-shrink-0">{timeAgo(base.lastOpenedAt)}</span>
                <div className="flex items-center gap-0 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                  <ActionBtn title="Move workspace" onClick={() => onMoveBase(base)}><MoveIco size={10}/></ActionBtn>
                  <ActionBtn title="Delete" danger  onClick={() => onDeleteBase(base.id)}><TrashIco size={10}/></ActionBtn>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}