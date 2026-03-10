"use client";

// src/app/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const { data: bases, isLoading, refetch } = api.base.getAll.useQuery();
  const createBase = api.base.create.useMutation({ onSuccess: () => void refetch() });
  const renameBase = api.base.rename.useMutation({ onSuccess: () => void refetch() });
  const deleteBase = api.base.delete.useMutation({ onSuccess: () => void refetch() });

  const [creating, setCreating] = useState(false);
  const [newBaseName, setNewBaseName] = useState("");
  const [renamingBase, setRenamingBase] = useState<{ id: string; value: string } | null>(null);

  function handleCreate() {
    if (!newBaseName.trim()) return;
    createBase.mutate({ name: newBaseName.trim() });
    setNewBaseName("");
    setCreating(false);
  }

  function commitRename() {
    if (!renamingBase?.value.trim()) { setRenamingBase(null); return; }
    renameBase.mutate({ id: renamingBase.id, name: renamingBase.value.trim() });
    setRenamingBase(null);
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white" style={{ fontFamily: "'DM Mono', monospace" }}>
      <nav className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#5b6af7] flex items-center justify-center text-xs font-bold">A</div>
          <span className="text-sm font-medium tracking-widest uppercase text-white/60">Airtable Clone</span>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-sm font-medium transition-colors"
        >
          + New Base
        </button>
      </nav>

      <div className="px-8 py-10 max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-1">Home</h1>
          <p className="text-white/40 text-sm">All your bases in one place</p>
        </div>

        {/* Create modal */}
        {creating && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a1a1e] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
              <h2 className="text-lg font-semibold mb-4">New Base</h2>
              <input
                autoFocus
                className="w-full bg-[#0e0e10] border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-[#5b6af7] mb-4"
                placeholder="Base name..."
                value={newBaseName}
                onChange={(e) => setNewBaseName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-sm font-medium transition-colors">Create</button>
              </div>
            </div>
          </div>
        )}

        {/* Rename modal */}
        {renamingBase && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a1a1e] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
              <h2 className="text-lg font-semibold mb-4">Rename Base</h2>
              <input
                autoFocus
                className="w-full bg-[#0e0e10] border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-[#5b6af7] mb-4"
                value={renamingBase.value}
                onChange={(e) => setRenamingBase({ ...renamingBase, value: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingBase(null); }}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setRenamingBase(null)} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
                <button onClick={commitRename} className="px-4 py-2 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-sm font-medium transition-colors">Save</button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : bases?.length === 0 ? (
          <div className="text-center py-24 text-white/30">
            <div className="text-5xl mb-4">⬡</div>
            <p className="text-sm">No bases yet. Create your first one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bases?.map((base) => (
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
                      <span>{base.tables.reduce((sum, t) => sum + (t._count?.rows ?? 0), 0)} rows</span>
                    </div>
                  </div>
                </Link>

                {/* Action buttons — appear on card hover */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setRenamingBase({ id: base.id, value: base.name });
                    }}
                    className="p-1.5 rounded bg-white/10 hover:bg-[#5b6af7] text-white/50 hover:text-white transition-all text-xs"
                    title="Rename base"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      deleteBase.mutate({ id: base.id });
                    }}
                    className="p-1.5 rounded bg-white/10 hover:bg-red-500/70 text-white/50 hover:text-white transition-all text-xs"
                    title="Delete base"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}