"use client";

import { BaseGridView } from "~/app/_components/home/BaseGridView";
import { BaseListView } from "~/app/_components/home/BaseListView";
import { SearchModal } from "~/app/_components/home/SearchModal";
import { WorkspacesOverview } from "~/app/_components/home/WorkspacesOverview";
import { ChevronRight, GridIco, HomeIco, ListIco, PencilIco, SharedIco, StarIco, WsIco } from "~/app/_components/home/icons";
import type { BaseItem, WsFull } from "~/app/_components/home/types";
import { ActionBtn, NavBtn, WorkspaceIcon } from "~/app/_components/home/ui";
import { useHomePageController } from "~/app/_components/home/useHomePageController";

export default function HomePage() {
  const {
    bases,
    workspaces,
    isLoading,
    error,
    page,
    setPage,
    dispMode,
    setDispMode,
    sidebarOpen,
    setSidebar,
    wsExpanded,
    setWsExpanded,
    searchOpen,
    setSearchOpen,
    modal,
    newName,
    setNewName,
    newDesc,
    setNewDesc,
    moveTo,
    setMoveTo,
    currentWorkspace,
    filteredBases,
    filteredWs,
    starredWs,
    open,
    close,
    submit,
    pageTitle,
    deleteBase,
    toggleBaseStar,
    deleteWs,
    toggleWsStar,
  } = useHomePageController();

  return (
    <div className="min-h-screen flex bg-[#f9fafb]"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif", fontSize: "13px" }}>

      <header className="fixed top-0 left-0 right-0 h-[56px] bg-white border-b border-[#e0e0e0] flex items-center z-30">
        <div className={`h-full flex items-center flex-shrink-0 ${sidebarOpen ? "w-[300px] px-3 gap-2" : "w-[56px] justify-center"}`}>
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

      <aside className={`fixed top-[56px] left-0 bottom-0 bg-white border-r border-[#e0e0e0] flex flex-col transition-all duration-200 z-20 overflow-hidden ${sidebarOpen ? "w-[300px]" : "w-[56px]"}`}>
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          <NavBtn icon={<HomeIco/>} label="Home"
            active={page === "home"} collapsed={!sidebarOpen} onClick={() => setPage("home")}/>

          <NavBtn icon={<StarIco/>} label="Starred"
            active={page === "starred"} collapsed={!sidebarOpen} onClick={() => setPage("starred")}>
            {sidebarOpen && <ChevronRight className="text-[#aaa]"/>}
          </NavBtn>

          <NavBtn icon={<SharedIco/>} label="Shared"
            active={false} collapsed={!sidebarOpen} onClick={() => void 0}/>

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
                  {ws.starred && <span className="text-yellow-400 text-[10px]"><StarIco/></span>}
                </button>
              ))}
              <button onClick={() => open({ kind: "createWorkspace" })}
                className="w-full flex items-center gap-1.5 px-2 py-[5px] rounded text-[12px] text-[#aaa] hover:text-[#555] hover:bg-[#f5f5f4] transition-colors">
                <span className="text-sm leading-none font-light">+</span> Add workspace
              </button>
            </div>
          )}
        </nav>

        {sidebarOpen && (
          <div className="border-t border-[#e0e0e0] px-2 py-2 space-y-0.5">
            {["Templates and apps", "Marketplace", "Import"].map((lbl) => (
              <button key={lbl} className="w-full flex items-center px-2 py-[6px] rounded text-[13px] text-[#555] hover:bg-[#f5f5f4] hover:text-[#374151] transition-colors text-left">
                {lbl}
              </button>
            ))}
          </div>
        )}

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

      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-200 pt-[56px] ${sidebarOpen ? "ml-[300px]" : "ml-[56px]"}`}>
        <div className="flex-1 px-8 py-6 max-w-[1100px] w-full">
          <h1 className="text-[27px] font-bold text-[#172b4d] mb-4">{pageTitle}</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-[13px] text-red-600">
              Failed to load data. Please refresh the page.
            </div>
          )}

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

          {page !== "workspaces" && (
            <>
              <div className="flex items-center justify-between mb-1">
                <button className="flex items-center gap-1 text-[15px] text-[#374151] hover:text-[#172b4d] transition-colors py-0.5">
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

              {currentWorkspace && (
                <div className="flex items-start justify-between mb-4">
                  <div>
                    {currentWorkspace.description && (
                      <p className="text-[13px] text-[#555]">{currentWorkspace.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleWsStar.mutate({ id: currentWorkspace.id, starred: !currentWorkspace.starred })}
                      className={`text-base transition-colors ${currentWorkspace.starred ? "text-yellow-400" : "text-[#ccc] hover:text-yellow-400"}`}
                    >
                      <StarIco/>
                    </button>
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

              {page === "starred" && starredWs.length > 0 && (
                <div className="mt-2 mb-3">
                  <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest px-1 mb-2">Starred workspaces</p>
                  {starredWs.map((ws) => (
                    <div key={ws.id}
                      className="group flex items-center gap-3 py-2 px-1 hover:bg-white rounded transition-colors cursor-pointer -mx-1"
                      onClick={() => setPage(ws.id)}>
                      <WorkspaceIcon size={24}/>
                      <span className="flex-1 text-[13px] font-medium text-[#172b4d]">{ws.name}</span>
                      <span className="text-yellow-400"><StarIco/></span>
                      <span className="text-[12px] text-[#aaa]">{ws.bases.length} base{ws.bases.length !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                  <div className="border-b border-[#e0e0e0] my-3"/>
                  <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest px-1 mb-2">Starred bases</p>
                </div>
              )}

              {isLoading && (
                <div className="mt-2 space-y-0">
                  <div className="grid grid-cols-[1fr_180px_160px_96px] items-center px-1 py-2 border-b border-[#e0e0e0]">
                    <div className="h-2.5 bg-[#ebebeb] rounded w-12 animate-pulse"/>
                    <div className="h-2.5 bg-[#ebebeb] rounded w-20 animate-pulse"/>
                    <div className="h-2.5 bg-[#ebebeb] rounded w-16 animate-pulse"/>
                    <div/>
                  </div>
                  {Array.from({ length: 4 }).map((_, i) => (
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

              {!isLoading && !error && filteredBases.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-[#bbb]">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-4 opacity-25" stroke="currentColor" strokeWidth="1.2">
                    <rect x="6" y="10" width="36" height="30" rx="3"/><path d="M6 18h36M16 10v8"/>
                  </svg>
                  <p className="text-[13px] text-[#888]">
                    {page === "starred" ? "Nothing starred yet — star a base or workspace to pin it here." :
                      page === "home" ? "No bases yet — click Create to get started." :
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

      {searchOpen && (
        <SearchModal
          bases={bases as BaseItem[]}
          workspaces={workspaces as WsFull[]}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[1px]" onClick={close}>
          <div className="bg-white rounded-xl border border-[#e0e0e0] shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-semibold text-[#172b4d] mb-5">
              {modal.kind === "createBase" ? "Create a base" :
                modal.kind === "createWorkspace" ? "Create a workspace" :
                  modal.kind === "renameBase" ? "Rename base" :
                    modal.kind === "renameWorkspace" ? "Rename workspace" :
                      modal.kind === "editDesc" ? "Edit description" :
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
                  placeholder={modal.kind === "renameWorkspace" ? "Workspace name..." : "Base name..."}/>
              </div>
            )}

            {modal.kind === "createWorkspace" && (
              <>
                <div className="mb-3">
                  <label className="block text-[12px] text-[#555] mb-1.5">Workspace name</label>
                  <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") close(); }}
                    className="w-full border border-[#d8d8d8] rounded px-3 py-2 text-[13px] outline-none focus:border-[#0069ff] focus:ring-2 focus:ring-[#0069ff]/10 transition-colors"
                    placeholder="My workspace..."/>
                </div>
                <div className="mb-4">
                  <label className="block text-[12px] text-[#555] mb-1.5">Description <span className="text-[#bbb]">(optional)</span></label>
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2}
                    className="w-full border border-[#d8d8d8] rounded px-3 py-2 text-[13px] outline-none focus:border-[#0069ff] transition-colors resize-none"
                    placeholder="Describe this workspace..."/>
                </div>
              </>
            )}

            {modal.kind === "editDesc" && (
              <div className="mb-4">
                <textarea autoFocus value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3}
                  className="w-full border border-[#d8d8d8] rounded px-3 py-2 text-[13px] outline-none focus:border-[#0069ff] transition-colors resize-none"
                  placeholder="Describe this workspace..."/>
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
                {modal.kind === "createBase" ? "Create base" :
                 modal.kind === "createWorkspace" ? "Create workspace" :
                 modal.kind === "moveBase" ? "Move" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

