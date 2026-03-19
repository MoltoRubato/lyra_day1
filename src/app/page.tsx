"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseGridView } from "~/app/_components/home/BaseGridView";
import { BaseListView } from "~/app/_components/home/BaseListView";
import { SearchModal } from "~/app/_components/home/SearchModal";
import { StarredGridView, StarredListView } from "~/app/_components/home/StarredViews";
import { UserAccountMenu } from "~/app/_components/home/UserAccountMenu";
import { WorkspacesOverview } from "~/app/_components/home/WorkspacesOverview";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { ChevronRight, GridIco, HomeIco, ListIco, PencilIco, SharedIco, SidebarStarIco, StarIco, WsIco } from "~/app/_components/home/icons";
import type { BaseItem, WsFull } from "~/app/_components/home/types";
import { ActionBtn, BaseIcon, NavBtn } from "~/app/_components/home/ui";
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
    createBaseWorkspaceId,
    setCreateBaseWorkspaceId,
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
  const [starredExpanded, setStarredExpanded] = useState(true);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);
  const starredBases = useMemo(
    () =>
      [...(bases as BaseItem[])]
        .filter((base) => base.starred)
        .sort((a, b) => {
          const at = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
          const bt = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
          return bt - at;
        }),
    [bases],
  );
  const selectedWorkspaceName =
    (workspaces as WsFull[]).find((ws) => ws.id === createBaseWorkspaceId)?.name ?? "No workspace";

  useEffect(() => {
    if (!(modal?.kind === "createBase" && workspaceMenuOpen)) return;
    function onPointerDown(e: MouseEvent) {
      if (!workspaceMenuRef.current) return;
      const target = e.target as Node;
      if (!workspaceMenuRef.current.contains(target)) setWorkspaceMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setWorkspaceMenuOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modal, workspaceMenuOpen]);

  return (
    <div
      className="flex min-h-screen bg-[#f9fafb]"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
    >

      <header className="fixed left-0 right-0 top-0 z-30 flex h-[56px] items-center border-b border-[#d8dbe1] bg-white">
        <div className="flex h-full w-[300px] flex-shrink-0 items-center gap-2 px-3">
          <button
            onClick={() => setSidebar((prev) => !prev)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-[#555] transition-colors hover:bg-[#f0f0ef]"
          >
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
              <path d="M2 3.5h11M2 7.5h11M2 11.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={() => setPage("home")} className="flex items-center ml-1 overflow-hidden hover:opacity-80 transition-opacity">
            <img
              src="/airtable_assets/Airtable_Logo.svg.png"
              alt="Airtable"
              className="flex-shrink-0"
              style={{ width: 102, height: 22.2 }}
              draggable={false}
            />
          </button>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 w-[354px] max-w-[calc(100vw-640px)] -translate-x-1/2 -translate-y-1/2">
          <button onClick={() => setSearchOpen(true)}
            className="pointer-events-auto flex h-[32px] w-full items-center gap-2 rounded-full border border-[#d8d8d8] bg-white px-4 shadow-sm transition-colors hover:border-[#bbb]">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 text-[#999]" stroke="currentColor" strokeWidth="1.5">
              <circle cx="5" cy="5" r="3.5"/><path d="M8 8l2.5 2.5"/>
            </svg>
            <span className="flex-1 text-left text-[13px] text-[#8f96a3]">Search...</span>
            <span className="flex-shrink-0 rounded border border-[#e0e0e0] px-1.5 py-0.5 text-[13px] leading-none text-[#a0a7b2]">ctrl K</span>
          </button>
        </div>
        <div className="flex h-full flex-1 items-center justify-end pr-6">
          <UserAccountMenu />
        </div>
      </header>

      <aside className={`fixed top-[56px] left-0 bottom-0 bg-white border-r border-[#e0e0e0] transition-all duration-200 z-20 overflow-hidden ${sidebarOpen ? "w-[300px]" : "w-[56px]"}`}>
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <nav className={`flex min-h-full flex-col ${sidebarOpen ? "p-3" : "p-2"}`}>
            <div className="space-y-0.5">
              <NavBtn icon={<HomeIco/>} label="Home"
                active={page === "home"} collapsed={!sidebarOpen} onClick={() => setPage("home")}/>

              <NavBtn icon={<SidebarStarIco />} label="Starred"
                active={page === "starred"} collapsed={!sidebarOpen} onClick={() => {
                  if (!sidebarOpen) {
                    setSidebar(true);
                    setStarredExpanded(true);
                  }
                  if (page === "starred") {
                    setStarredExpanded((prev) => !prev);
                  } else {
                    setStarredExpanded(true);
                  }
                  setPage("starred");
                }}>
                {sidebarOpen && <ChevronRight className={`text-[#aaa] transition-transform duration-150 ${starredExpanded ? "rotate-90" : ""}`}/>}
              </NavBtn>

              {sidebarOpen && starredExpanded && (
                <div>
                  {[...starredWs, ...starredBases].map((entry) =>
                    "bases" in entry ? (
                      <button
                        key={`starred-ws-${entry.id}`}
                        onClick={() => setPage(entry.id)}
                        className="mb-1 flex h-[35.5px] w-full items-center rounded px-3 text-left text-[13px] font-normal leading-[19.5px] text-[#1d1f25] transition-colors hover:bg-[#f5f6f8]"
                      >
                        <span className="mr-2 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[6px] bg-[#eef1f4]">
                          <WsIco size={16} />
                        </span>
                        <span className="block w-[111.844px] max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                          {entry.name}
                        </span>
                      </button>
                    ) : (
                      <Link
                        key={`starred-base-${entry.id}`}
                        href={`/base/${entry.id}`}
                        className="mb-1 flex h-[35.5px] w-full items-center rounded px-3 text-left text-[13px] font-normal leading-[19.5px] text-[#1d1f25] transition-colors hover:bg-[#f5f6f8]"
                      >
                        <BaseIcon base={entry} size={28} />
                        <span className="ml-2 block w-[111.844px] max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                          {entry.name}
                        </span>
                      </Link>
                    ),
                  )}
                </div>
              )}

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
                      className="flex h-4 w-4 items-center justify-center cursor-pointer text-[#aaa] hover:text-[#555]"><AirtableAssetIcon asset={127} alt="" size={10} /></span>
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
                      {ws.starred && <span className="text-[10px]"><StarIco size={16} active /></span>}
                    </button>
                  ))}
                  <button onClick={() => open({ kind: "createWorkspace" })}
                    className="w-full flex items-center gap-1.5 px-2 py-[5px] rounded text-[12px] text-[#aaa] hover:text-[#555] hover:bg-[#f5f5f4] transition-colors">
                    <AirtableAssetIcon asset={127} alt="" size={10} /> Add workspace
                  </button>
                </div>
              )}
            </div>

            <div className="mt-auto">
              {sidebarOpen && (
                <div className="border-t border-[#e0e0e0] px-2 py-2 space-y-0.5">
                  {[
                    { label: "Templates and apps", asset: 389 },
                    { label: "Marketplace", asset: 91 },
                    { label: "Import", asset: 21 },
                  ].map((item) => (
                    <button key={item.label} className="w-full flex items-center gap-2 px-2 py-[6px] rounded text-[13px] text-[#555] hover:bg-[#f5f5f4] hover:text-[#374151] transition-colors text-left">
                      <AirtableAssetIcon asset={item.asset} alt="" size={14} className="opacity-80" />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              <div className={`border-t border-[#e0e0e0] ${sidebarOpen ? "p-3" : "p-2"}`}>
                <button onClick={() => open({ kind: "createBase" })}
                  className="w-full flex items-center justify-center gap-1.5 py-[7px] bg-[#0069ff] hover:bg-[#0055d4] text-white text-[13px] font-medium rounded transition-colors">
                  <AirtableAssetIcon asset={127} alt="" size={10} className="invert brightness-0 saturate-0" />
                  {sidebarOpen && "Create"}
                </button>
              </div>
            </div>
          </nav>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-200 pt-[56px] ${sidebarOpen ? "ml-[300px]" : "ml-[56px]"}`}>
        <div className="w-full flex-1 px-12 py-8">
          <h1
            className="m-0 pb-6 text-[27px] font-[675] leading-[33.75px] tracking-[-0.16px] text-[#1d1f25]"
            style={{
              fontFamily:
                '"Inter Display", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
              WebkitFontSmoothing: "antialiased",
            }}
          >
            {pageTitle}
          </h1>

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
              <div className="mb-2 flex items-center justify-between">
                <button
                  className={`m-0 flex items-center justify-center gap-1 whitespace-nowrap p-0 text-center text-[15px] font-normal text-[#1d1f25] transition-colors hover:text-[#172b4d] ${
                    page === "starred" ? "h-[19.5px] w-[111.844px] leading-[19.5px]" : "h-[22.5px] w-[110.109px] leading-[22.5px]"
                  }`}
                  style={{
                    fontFamily:
                      '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                  }}
                >
                  {page === "starred" ? "Show all types" : "Opened anytime"}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="mt-px">
                    <path d="M2.5 4l2.5 2.5L7.5 4"/>
                  </svg>
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => setDispMode("list")}
                    className={`rounded-full p-2 transition-colors ${
                      dispMode === "list"
                        ? "bg-[#e8e9ec] text-[#172b4d]"
                        : "text-[#999] hover:bg-[#eceef2] hover:text-[#555]"
                    }`}
                    title="List view"><ListIco/></button>
                  <button onClick={() => setDispMode("grid")}
                    className={`rounded-full p-2 transition-colors ${
                      dispMode === "grid"
                        ? "border-2 border-[#1f73d8] text-[#172b4d]"
                        : "text-[#999] hover:bg-[#eceef2] hover:text-[#555]"
                    }`}
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
                      className="text-base transition-colors"
                    >
                      <StarIco size={16} active={currentWorkspace.starred} className={!currentWorkspace.starred ? "opacity-40" : ""} />
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

              {!isLoading && !error && (page === "starred" ? starredBases.length + starredWs.length === 0 : filteredBases.length === 0) && (
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

              {!isLoading && page === "starred" && dispMode === "list" && (
                <StarredListView
                  bases={starredBases}
                  workspaces={starredWs}
                  onStarBase={(base) => toggleBaseStar.mutate({ id: base.id, starred: false })}
                  onStarWorkspace={(workspace) => toggleWsStar.mutate({ id: workspace.id, starred: false })}
                  onOpenWorkspace={(workspaceId) => setPage(workspaceId)}
                />
              )}

              {!isLoading && page === "starred" && dispMode === "grid" && (
                <StarredGridView
                  bases={starredBases}
                  workspaces={starredWs}
                  onStarBase={(base) => toggleBaseStar.mutate({ id: base.id, starred: false })}
                  onStarWorkspace={(workspace) => toggleWsStar.mutate({ id: workspace.id, starred: false })}
                  onOpenWorkspace={(workspaceId) => setPage(workspaceId)}
                />
              )}

              {!isLoading && page !== "starred" && filteredBases.length > 0 && dispMode === "list" && (
                <BaseListView
                  bases={filteredBases}
                  showWorkspace={page === "home"}
                  onRename={(b) => open({ kind: "renameBase", id: b.id, value: b.name })}
                  onDelete={(id) => deleteBase.mutate({ id })}
                  onStar={(b) => toggleBaseStar.mutate({ id: b.id, starred: !b.starred })}
                  onMove={(b) => open({ kind: "moveBase", id: b.id, currentWorkspaceId: b.workspaceId })}
                  onDuplicate={(b) => {
                    setNewName(`${b.name} copy`);
                    open({ kind: "createBase", workspaceId: b.workspaceId ?? undefined });
                  }}
                  onGoToWorkspace={(b) => {
                    if (b.workspaceId) setPage(b.workspaceId);
                  }}
                />
              )}

              {!isLoading && page !== "starred" && filteredBases.length > 0 && dispMode === "grid" && (
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
          {modal.kind === "createBase" ? (
            <div
              className="h-[477px] w-[752px] overflow-visible rounded-[12px] bg-white shadow-[0_0_0_1px_#bfc4cf,0_14px_36px_rgba(0,0,0,0.24)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex h-[68px] items-center border-b border-[#d8dbe1]">
                <h2
                  className="ml-[24px] w-[728px] text-[23px] font-semibold leading-[28.75px] text-[#1d1f25]"
                  style={{
                    fontFamily:
                      '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                  }}
                >
                  How do you want to start?
                </h2>
                <button
                  onClick={close}
                  className="absolute right-[24px] top-1/2 -translate-y-1/2 rounded p-1.5 text-[#6b7280] transition-colors hover:bg-[#f5f6f8] hover:text-[#374151]"
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col px-[24px] pb-[24px] pt-[22px]">
                {(workspaces as WsFull[]).length > 0 && (
                  <div className="relative mb-[20px] flex items-center" ref={workspaceMenuRef}>
                    <p
                      className="mr-[4px] text-[15px] font-medium leading-[22.5px] text-[#1d1f25]"
                      style={{
                        fontFamily:
                          '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                      }}
                    >
                      Workspace:
                    </p>
                    <button
                      type="button"
                      onClick={() => setWorkspaceMenuOpen((prev) => !prev)}
                      className="flex items-center gap-1 rounded px-0 text-[15px] leading-[22.5px] text-[#606774]"
                      style={{
                        fontFamily:
                          '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                      }}
                    >
                      <span>{selectedWorkspaceName}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {workspaceMenuOpen && (
                      <div
                        role="dialog"
                        tabIndex={-1}
                        className="rounded-[6px] shadow-[0_10px_28px_rgba(0,0,0,0.2)] border border-[#cfd4dc] bg-white"
                        style={{
                          position: "absolute",
                          inset: "0px auto auto 0px",
                          width: "240px",
                          zIndex: 10004,
                          transform: "translate(76px, 28px)",
                          maxHeight: "396px",
                          overflowY: "auto",
                        }}
                      >
                        <div className="p-[8px]">
                          <div role="listbox" aria-label="Options" className="relative">
                            <ul className="w-full">
                              {(workspaces as WsFull[]).map((ws) => {
                                const selected = ws.id === createBaseWorkspaceId;
                                return (
                                  <li
                                    key={ws.id}
                                    role="option"
                                    aria-selected={selected}
                                    aria-disabled={false}
                                    onClick={() => {
                                      setCreateBaseWorkspaceId(ws.id);
                                      setWorkspaceMenuOpen(false);
                                    }}
                                    className={`flex h-[36px] w-full cursor-pointer items-center px-[10px] ${
                                      selected ? "bg-[#f2f2f2]" : "hover:bg-[#f7f8fa]"
                                    }`}
                                  >
                                    {selected ? (
                                      <svg width="16" height="16" viewBox="0 0 16 16" className="mr-[8px] text-[#7c8797]" aria-hidden="true">
                                        <path d="M3.5 8.1l2.3 2.3 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    ) : (
                                      <span className="mr-[24px]" />
                                    )}
                                    <p className="truncate text-[13px] leading-[18px] text-[#1d1f25]">{ws.name}</p>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-[16px]">
                  <button
                    onClick={submit}
                    className="group flex h-[310px] flex-1 flex-col overflow-hidden rounded-[8px] border border-[#d5d8e0] bg-white text-left shadow-sm transition-colors hover:border-[#c3c8d4]"
                  >
                    <div className="h-[188px] w-full border-b border-[#dde0e6] bg-[#f6f0fb] p-4">
                      <img
                        src={
                          modal.fromWorkspaceContext
                            ? "/airtable_assets/Omni_2x.png"
                            : "/airtable_assets/start-with-app-v2.png"
                        }
                        alt="Build an app option"
                        className="h-full w-full rounded-[14px] object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-[16px]">
                      <div className="flex items-center gap-2">
                        <h3
                          className="m-0 text-[21px] font-semibold leading-[26px] text-[#1d1f25]"
                          style={{
                            fontFamily:
                              '"Inter Display", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                          }}
                        >
                          Build an app with Omni
                        </h3>
                        <span className="rounded-full bg-[#bdebc4] px-2 py-[1px] text-[13px] font-medium leading-[16px] text-[#177334]">New</span>
                      </div>
                      <p className="mt-[8px] text-[15px] leading-[1.45] text-[#606774]">
                        Use AI to build a custom app tailored to your workflow.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={submit}
                    className="group flex h-[310px] flex-1 flex-col overflow-hidden rounded-[8px] border border-[#d5d8e0] bg-white text-left shadow-sm transition-colors hover:border-[#c3c8d4]"
                  >
                    <div className="h-[188px] w-full border-b border-[#dde0e6] bg-[#edf2fe] p-4">
                      <img
                        src="/airtable_assets/start-with-data.png"
                        alt="Start with data option"
                        className="h-full w-full rounded-[14px] object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3
                        className="m-0 text-[21px] font-semibold leading-[26px] text-[#1d1f25]"
                        style={{
                          fontFamily:
                            '"Inter Display", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                        }}
                      >
                        Build an app on your own
                      </h3>
                      <p className="mt-[8px] text-[15px] leading-[1.45] text-[#606774]">
                        Start with a blank app and build your ideal workflow.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#e0e0e0] shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-[15px] font-semibold text-[#172b4d] mb-5">
                {modal.kind === "createWorkspace" ? "Create a workspace" :
                  modal.kind === "renameBase" ? "Rename base" :
                    modal.kind === "renameWorkspace" ? "Rename workspace" :
                      modal.kind === "editDesc" ? "Edit description" :
                        "Move to workspace"}
              </h2>

              {(modal.kind === "renameBase" || modal.kind === "renameWorkspace") && (
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
                  {modal.kind === "createWorkspace" ? "Create workspace" :
                   modal.kind === "moveBase" ? "Move" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

