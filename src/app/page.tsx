"use client";
// src/app/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { useState } from "react";

type NavPage = "home" | "starred";

export default function HomePage() {
  const utils = api.useUtils();
  const { data: bases, isLoading } = api.base.getAll.useQuery();

  const createBase = api.base.create.useMutation({ onSuccess: () => void utils.base.getAll.invalidate() });
  const renameBase = api.base.rename.useMutation({
    onMutate: ({ id, name }) => utils.base.getAll.setData(undefined, (prev) =>
      prev?.map((b) => b.id === id ? { ...b, name } : b)
    ),
    onSettled: () => void utils.base.getAll.invalidate(),
  });
  const deleteBase = api.base.delete.useMutation({
    onMutate: ({ id }) => utils.base.getAll.setData(undefined, (prev) => prev?.filter((b) => b.id !== id)),
    onSettled: () => void utils.base.getAll.invalidate(),
  });
  const toggleStar = api.base.toggleStar.useMutation({
    onMutate: ({ id, starred }) => utils.base.getAll.setData(undefined, (prev) =>
      prev?.map((b) => b.id === id ? { ...b, starred } : b)
    ),
    onSettled: () => void utils.base.getAll.invalidate(),
  });

  const [page, setPage]           = useState<NavPage>("home");
  const [sidebarOpen, setSidebar] = useState(true);
  const [creating, setCreating]   = useState(false);
  const [newBaseName, setNewBaseName] = useState("");
  const [renamingBase, setRenamingBase] = useState<{ id: string; value: string } | null>(null);

  function handleCreate() {
    if (!newBaseName.trim()) return;
    createBase.mutate({ name: newBaseName.trim() });
    setNewBaseName(""); setCreating(false);
  }

  function commitRename() {
    if (!renamingBase?.value.trim()) { setRenamingBase(null); return; }
    renameBase.mutate({ id: renamingBase.id, name: renamingBase.value.trim() });
    setRenamingBase(null);
  }

  const displayed = bases?.filter((b) => page === "starred" ? b.starred : true) ?? [];

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white flex" style={{ fontFamily: "'DM Mono', monospace" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`flex-shrink-0 border-r border-white/10 flex flex-col transition-all duration-200 ${sidebarOpen ? "w-52" : "w-12"} overflow-hidden`}>
        {/* Logo + collapse button */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/10">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#5b6af7] flex items-center justify-center text-xs font-bold flex-shrink-0">A</div>
              <span className="text-xs font-medium tracking-widest uppercase text-white/50 truncate">Airtable</span>
            </div>
          )}
          <button onClick={() => setSidebar((p) => !p)}
            className="text-white/30 hover:text-white/70 transition-colors text-sm p-1 rounded hover:bg-white/5 flex-shrink-0 ml-auto"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
            {sidebarOpen ? "◂" : "▸"}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-2 space-y-0.5">
          {([
            { id: "home",    label: "Home",    icon: "⊞" },
            { id: "starred", label: "Starred", icon: "★" },
          ] as { id: NavPage; label: string; icon: string }[]).map((item) => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-sm transition-colors ${page === item.id ? "bg-[#5b6af7]/20 text-[#5b6af7]" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
              <span className="flex-shrink-0 text-base w-5 text-center">{item.icon}</span>
              {sidebarOpen && <span className="truncate text-xs">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* New base button (at bottom of sidebar) */}
        {sidebarOpen && (
          <div className="p-3 border-t border-white/10">
            <button onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-xs font-medium transition-colors">
              + New Base
            </button>
          </div>
        )}
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">{page === "starred" ? "Starred" : "Home"}</h1>
            <p className="text-white/30 text-xs mt-0.5">
              {page === "starred" ? "Your starred bases" : "All your bases"}
            </p>
          </div>
          {!sidebarOpen && (
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-sm font-medium transition-colors">
              + New Base
            </button>
          )}
        </div>

        <div className="px-8 py-8 flex-1 overflow-auto">
          {/* Modals */}
          {(creating || renamingBase) && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-[#1a1a1e] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                <h2 className="text-base font-semibold mb-4">{creating ? "New Base" : "Rename Base"}</h2>
                <input autoFocus
                  className="w-full bg-[#0e0e10] border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-[#5b6af7] mb-4"
                  placeholder="Base name…"
                  value={creating ? newBaseName : renamingBase!.value}
                  onChange={(e) => creating ? setNewBaseName(e.target.value) : setRenamingBase({ ...renamingBase!, value: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") creating ? handleCreate() : commitRename(); if (e.key === "Escape") { setCreating(false); setRenamingBase(null); } }}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setCreating(false); setRenamingBase(null); }} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
                  <button onClick={creating ? handleCreate : commitRename}
                    className="px-4 py-2 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-sm font-medium transition-colors">
                    {creating ? "Create" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-24 text-white/30">
              <div className="text-4xl mb-4">{page === "starred" ? "★" : "⬡"}</div>
              <p className="text-sm">{page === "starred" ? "No starred bases yet." : "No bases yet — create your first one."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayed.map((base) => (
                <div key={base.id} className="group relative">
                  <Link href={`/base/${base.id}`}>
                    <div className="h-44 rounded-xl border border-white/10 bg-[#1a1a1e] group-hover:border-[#5b6af7]/60 group-hover:bg-[#1e1e28] transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer">
                      <div>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5b6af7] to-[#9b6af7] mb-3 flex items-center justify-center text-sm font-bold">
                          {base.name[0]?.toUpperCase()}
                        </div>
                        <h2 className="font-semibold text-base group-hover:text-[#5b6af7] transition-colors line-clamp-2">{base.name}</h2>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/30">
                        <span>{base.tables.length} table{base.tables.length !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>{base.tables.reduce((s, t) => s + (t._count?.rows ?? 0), 0)} rows</span>
                      </div>
                    </div>
                  </Link>

                  {/* Card actions */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.preventDefault(); toggleStar.mutate({ id: base.id, starred: !base.starred }); }}
                      className={`p-1.5 rounded text-xs transition-all ${base.starred ? "bg-yellow-500/20 text-yellow-400" : "bg-white/10 text-white/40 hover:text-yellow-400 hover:bg-yellow-500/10"}`}
                      title={base.starred ? "Unstar" : "Star"}>★</button>
                    <button onClick={(e) => { e.preventDefault(); setRenamingBase({ id: base.id, value: base.name }); }}
                      className="p-1.5 rounded bg-white/10 hover:bg-[#5b6af7] text-white/50 hover:text-white transition-all text-xs" title="Rename">✎</button>
                    <button onClick={(e) => { e.preventDefault(); deleteBase.mutate({ id: base.id }); }}
                      className="p-1.5 rounded bg-white/10 hover:bg-red-500/70 text-white/50 hover:text-white transition-all text-xs" title="Delete">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}