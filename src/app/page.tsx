"use client";
// src/app/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { useState, useMemo, useEffect, useRef } from "react";
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

function groupByTime(bases: BaseItem[]): { label: string; items: BaseItem[] }[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs  = todayStart.getTime();
  const weekTs   = todayTs - 6 * 24 * 60 * 60 * 1000;
  const monthTs  = todayTs - 30 * 24 * 60 * 60 * 1000;

  const buckets: Record<string, BaseItem[]> = {
    "Today": [], "Past 7 days": [], "Past month": [], "Older": [], "—": [],
  };

  for (const b of bases) {
    if (!b.lastOpenedAt) { buckets["—"]!.push(b); continue; }
    const t = new Date(b.lastOpenedAt as unknown as string).getTime();
    if (t >= todayTs)      buckets["Today"]!.push(b);
    else if (t >= weekTs)  buckets["Past 7 days"]!.push(b);
    else if (t >= monthTs) buckets["Past month"]!.push(b);
    else                   buckets["Older"]!.push(b);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function BaseIcon({ base, size = 28 }: { base: Pick<BaseItem, "id" | "name" | "color" | "icon">; size?: number }) {
  const color = base.color ?? fallbackColor(base.id);
  const def   = base.icon && base.icon !== "default" ? BASE_ICONS.find((i) => i.id === base.icon) : null;
  // 2-char abbreviation like Airtable: "Ta" for "Table 1", "Un" for "Untitled"
  const abbrev = base.name.length >= 2
    ? base.name[0]!.toUpperCase() + base.name[1]!.toLowerCase()
    : (base.name[0]?.toUpperCase() ?? "?");
  return (
    <div className="rounded flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.38) }}>
      {def?.path ? (
        <svg width={Math.round(size * 0.58)} height={Math.round(size * 0.58)}
          viewBox="0 0 16 16" fill="none" stroke="white"
          strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d={def.path}/>
        </svg>
      ) : abbrev}
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
      className={`w-full flex items-center gap-2 px-2 py-[6px] rounded text-[13px] transition-colors ${
        active ? "bg-[#f0f0ef] text-[#172b4d] font-medium" : "text-[#374151] hover:bg-[#f5f5f4] hover:text-[#172b4d]"
      } ${collapsed ? "justify-center" : ""}`}>
      <span className={`flex-shrink-0 ${active ? "text-[#172b4d]" : "text-[#6b7280]"}`}>{icon}</span>
      {!collapsed && <span className="flex-1 text-left text-[13px]">{label}</span>}
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
const SharedIco    = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35"><circle cx="11" cy="3" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="11" cy="13" r="2"/><path d="M5.8 7l3.4-3M5.8 9l3.4 3" strokeLinecap="round"/></svg>;
const WsIco        = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>;
const PencilIco    = ({ size = 11 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" strokeLinejoin="round"/></svg>;
const MoveIco      = ({ size = 11 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1.5" y="2" width="4" height="8" rx="0.5"/><rect x="6.5" y="2" width="4" height="8" rx="0.5"/></svg>;
const TrashIco     = ({ size = 11 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 2L10 10M10 2L2 10" strokeLinecap="round"/></svg>;
const ChevronRight = ({ className = "" }: { className?: string }) => <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}><path d="M3.5 2l3 3-3 3"/></svg>;
const ListIco      = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 4h10M2 7h10M2 10h10" strokeLinecap="round"/></svg>;
const GridIco      = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2" width="4" height="4" rx="0.5"/><rect x="8" y="2" width="4" height="4" rx="0.5"/><rect x="2" y="8" width="4" height="4" rx="0.5"/><rect x="8" y="8" width="4" height="4" rx="0.5"/></svg>;

// ─── Search Modal ─────────────────────────────────────────────────────────────

function SearchModal({ bases, workspaces, onClose }: {
  bases: BaseItem[];
  workspaces: WsFull[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();

  const sortedBases = [...bases].sort((a, b) => {
    const ta = a.lastOpenedAt ? new Date(a.lastOpenedAt as unknown as string).getTime() : 0;
    const tb = b.lastOpenedAt ? new Date(b.lastOpenedAt as unknown as string).getTime() : 0;
    return tb - ta;
  });

  const filteredBases = sortedBases.filter((b) => !q || b.name.toLowerCase().includes(q));
  const filteredWs    = workspaces.filter((w) => !q || w.name.toLowerCase().includes(q));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose}/>

      {/* Dropdown — positioned under the search bar */}
      <div className="fixed left-1/2 -translate-x-1/2 top-[56px] z-50 w-[640px] bg-white rounded-xl shadow-2xl overflow-hidden border border-[#e0e0e0]">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0f0f0]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-[#333] flex-shrink-0" stroke="currentColor" strokeWidth="1.8">
            <circle cx="7.5" cy="7.5" r="5.5"/><path d="M12.5 12.5L16 16" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef}
            className="flex-1 text-[15px] text-[#172b4d] outline-none placeholder-[#aaa] bg-transparent"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}/>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto pl-[6px]">
          {!q && (
            <p className="text-[11px] font-semibold text-[#888] px-3 pt-3 pb-1.5">Recently opened</p>
          )}
          {q && filteredWs.length > 0 && filteredWs.map((ws) => (
            <button key={ws.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f5f5f4] transition-colors text-left rounded-lg"
              onClick={onClose}>
              <div className="w-9 h-9 rounded-lg bg-[#c2bce8] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="5" cy="5" r="3" fill="white" fillOpacity="0.9"/>
                  <circle cx="11" cy="5" r="3" fill="white" fillOpacity="0.7"/>
                  <circle cx="5" cy="11" r="3" fill="white" fillOpacity="0.7"/>
                  <circle cx="11" cy="11" r="3" fill="white" fillOpacity="0.5"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-[#172b4d] truncate">{ws.name}</span>
                  {ws.starred && <span className="text-yellow-400 text-[11px]">★</span>}
                </div>
                <p className="text-[11px] text-[#888]">Workspace</p>
              </div>
              <span className="text-[11px] text-[#aaa] flex-shrink-0">Last opened just now</span>
            </button>
          ))}
          {filteredBases.map((base) => (
            <Link key={base.id} href={base.id.startsWith("temp-") ? "#" : `/base/${base.id}`}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#f5f5f4] transition-colors rounded-lg"
              onClick={onClose}>
              <BaseIcon base={base} size={36}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-[#172b4d] truncate">{base.name}</span>
                  {base.starred && <span className="text-yellow-400 text-[11px]">★</span>}
                  <span className="text-[12px] text-[#aaa]">· Base</span>
                </div>
                <p className="text-[11px] text-[#888]">{base.workspace?.name ?? "No workspace"}</p>
              </div>
              <span className="text-[11px] text-[#aaa] flex-shrink-0">Last opened {timeAgo(base.lastOpenedAt).replace("Opened ", "")}</span>
            </Link>
          ))}
          {filteredBases.length === 0 && filteredWs.length === 0 && (
            <p className="text-[13px] text-[#888] text-center py-8">No results for &ldquo;{query}&rdquo;</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#f0f0f0] px-4 py-2.5 flex items-center gap-1.5">
          <span className="text-[12px] text-[#aaa]">Press</span>
          <kbd className="text-[11px] text-[#555] bg-[#f5f5f4] border border-[#e0e0e0] rounded px-1.5 py-0.5 font-mono">CTRL K</kbd>
          <span className="text-[12px] text-[#aaa]">any time to search</span>
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const utils = api.useUtils();

  const { data: bases = [], isLoading: basesLoading, error: basesError } = api.base.getAll.useQuery();
  const { data: workspaces = [], isLoading: wsLoading, error: wsError }  = api.workspace.getAll.useQuery();
  const isLoading = basesLoading || wsLoading;
  const error     = basesError ?? wsError;

  // ── Shared optimistic helpers ──────────────────────────────────────────────

  const cancelBases      = () => utils.base.getAll.cancel();
  const snapshotBases    = () => utils.base.getAll.getData();
  const patchBases       = (fn: Parameters<typeof utils.base.getAll.setData>[1]) =>
    utils.base.getAll.setData(undefined, fn);
  const invalidateBases  = () => void utils.base.getAll.invalidate();

  const cancelWs         = () => utils.workspace.getAll.cancel();
  const snapshotWs       = () => utils.workspace.getAll.getData();
  const patchWs          = (fn: Parameters<typeof utils.workspace.getAll.setData>[1]) =>
    utils.workspace.getAll.setData(undefined, fn);
  const invalidateWs     = () => void utils.workspace.getAll.invalidate();

  // ── Base mutations ─────────────────────────────────────────────────────────

  const createBase = api.base.create.useMutation({
    onMutate: async ({ name, workspaceId }) => {
      await cancelBases(); await cancelWs();
      const snapshotB = snapshotBases(); const snapshotW = snapshotWs();
      const tempBase: BaseItem = {
        id: `temp-base-${Date.now()}`, name, starred: false,
        color: "#f82b60", icon: "default",
        workspaceId: workspaceId ?? null, lastOpenedAt: new Date(),
        workspace: null, tables: [],
      };
      patchBases((p) => p ? [tempBase, ...p] : [tempBase]);
      if (workspaceId) {
        patchWs((p) => p?.map((w) => w.id !== workspaceId ? w : {
          ...w, bases: [tempBase as unknown as WsFull["bases"][number], ...w.bases],
        }));
      }
      return { snapshotB, snapshotW };
    },
    onError: (_e, _v, ctx) => { patchBases(() => ctx?.snapshotB); patchWs(() => ctx?.snapshotW); },
    onSettled: () => { invalidateBases(); invalidateWs(); },
  });

  const renameBase = api.base.rename.useMutation({
    onMutate: async ({ id, name }) => {
      await cancelBases(); await cancelWs();
      const snapshotB = snapshotBases(); const snapshotW = snapshotWs();
      patchBases((p) => p?.map((b) => b.id === id ? { ...b, name } : b));
      patchWs((p) => p?.map((w) => ({ ...w, bases: w.bases.map((b) => b.id === id ? { ...b, name } : b) })));
      return { snapshotB, snapshotW };
    },
    onError: (_e, _v, ctx) => { patchBases(() => ctx?.snapshotB); patchWs(() => ctx?.snapshotW); },
    onSettled: () => { invalidateBases(); invalidateWs(); },
  });

  const deleteBase = api.base.delete.useMutation({
    onMutate: async ({ id }) => {
      await cancelBases(); await cancelWs();
      const snapshotB = snapshotBases(); const snapshotW = snapshotWs();
      patchBases((p) => p?.filter((b) => b.id !== id));
      patchWs((p) => p?.map((w) => ({ ...w, bases: w.bases.filter((b) => b.id !== id) })));
      return { snapshotB, snapshotW };
    },
    onError: (_e, _v, ctx) => { patchBases(() => ctx?.snapshotB); patchWs(() => ctx?.snapshotW); },
    onSettled: () => { invalidateBases(); invalidateWs(); },
  });

  const toggleBaseStar = api.base.toggleStar.useMutation({
    onMutate: async ({ id, starred }) => {
      await cancelBases(); await cancelWs();
      const snapshotB = snapshotBases(); const snapshotW = snapshotWs();
      patchBases((p) => p?.map((b) => b.id === id ? { ...b, starred } : b));
      patchWs((p) => p?.map((w) => ({ ...w, bases: w.bases.map((b) => b.id === id ? { ...b, starred } : b) })));
      return { snapshotB, snapshotW };
    },
    onError: (_e, _v, ctx) => { patchBases(() => ctx?.snapshotB); patchWs(() => ctx?.snapshotW); },
    onSettled: invalidateBases,
  });

  const moveBase = api.base.moveToWorkspace.useMutation({
    onMutate: async ({ id, workspaceId }) => {
      await cancelBases(); await cancelWs();
      const snapshotB = snapshotBases(); const snapshotW = snapshotWs();
      patchBases((p) => p?.map((b) => b.id === id ? { ...b, workspaceId: workspaceId ?? null, workspace: null } : b));
      patchWs((p) => {
        if (!p) return p;
        const baseToMove = p.flatMap((w) => w.bases).find((b) => b.id === id);
        if (!baseToMove) return p;
        return p.map((w) => {
          if (w.bases.some((b) => b.id === id)) return { ...w, bases: w.bases.filter((b) => b.id !== id) };
          if (workspaceId && w.id === workspaceId) return { ...w, bases: [...w.bases, { ...baseToMove, workspaceId }] };
          return w;
        });
      });
      return { snapshotB, snapshotW };
    },
    onError: (_e, _v, ctx) => { patchBases(() => ctx?.snapshotB); patchWs(() => ctx?.snapshotW); },
    onSettled: () => { invalidateBases(); invalidateWs(); },
  });

  // ── Workspace mutations ────────────────────────────────────────────────────

  const createWs = api.workspace.create.useMutation({
    onMutate: async ({ name, description }) => {
      await cancelWs();
      const snapshot = snapshotWs();
      patchWs((p) => p ? [...p, { id: `temp-ws-${Date.now()}`, name, description: description ?? null, starred: false, bases: [] }] : undefined);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => patchWs(() => ctx?.snapshot),
    onSettled: invalidateWs,
  });

  const renameWs = api.workspace.rename.useMutation({
    onMutate: async ({ id, name }) => {
      await cancelWs(); await cancelBases();
      const snapshotW = snapshotWs(); const snapshotB = snapshotBases();
      patchWs((p) => p?.map((w) => w.id === id ? { ...w, name } : w));
      patchBases((p) => p?.map((b) => b.workspaceId !== id ? b : { ...b, workspace: b.workspace ? { ...b.workspace, name } : { id, name } }));
      return { snapshotW, snapshotB };
    },
    onError: (_e, _v, ctx) => { patchWs(() => ctx?.snapshotW); patchBases(() => ctx?.snapshotB); },
    onSettled: () => { invalidateWs(); invalidateBases(); },
  });

  const updateDesc = api.workspace.updateDescription.useMutation({
    onMutate: async ({ id, description }) => {
      await cancelWs();
      const snapshot = snapshotWs();
      patchWs((p) => p?.map((w) => w.id === id ? { ...w, description: description ?? null } : w));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => patchWs(() => ctx?.snapshot),
    onSettled: invalidateWs,
  });

  const deleteWs = api.workspace.delete.useMutation({
    onMutate: async ({ id }) => {
      await cancelWs(); await cancelBases();
      const snapshotW = snapshotWs(); const snapshotB = snapshotBases();
      patchWs((p) => p?.filter((w) => w.id !== id));
      patchBases((p) => p?.map((b) => b.workspaceId !== id ? b : { ...b, workspaceId: null, workspace: null }));
      return { snapshotW, snapshotB };
    },
    onError: (_e, _v, ctx) => { patchWs(() => ctx?.snapshotW); patchBases(() => ctx?.snapshotB); },
    onSettled: () => { invalidateWs(); invalidateBases(); },
  });

  const toggleWsStar = api.workspace.toggleStar.useMutation({
    onMutate: async ({ id, starred }) => {
      await cancelWs();
      const snapshot = snapshotWs();
      patchWs((p) => p?.map((w) => w.id === id ? { ...w, starred } : w));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => patchWs(() => ctx?.snapshot),
    onSettled: invalidateWs,
  });

  // ── UI state ───────────────────────────────────────────────────────────────
  const [page, setPage]             = useState<PageView>("home");
  const [dispMode, setDispMode]     = useState<DispMode>("list");
  const [sidebarOpen, setSidebar]   = useState(true);
  const [wsExpanded, setWsExpanded] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [modal, setModal]           = useState<ModalState>(null);
  const [newName, setNewName]       = useState("");
  const [newDesc, setNewDesc]       = useState("");
  const [moveTo, setMoveTo]         = useState("");

  // ── Ctrl+K to open search ─────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────
  const currentWorkspace = useMemo(
    () => (page !== "home" && page !== "starred" && page !== "workspaces")
      ? (workspaces.find((w) => w.id === page) ?? null)
      : null,
    [page, workspaces],
  );

  const filteredBases = useMemo(() => {
    const list = bases as BaseItem[];
    if (page === "starred")    return list.filter((b) => b.starred);
    if (page === "workspaces") return list;
    if (page === "home")       return list;
    return list.filter((b) => b.workspaceId === page);
  }, [bases, page]);

  const filteredWs  = useMemo(() => workspaces as WsFull[], [workspaces]);

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

      <header className="fixed top-0 left-0 right-0 h-[56px] bg-white border-b border-[#e0e0e0] flex items-center z-30">
        <div className={`h-full flex items-center flex-shrink-0 ${sidebarOpen ? "w-[300px] px-3 gap-2" : "w-[48px] justify-center"}`}>
          {sidebarOpen ? (
            <>
              <button onClick={() => setSidebar(false)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f0f0ef] text-[#555] transition-colors flex-shrink-0">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2 3.5h11M2 7.5h11M2 11.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
              <button onClick={() => setPage("home")}
                className="flex items-center gap-2 ml-1 overflow-hidden hover:opacity-80 transition-opacity">
                <svg width="22" height="22" viewBox="0 0 22 22" className="flex-shrink-0">
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ff6b35"/>
                      <stop offset="50%" stopColor="#ffd700"/>
                      <stop offset="100%" stopColor="#0080ff"/>
                    </linearGradient>
                  </defs>
                  <rect width="22" height="22" rx="4" fill="url(#g1)"/>
                  <path d="M4 7.5l7-3.2 7 3.2v2L11 13l-7-3.5V7.5z" fill="white" fillOpacity="0.9"/>
                  <path d="M4 9.5v3.5l7 3.2V13L4 9.5z" fill="white" fillOpacity="0.7"/>
                  <path d="M18 9.5v3.5l-7 3.2V13L18 9.5z" fill="white" fillOpacity="0.5"/>
                </svg>
                <span className="font-bold text-[#172b4d] text-[15px] truncate">Airtable</span>
              </button>
            </>
          ) : (
            <button onClick={() => setSidebar(true)} className="hover:opacity-80 transition-opacity">
              <svg width="22" height="22" viewBox="0 0 22 22">
                <defs>
                  <linearGradient id="g1c" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ff6b35"/>
                    <stop offset="50%" stopColor="#ffd700"/>
                    <stop offset="100%" stopColor="#0080ff"/>
                  </linearGradient>
                </defs>
                <rect width="22" height="22" rx="4" fill="url(#g1c)"/>
                <path d="M4 7.5l7-3.2 7 3.2v2L11 13l-7-3.5V7.5z" fill="white" fillOpacity="0.9"/>
                <path d="M4 9.5v3.5l7 3.2V13L4 9.5z" fill="white" fillOpacity="0.7"/>
                <path d="M18 9.5v3.5l-7 3.2V13L18 9.5z" fill="white" fillOpacity="0.5"/>
              </svg>
            </button>
          )}
        </div>
        <div className="h-full flex-1 flex items-center px-6 gap-3">
          <div className="flex-1 flex justify-center">
            <button onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 bg-white border border-[#d8d8d8] rounded-full px-3.5 w-full max-w-[420px] shadow-sm hover:border-[#bbb] transition-colors"
              style={{ height: 32 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#999] flex-shrink-0" stroke="currentColor" strokeWidth="1.5">
                <circle cx="5" cy="5" r="3.5"/><path d="M8 8l2.5 2.5"/>
              </svg>
              <span className="flex-1 text-left text-[13px] text-[#aaa]">Search...</span>
              <span className="text-[11px] text-[#bbb] border border-[#e0e0e0] rounded px-1.5 py-0.5 leading-none flex-shrink-0">ctrl K</span>
            </button>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="w-[28px] h-[28px] rounded-full border border-[#d8d8d8] flex items-center justify-center text-[#555] hover:bg-[#f5f5f4] hover:border-[#bbb] transition-colors"
              title="Help">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5.2 5.2a2 2 0 113.2 1.6C8 7.2 7 7.8 7 9M7 11v.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[#555] hover:bg-[#f5f5f4] transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M8 2a5 5 0 0 1 4.33 7.5L14 12H2l1.67-2.5A5 5 0 0 1 8 2z M6 12a2 2 0 0 0 4 0"/>
              </svg>
            </button>
            <div className="w-[28px] h-[28px] rounded-full bg-[#c0392b] flex items-center justify-center text-white text-[12px] font-bold cursor-pointer select-none">R</div>
          </div>
        </div>
      </header>
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className={`fixed top-[56px] left-0 bottom-0 bg-white border-r border-[#e0e0e0] flex flex-col transition-all duration-200 z-20 overflow-hidden ${sidebarOpen ? "w-[300px]" : "w-[48px]"}`}>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          <NavBtn icon={<HomeIco/>} label="Home"
            active={page === "home"} collapsed={!sidebarOpen} onClick={() => setPage("home")}/>

          <NavBtn icon={<StarIco/>} label="Starred"
            active={page === "starred"} collapsed={!sidebarOpen} onClick={() => setPage("starred")}>
            {sidebarOpen && <ChevronRight className="text-[#aaa]"/>}
          </NavBtn>

          <NavBtn icon={<SharedIco/>} label="Shared"
            active={false} collapsed={!sidebarOpen} onClick={() => {}}/>

          <NavBtn
            icon={<WsIco/>} label="Workspaces"
            active={page === "workspaces" || !!currentWorkspace}
            collapsed={!sidebarOpen}
            onClick={() => {
              if (!sidebarOpen) { setSidebar(true); setWsExpanded(true); }
              setPage("workspaces");
              setWsExpanded((p) => !p);
            }}>
            {sidebarOpen && (
              <div className="flex items-center gap-1">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); open({ kind: "createWorkspace" }); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      open({ kind: "createWorkspace" });
                    }
                  }}
                  className="w-4 h-4 flex items-center justify-center text-[#aaa] hover:text-[#555] text-sm leading-none cursor-pointer">+</span>
                <ChevronRight className={`transition-transform duration-150 text-[#aaa] ${wsExpanded ? "rotate-90" : ""}`}/>
              </div>
            )}
          </NavBtn>

          {sidebarOpen && wsExpanded && (
            <div className="pl-4 pr-1 space-y-0.5">
              {(workspaces as WsFull[]).map((ws) => (
                <button key={ws.id} onClick={() => setPage(ws.id)}
                  className={`w-full flex items-center gap-2 px-2 py-[5px] rounded text-[13px] transition-colors text-left ${
                    page === ws.id
                      ? "bg-[#f0f0ef] text-[#172b4d] font-medium"
                      : "text-[#555] hover:bg-[#f5f5f4] hover:text-[#172b4d]"
                  }`}>
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.starred && <span className="text-yellow-400 text-[10px]">★</span>}
                </button>
              ))}
              <button onClick={() => open({ kind: "createWorkspace" })}
                className="w-full flex items-center gap-1.5 px-2 py-[5px] rounded text-[12px] text-[#aaa] hover:text-[#555] hover:bg-[#f5f5f4] transition-colors">
                <span className="text-sm leading-none font-light">+</span> Add workspace
              </button>
            </div>
          )}
        </nav>

        {/* Footer links */}
        {sidebarOpen && (
          <div className="border-t border-[#e0e0e0] px-2 py-2 space-y-0.5">
            {["Templates and apps", "Marketplace", "Import"].map((lbl) => (
              <button key={lbl} className="w-full flex items-center px-2 py-[6px] rounded text-[13px] text-[#555] hover:bg-[#f5f5f4] hover:text-[#374151] transition-colors text-left">
                {lbl}
              </button>
            ))}
          </div>
        )}

        {/* Create button */}
        <div className={`flex-shrink-0 border-t border-[#e0e0e0] ${sidebarOpen ? "p-3" : "p-2"}`}>
          <button onClick={() => open({ kind: "createBase" })}
            className="w-full flex items-center justify-center gap-1.5 py-[7px] bg-[#0069ff] hover:bg-[#0055d4] text-white text-[13px] font-medium rounded transition-colors">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5.5 1v9M1 5.5h9"/>
            </svg>
            {sidebarOpen && "Create"}
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-200 pt-[56px] ${sidebarOpen ? "ml-[300px]" : "ml-[48px]"}`}>

        {/* Page body */}
        <div className="flex-1 px-8 py-6 max-w-[1100px] w-full">
          <h1 className="text-[22px] font-bold text-[#172b4d] mb-4">{pageTitle}</h1>

          {/* Error state */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-[13px] text-red-600">
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
              <div className="flex items-center justify-between mb-1">
                <button className="flex items-center gap-1 text-[13px] text-[#374151] hover:text-[#172b4d] transition-colors py-0.5">
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

              {/* Individual workspace header */}
              {currentWorkspace && (
                <div className="flex items-start justify-between mb-4">
                  <div>
                    {currentWorkspace.description && (
                      <p className="text-[13px] text-[#555]">{currentWorkspace.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleWsStar.mutate({ id: currentWorkspace.id, starred: !currentWorkspace.starred })}
                      className={`text-base transition-colors ${currentWorkspace.starred ? "text-yellow-400" : "text-[#ccc] hover:text-yellow-400"}`}>★</button>
                    <ActionBtn title="Rename workspace" onClick={() => open({ kind: "renameWorkspace", id: currentWorkspace.id, value: currentWorkspace.name })}><PencilIco/></ActionBtn>
                    <button onClick={() => open({ kind: "editDesc", id: currentWorkspace.id, value: currentWorkspace.description ?? "" })}
                      className="text-[12px] text-[#0069ff] hover:underline px-2 py-1">Edit description</button>
                    <button onClick={() => open({ kind: "createBase", workspaceId: currentWorkspace.id })}
                      className="text-[12px] bg-[#0069ff] hover:bg-[#0055d4] text-white px-3 py-1.5 rounded transition-colors font-medium">
                      + Create base
                    </button>
                  </div>
                </div>
              )}

              {/* Starred workspaces section */}
              {page === "starred" && starredWs.length > 0 && (
                <div className="mt-2 mb-3">
                  <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest px-1 mb-2">Starred workspaces</p>
                  {starredWs.map((ws) => (
                    <div key={ws.id}
                      className="group flex items-center gap-3 py-2 px-1 hover:bg-white rounded transition-colors cursor-pointer -mx-1"
                      onClick={() => setPage(ws.id)}>
                      <WorkspaceIcon size={24}/>
                      <span className="flex-1 text-[13px] font-medium text-[#172b4d]">{ws.name}</span>
                      <span className="text-yellow-400">★</span>
                      <span className="text-[12px] text-[#aaa]">{ws.bases.length} base{ws.bases.length !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                  <div className="border-b border-[#e0e0e0] my-3"/>
                  <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest px-1 mb-2">Starred bases</p>
                </div>
              )}

              {/* Loading skeleton */}
              {isLoading && (
                <div className="mt-2 space-y-0">
                  <div className="grid grid-cols-[1fr_180px_160px_96px] items-center px-1 py-2 border-b border-[#e0e0e0]">
                    <div className="h-2.5 bg-[#ebebeb] rounded w-12 animate-pulse"/>
                    <div className="h-2.5 bg-[#ebebeb] rounded w-20 animate-pulse"/>
                    <div className="h-2.5 bg-[#ebebeb] rounded w-16 animate-pulse"/>
                    <div/>
                  </div>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="grid grid-cols-[1fr_180px_160px_96px] items-center px-1 py-2.5 border-b border-[#ebebeb] animate-pulse">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-[#e8e8e8]"/>
                        <div className="h-3 bg-[#ebebeb] rounded flex-1 max-w-[200px]"/>
                      </div>
                      <div className="h-3 bg-[#ebebeb] rounded w-28"/>
                      <div className="h-3 bg-[#ebebeb] rounded w-24"/>
                      <div/>
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
                  <p className="text-[13px] text-[#888]">
                    {page === "starred" ? "Nothing starred yet — star a base or workspace to pin it here." :
                     page === "home"    ? "No bases yet — click Create to get started." :
                                         "No bases in this workspace yet."}
                  </p>
                  {currentWorkspace && (
                    <button onClick={() => open({ kind: "createBase", workspaceId: currentWorkspace.id })}
                      className="mt-4 text-[12px] bg-[#0069ff] hover:bg-[#0055d4] text-white px-4 py-2 rounded transition-colors font-medium">
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

      {/* ── Search Modal ─────────────────────────────────────────────────────── */}
      {searchOpen && (
        <SearchModal
          bases={bases as BaseItem[]}
          workspaces={workspaces as WsFull[]}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
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
                <label className="block text-[12px] text-[#555] mb-1.5">
                  {modal.kind === "renameWorkspace" ? "Workspace name" : "Base name"}
                </label>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") close(); }}
                  className="w-full border border-[#d8d8d8] rounded px-3 py-2 text-[13px] outline-none focus:border-[#0069ff] focus:ring-2 focus:ring-[#0069ff]/10 transition-colors"
                  placeholder={modal.kind === "renameWorkspace" ? "Workspace name…" : "Base name…"}/>
              </div>
            )}

            {modal.kind === "createWorkspace" && (
              <>
                <div className="mb-3">
                  <label className="block text-[12px] text-[#555] mb-1.5">Workspace name</label>
                  <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") close(); }}
                    className="w-full border border-[#d8d8d8] rounded px-3 py-2 text-[13px] outline-none focus:border-[#0069ff] focus:ring-2 focus:ring-[#0069ff]/10 transition-colors"
                    placeholder="My workspace…"/>
                </div>
                <div className="mb-4">
                  <label className="block text-[12px] text-[#555] mb-1.5">Description <span className="text-[#bbb]">(optional)</span></label>
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2}
                    className="w-full border border-[#d8d8d8] rounded px-3 py-2 text-[13px] outline-none focus:border-[#0069ff] transition-colors resize-none"
                    placeholder="Describe this workspace…"/>
                </div>
              </>
            )}

            {modal.kind === "editDesc" && (
              <div className="mb-4">
                <textarea autoFocus value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3}
                  className="w-full border border-[#d8d8d8] rounded px-3 py-2 text-[13px] outline-none focus:border-[#0069ff] transition-colors resize-none"
                  placeholder="Describe this workspace…"/>
              </div>
            )}

            {modal.kind === "moveBase" && (
              <div className="mb-4">
                <label className="block text-[12px] text-[#555] mb-1.5">Select workspace</label>
                <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}
                  className="w-full border border-[#d8d8d8] rounded px-3 py-2 text-[13px] outline-none focus:border-[#0069ff] bg-white transition-colors">
                  <option value="">— No workspace —</option>
                  {(workspaces as WsFull[]).map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={close}
                className="px-4 py-2 text-[13px] text-[#555] hover:bg-[#f5f5f4] rounded transition-colors">
                Cancel
              </button>
              <button onClick={submit}
                className="px-4 py-2 text-[13px] font-medium bg-[#0069ff] hover:bg-[#0055d4] text-white rounded transition-colors">
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
  const groups = groupByTime(bases);
  const cols = showWorkspace ? "grid-cols-[1fr_180px_160px_88px]" : "grid-cols-[1fr_180px_88px]";

  return (
    <div>
      {/* Column headers */}
      <div className={`grid items-center px-1 py-2 text-[11px] font-medium text-[#888] border-b border-[#e0e0e0] ${cols}`}>
        <span className="pl-1">Name</span>
        <span>Last opened</span>
        {showWorkspace && <span>Workspace</span>}
        <span/>
      </div>

      {/* Time-grouped rows */}
      {groups.map(({ label, items }) => (
        <div key={label}>
          {/* Group label */}
          <div className="px-1 pt-3 pb-1 text-[11px] font-medium text-[#888]">
            {label}
          </div>
          {items.map((base) => (
            <div key={base.id}
              className={`group grid items-center px-1 py-2 border-b border-[#ebebeb] hover:bg-white transition-colors -mx-1 rounded-sm ${cols}`}>
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                <BaseIcon base={base} size={24}/>
                {base.id.startsWith("temp-") ? (
                  <span className="text-[13px] font-medium text-[#9ca3af] truncate flex items-center gap-1.5">
                    {base.name}
                    <span className="w-2.5 h-2.5 border border-[#ccc] border-t-[#888] rounded-full animate-spin flex-shrink-0"/>
                  </span>
                ) : (
                  <Link href={`/base/${base.id}`}
                    className="text-[13px] font-medium text-[#172b4d] hover:text-[#0069ff] truncate transition-colors">
                    {base.name}
                  </Link>
                )}
                <button onClick={() => onStar(base)}
                  className={`text-[13px] flex-shrink-0 transition-all ${
                    base.starred ? "text-yellow-400" : "opacity-0 group-hover:opacity-100 text-[#ddd] hover:text-yellow-400"
                  }`}>★</button>
              </div>
              <span className="text-[12px] text-[#888]">{timeAgo(base.lastOpenedAt)}</span>
              {showWorkspace && <span className="text-[12px] text-[#555]">{base.workspace?.name ?? "—"}</span>}
              <div className="flex items-center justify-end gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionBtn title="Rename"          onClick={() => onRename(base)}><PencilIco/></ActionBtn>
                <ActionBtn title="Move workspace"  onClick={() => onMove(base)}><MoveIco/></ActionBtn>
                <ActionBtn title="Delete" danger   onClick={() => onDelete(base.id)}><TrashIco/></ActionBtn>
              </div>
            </div>
          ))}
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
                  }`}>★</button>
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
              View workspace →
            </button>
          </div>

          {ws.bases.length === 0 ? (
            <p className="ml-[44px] text-[12px] text-[#aaa] py-2">
              No bases.{" "}
              <button onClick={() => onCreateBase(ws.id)} className="text-[#0069ff] hover:underline">Create one →</button>
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
                      className={`px-1 text-sm transition-colors ${base.starred ? "text-yellow-400" : "text-[#ddd] hover:text-yellow-400"}`}>★</button>
                    <ActionBtn title="Rename"            onClick={() => onRenameBase(base)}><PencilIco size={10}/></ActionBtn>
                    <ActionBtn title="Move workspace"    onClick={() => onMoveBase(base)}><MoveIco size={10}/></ActionBtn>
                    <ActionBtn title="Delete" danger     onClick={() => onDeleteBase(base.id)}><TrashIco size={10}/></ActionBtn>
                  </div>
                </div>
              ))}
              {ws.bases.length > 6 && (
                <button onClick={() => onNavigate(ws.id)} className="ml-[30px] text-[12px] text-[#0069ff] hover:underline py-1">
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
