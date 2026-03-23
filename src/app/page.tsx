"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseGridView } from "~/app/_components/home/BaseGridView";
import { BaseListView } from "~/app/_components/home/BaseListView";
import { SearchModal } from "~/app/_components/home/SearchModal";
import {
  StarredGridView,
  StarredListView,
} from "~/app/_components/home/StarredViews";
import { UserAccountMenu } from "~/app/_components/home/UserAccountMenu";
import { WorkspacesOverview } from "~/app/_components/home/WorkspacesOverview";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import {
  BrowserPageMetadata,
  HOMEPAGE_FAVICON_HREF,
} from "~/app/_components/BrowserPageMetadata";
import {
  ChevronRight,
  GridIco,
  HomeIco,
  ListIco,
  PencilIco,
  SharedIco,
  SidebarStarIco,
  StarIco,
  WsIco,
} from "~/app/_components/home/icons";
import { ActionBtn, BaseIcon } from "~/app/_components/home/ui";
import { useHomePageController } from "~/app/_components/home/useHomePageController";

const SIDEBAR_FONT_FAMILY =
  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
const SIDEBAR_ROW_TEXT_CLASS =
  "text-[15px] font-medium leading-[22.5px] text-[#1d1f25]";
const SIDEBAR_ROW_PADDING_CLASS = "px-3";
type OpenedDateFilter = "today" | "past7" | "past30" | "anytime";
const OPENED_DATE_FILTER_OPTIONS: Array<{
  value: OpenedDateFilter;
  label: string;
}> = [
  { value: "today", label: "Today" },
  { value: "past7", label: "In the past 7 days" },
  { value: "past30", label: "In the past 30 days" },
  { value: "anytime", label: "Anytime" },
];

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function matchesOpenedDateFilter(
  openedAt: Date | null,
  filter: OpenedDateFilter,
  now: Date,
) {
  if (filter === "anytime") return true;
  if (!openedAt) return false;

  const openedDate = new Date(openedAt);
  const todayStart = startOfLocalDay(now);

  if (filter === "today") {
    return openedDate >= todayStart;
  }

  const daysBack = filter === "past7" ? 6 : 29;
  const rangeStart = new Date(todayStart);
  rangeStart.setDate(todayStart.getDate() - daysBack);
  return openedDate >= rangeStart;
}

function getOpenedDateFilterLabel(filter: OpenedDateFilter) {
  switch (filter) {
    case "today":
      return "Opened today";
    case "past7":
      return "Opened in the past 7 days";
    case "past30":
      return "Opened in the past 30 days";
    case "anytime":
    default:
      return "Opened anytime";
  }
}

function SidebarHomeRow({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href="/"
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`mb-1 flex h-[38.5px] items-center rounded ${SIDEBAR_ROW_PADDING_CLASS} text-decoration-none ${
        active ? "bg-[#f2f4f8]" : "hover:bg-[#f2f4f8]"
      }`}
    >
      <HomeIco />
      <h4
        className={`grow truncate py-2 pl-2 text-left ${SIDEBAR_ROW_TEXT_CLASS}`}
        style={{ fontFamily: SIDEBAR_FONT_FAMILY }}
      >
        Home
      </h4>
    </Link>
  );
}

function SidebarSharedRow({ onClick }: { onClick: () => void }) {
  return (
    <Link
      href="/shared"
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`mb-1 flex h-[38.5px] items-center rounded ${SIDEBAR_ROW_PADDING_CLASS} text-decoration-none hover:bg-[#f2f4f8]`}
    >
      <SharedIco />
      <h4
        className={`grow truncate py-2 pl-2 text-left ${SIDEBAR_ROW_TEXT_CLASS}`}
        style={{ fontFamily: SIDEBAR_FONT_FAMILY }}
      >
        <div className="flex items-center">Shared</div>
      </h4>
    </Link>
  );
}

function SidebarExpandableRow({
  href,
  label,
  icon,
  active,
  expanded,
  onNavigate,
  onToggleExpand,
  expandLabel,
  onPlus,
  plusLabel,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  expanded: boolean;
  onNavigate: () => void;
  onToggleExpand: () => void;
  expandLabel: string;
  onPlus?: () => void;
  plusLabel?: string;
}) {
  return (
    <div
      className={`mb-2 flex h-10 items-center justify-between rounded ${
        active ? "bg-[#f2f4f8]" : "hover:bg-[#f2f4f8]"
      }`}
    >
      <Link
        href={href}
        onClick={(event) => {
          event.preventDefault();
          onNavigate();
        }}
        className={`w-[220px] max-w-[220px] rounded ${SIDEBAR_ROW_PADDING_CLASS} py-2 text-left`}
      >
        <h4
          className={SIDEBAR_ROW_TEXT_CLASS}
          style={{ fontFamily: SIDEBAR_FONT_FAMILY }}
        >
          {onPlus ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2 flex-none">{icon}</span>
                <div className="left-align grow truncate">Workspaces</div>
              </div>
              <span
                role="button"
                tabIndex={0}
                aria-label={plusLabel}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onPlus();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onPlus();
                  }
                }}
                className="flex h-6 w-6 items-center justify-center rounded p-1 hover:bg-[#0000000d]"
                style={{ marginRight: -16 }}
              >
                <AirtableAssetIcon asset={127} alt="" size={12} />
              </span>
            </div>
          ) : (
            <div className="flex items-center">
              {icon}
              <div className="left-align grow truncate pl-2">{label}</div>
            </div>
          )}
        </h4>
      </Link>

      <button
        type="button"
        aria-label={expandLabel}
        aria-expanded={expanded}
        onClick={onToggleExpand}
        className="m-2 flex h-6 w-6 flex-none items-center justify-center rounded p-1 hover:bg-[#0000000d]"
        style={{ width: 24, height: 24 }}
      >
        <span
          className={`inline-flex transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
        >
          <ChevronRight />
        </span>
      </button>
    </div>
  );
}

function SidebarUtilityRow({
  label,
  asset,
  href,
  onClick,
}: {
  label: string;
  asset: number;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <p
      className="flex h-8 items-center px-2 text-[13px] leading-[18px] font-normal text-[#1d1f25]"
      style={{ fontFamily: SIDEBAR_FONT_FAMILY }}
    >
      <AirtableAssetIcon asset={asset} alt="" size={16} />
      <span className="ml-1">{label}</span>
    </p>
  );

  if (href) {
    return (
      <a href={href} className="focus-visible block rounded hover:bg-[#f2f4f8]">
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-visible block w-full rounded text-left hover:bg-[#f2f4f8]"
    >
      {content}
    </button>
  );
}

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
  const [openedDateFilter, setOpenedDateFilter] =
    useState<OpenedDateFilter>("anytime");
  const [openedDateMenuOpen, setOpenedDateMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);
  const openedDateMenuRef = useRef<HTMLDivElement | null>(null);
  const starredBases = useMemo(
    () =>
      [...bases]
        .filter((base) => base.starred)
        .sort((a, b) => {
          const at = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
          const bt = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
          return bt - at;
        }),
    [bases],
  );
  const selectedWorkspaceName =
    workspaces.find((ws) => ws.id === createBaseWorkspaceId)?.name ??
    "No workspace";
  const requestDeleteBase = (id: string | null | undefined) => {
    if (typeof id !== "string" || id.length === 0) return;
    deleteBase.mutate({ id });
  };

  useEffect(() => {
    if (!(modal?.kind === "createBase" && workspaceMenuOpen)) return;
    function onPointerDown(e: MouseEvent) {
      if (!workspaceMenuRef.current) return;
      const target = e.target as Node;
      if (!workspaceMenuRef.current.contains(target))
        setWorkspaceMenuOpen(false);
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

  useEffect(() => {
    if (!openedDateMenuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!openedDateMenuRef.current) return;
      if (!openedDateMenuRef.current.contains(event.target as Node)) {
        setOpenedDateMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenedDateMenuOpen(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openedDateMenuOpen]);

  const visibleFilteredBases = useMemo(() => {
    if (page === "starred") return filteredBases;
    const now = new Date();
    return filteredBases.filter((base) =>
      matchesOpenedDateFilter(
        base.lastOpenedAt ? new Date(base.lastOpenedAt) : null,
        openedDateFilter,
        now,
      ),
    );
  }, [filteredBases, openedDateFilter, page]);

  return (
    <div
      className="flex min-h-screen bg-[#f9fafb]"
      style={{
        fontFamily:
          '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      }}
    >
      <BrowserPageMetadata title="Airtable" iconHref={HOMEPAGE_FAVICON_HREF} />

      <header className="fixed top-0 right-0 left-0 z-30 flex h-[56px] items-center border-b border-[#d8dbe1] bg-white">
        <div className="flex h-full w-[300px] flex-shrink-0 items-center gap-2 px-3">
          <button
            onClick={() => setSidebar((prev) => !prev)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-[#555] transition-colors hover:bg-[#f0f0ef]"
          >
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
              <path
                d="M2 3.5h11M2 7.5h11M2 11.5h11"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            onClick={() => setPage("home")}
            className="ml-1 flex items-center overflow-hidden transition-opacity hover:opacity-80"
          >
            <Image
              src="/airtable_assets/Airtable_Logo.svg.png"
              alt="Airtable"
              width={102}
              height={22}
              className="flex-shrink-0"
              style={{ width: 102, height: 22.2 }}
              draggable={false}
            />
          </button>
        </div>
        <div className="pointer-events-none absolute top-1/2 left-1/2 w-[354px] max-w-[calc(100vw-640px)] -translate-x-1/2 -translate-y-1/2">
          <button
            onClick={() => setSearchOpen(true)}
            className="pointer-events-auto flex h-[32px] w-full items-center gap-2 rounded-full border border-[#d8d8d8] bg-white px-4 shadow-sm transition-colors hover:border-[#bbb]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 12 12"
              fill="none"
              className="flex-shrink-0 text-[#999]"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="5" cy="5" r="3.5" />
              <path d="M8 8l2.5 2.5" />
            </svg>
            <span className="flex-1 text-left text-[13px] text-[#8f96a3]">
              Search...
            </span>
            <span className="flex-shrink-0 rounded border border-[#e0e0e0] px-1.5 py-0.5 text-[13px] leading-none text-[#a0a7b2]">
              ctrl K
            </span>
          </button>
        </div>
        <div className="flex h-full flex-1 items-center justify-end pr-6">
          <UserAccountMenu />
        </div>
      </header>

      <aside
        className={`fixed top-[56px] bottom-0 left-0 z-20 border-r border-[#d8dbe1] bg-white transition-all duration-200 ${sidebarOpen ? "w-[300px]" : "w-[56px]"}`}
      >
        {sidebarOpen ? (
          <div className="relative h-full overflow-y-auto bg-white px-3 pt-[10px] pb-3">
            <nav
              className="flex h-full flex-col"
              data-testid="homescreen2-sidebar"
              style={{ minHeight: 579 }}
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <SidebarHomeRow
                  active={page === "home"}
                  onClick={() => setPage("home")}
                />

                <SidebarExpandableRow
                  href="/starred"
                  label="Starred"
                  icon={<SidebarStarIco />}
                  active={page === "starred"}
                  expanded={starredExpanded}
                  onNavigate={() => {
                    setPage("starred");
                  }}
                  onToggleExpand={() => setStarredExpanded((prev) => !prev)}
                  expandLabel="Expand starred"
                />

                {starredExpanded && (
                  <div className="mb-1">
                    {[...starredWs, ...starredBases].map((entry) =>
                      "bases" in entry ? (
                        <button
                          key={`starred-ws-${entry.id}`}
                          onClick={() => setPage(entry.id)}
                          className="mb-1 flex h-[35.5px] w-full items-center rounded px-3 text-left text-[13px] leading-[19.5px] font-normal text-[#1d1f25] transition-colors hover:bg-[#f5f6f8]"
                        >
                          <span className="mr-2 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[6px] bg-[#eef1f4]">
                            <WsIco size={16} />
                          </span>
                          <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                            {entry.name}
                          </span>
                        </button>
                      ) : (
                        <Link
                          key={`starred-base-${entry.id}`}
                          href={`/base/${entry.id}`}
                          className="mb-1 flex h-[35.5px] w-full items-center rounded px-3 text-left text-[13px] leading-[19.5px] font-normal text-[#1d1f25] transition-colors hover:bg-[#f5f6f8]"
                        >
                          <BaseIcon base={entry} size={28} />
                          <span className="ml-2 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                            {entry.name}
                          </span>
                        </Link>
                      ),
                    )}
                  </div>
                )}

                <SidebarSharedRow onClick={() => void 0} />

                <SidebarExpandableRow
                  href="/workspaces"
                  label="Workspaces"
                  icon={<WsIco />}
                  active={page === "workspaces" || !!currentWorkspace}
                  expanded={wsExpanded}
                  onNavigate={() => setPage("workspaces")}
                  onToggleExpand={() => setWsExpanded((prev) => !prev)}
                  expandLabel="Expand All workspaces"
                  onPlus={() => open({ kind: "createWorkspace" })}
                  plusLabel="Create a workspace"
                />

                {wsExpanded && (
                  <div className="space-y-0.5 pr-1 pl-4">
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => setPage(ws.id)}
                        className={`w-full rounded px-2 py-[5px] text-left text-[13px] transition-colors ${
                          page === ws.id
                            ? "bg-[#f2f4f8] font-medium text-[#172b4d]"
                            : "text-[#555] hover:bg-[#f5f5f4] hover:text-[#172b4d]"
                        }`}
                      >
                        <span className="truncate">{ws.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-auto flex-none">
                <div className="mb-4 border-t border-[#d8dbe1]" />
                <div>
                  <SidebarUtilityRow label="Templates and apps" asset={389} />
                  <SidebarUtilityRow
                    label="Marketplace"
                    asset={91}
                    href="https://airtable.com/marketplace"
                  />
                  <SidebarUtilityRow label="Import" asset={21} />

                  <button
                    onClick={() => open({ kind: "createBase" })}
                    className="mt-2 mb-1 inline-flex h-8 w-full items-center justify-center rounded-[6px] bg-[#166ee1] px-3 text-[13px] font-semibold text-white shadow-[0px_0px_1px_rgba(0,0,0,0.32),0px_0px_2px_rgba(0,0,0,0.08),0px_1px_3px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#0d52ac]"
                    style={{ fontFamily: SIDEBAR_FONT_FAMILY }}
                  >
                    <AirtableAssetIcon
                      asset={127}
                      alt=""
                      size={16}
                      tintColor="white"
                      className="mr-2"
                    />
                    <span className="truncate">Create</span>
                  </button>
                </div>
              </div>
            </nav>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center gap-2 px-2 py-3">
            <button
              onClick={() => setPage("home")}
              className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#f2f4f8]"
            >
              <HomeIco />
            </button>
            <button
              onClick={() => setPage("starred")}
              className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#f2f4f8]"
            >
              <SidebarStarIco />
            </button>
            <button
              onClick={() => void 0}
              className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#f2f4f8]"
            >
              <SharedIco />
            </button>
            <button
              onClick={() => setPage("workspaces")}
              className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#f2f4f8]"
            >
              <WsIco />
            </button>
            <div className="mt-auto w-full px-1">
              <button
                onClick={() => open({ kind: "createBase" })}
                className="flex h-8 w-full items-center justify-center rounded-[6px] bg-[#166ee1] text-white shadow-[0px_0px_1px_rgba(0,0,0,0.32),0px_0px_2px_rgba(0,0,0,0.08),0px_1px_3px_rgba(0,0,0,0.08)]"
              >
                <AirtableAssetIcon
                  asset={127}
                  alt=""
                  size={16}
                  tintColor="white"
                />
              </button>
            </div>
          </div>
        )}
      </aside>

      <main
        className={`flex min-h-screen flex-1 flex-col pt-[56px] transition-all duration-200 ${sidebarOpen ? "ml-[300px]" : "ml-[56px]"}`}
      >
        <div className="w-full flex-1 px-12 py-8">
          <h1
            className="m-0 pb-6 text-[27px] leading-[33.75px] font-[675] tracking-[-0.16px] text-[#1d1f25]"
            style={{
              fontFamily:
                '"Inter Display", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
              WebkitFontSmoothing: "antialiased",
            }}
          >
            {pageTitle}
          </h1>

          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-[13px] text-red-600">
              Failed to load data. Please refresh the page.
            </div>
          )}

          {page === "workspaces" && (
            <WorkspacesOverview
              workspaces={filteredWs}
              allBases={bases}
              onNavigate={setPage}
              onCreateBase={(wsId) =>
                open({ kind: "createBase", workspaceId: wsId })
              }
              onCreateWorkspace={() => open({ kind: "createWorkspace" })}
              onRenameWs={(ws) =>
                open({ kind: "renameWorkspace", id: ws.id, value: ws.name })
              }
              onEditDesc={(ws) =>
                open({
                  kind: "editDesc",
                  id: ws.id,
                  value: ws.description ?? "",
                })
              }
              onDeleteWs={(id) => {
                if (confirm("Delete this workspace? Bases will be unassigned."))
                  deleteWs.mutate({ id });
              }}
              onStarWs={(ws) =>
                toggleWsStar.mutate({ id: ws.id, starred: !ws.starred })
              }
              onRenameBase={(b) =>
                open({ kind: "renameBase", id: b.id, value: b.name })
              }
              onDeleteBase={requestDeleteBase}
              onStarBase={(b) =>
                toggleBaseStar.mutate({ id: b.id, starred: !b.starred })
              }
              onMoveBase={(b) =>
                open({
                  kind: "moveBase",
                  id: b.id,
                  currentWorkspaceId: b.workspaceId,
                })
              }
            />
          )}

          {page !== "workspaces" && (
            <>
              <div className="mb-2 flex items-center justify-between">
                {page === "starred" ? (
                  <button
                    className="m-0 flex h-[19.5px] w-[111.844px] items-center justify-center gap-1 p-0 text-center text-[15px] leading-[19.5px] font-normal whitespace-nowrap text-[#1d1f25] transition-colors hover:text-[#172b4d]"
                    style={{ fontFamily: SIDEBAR_FONT_FAMILY }}
                  >
                    Show all types
                  </button>
                ) : (
                  <div className="relative" ref={openedDateMenuRef}>
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={openedDateMenuOpen}
                      onClick={() => setOpenedDateMenuOpen((prev) => !prev)}
                      className="m-0 flex h-[22.5px] items-center gap-[7px] p-0 text-left text-[15px] leading-[22.5px] font-normal whitespace-nowrap text-[#1d1f25] transition-colors hover:text-[#172b4d]"
                      style={{ fontFamily: SIDEBAR_FONT_FAMILY }}
                    >
                      <span>{getOpenedDateFilterLabel(openedDateFilter)}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 4.5L6 7.5L9 4.5"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {openedDateMenuOpen && (
                      <div
                        className="absolute top-[calc(100%+12px)] left-0 z-20 w-[240px] rounded-[12px] border border-[#d8dbe1] bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.04),0px_8px_24px_rgba(0,0,0,0.12)]"
                        role="dialog"
                      >
                        <ul
                          className="p-3"
                          role="menu"
                          aria-label="Opened date filter"
                        >
                          {OPENED_DATE_FILTER_OPTIONS.map((option) => {
                            const selected = option.value === openedDateFilter;
                            return (
                              <li
                                key={option.value}
                                role="menuitemcheckbox"
                                aria-checked={selected}
                                tabIndex={0}
                                onClick={() => {
                                  setOpenedDateFilter(option.value);
                                  setOpenedDateMenuOpen(false);
                                }}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    setOpenedDateFilter(option.value);
                                    setOpenedDateMenuOpen(false);
                                  }
                                }}
                                className="flex h-[35.5px] w-full cursor-pointer items-center justify-between rounded px-2 py-2 hover:bg-[#f2f2f2]"
                              >
                                <p
                                  className="flex-none p-0 text-[13px] leading-[19.5px] font-normal whitespace-nowrap text-[#1d1f25] select-none"
                                  style={{
                                    boxSizing: "border-box",
                                    cursor: "pointer",
                                    display: "block",
                                    fontFamily: SIDEBAR_FONT_FAMILY,
                                    height: "19.5px",
                                    margin: 0,
                                    padding: 0,
                                    width: "200px",
                                  }}
                                >
                                  {option.label}
                                </p>
                                {selected && (
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    aria-hidden="true"
                                    className="text-[#1d1f25]"
                                  >
                                    <path
                                      d="M3.5 8.1l2.3 2.3 5-5"
                                      stroke="currentColor"
                                      strokeWidth="1.4"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDispMode("list")}
                    className={`rounded-full p-2 transition-colors ${
                      dispMode === "list"
                        ? "bg-[#e8e9ec] text-[#172b4d]"
                        : "text-[#999] hover:bg-[#eceef2] hover:text-[#555]"
                    }`}
                    title="List view"
                  >
                    <ListIco />
                  </button>
                  <button
                    onClick={() => setDispMode("grid")}
                    className={`rounded-full p-2 transition-colors ${
                      dispMode === "grid"
                        ? "border-2 border-[#1f73d8] text-[#172b4d]"
                        : "text-[#999] hover:bg-[#eceef2] hover:text-[#555]"
                    }`}
                    title="Grid view"
                  >
                    <GridIco />
                  </button>
                </div>
              </div>

              {currentWorkspace && (
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    {currentWorkspace.description && (
                      <p className="text-[13px] text-[#555]">
                        {currentWorkspace.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() =>
                        toggleWsStar.mutate({
                          id: currentWorkspace.id,
                          starred: !currentWorkspace.starred,
                        })
                      }
                      className="text-base transition-colors"
                    >
                      <StarIco
                        size={16}
                        active={currentWorkspace.starred}
                        className={
                          !currentWorkspace.starred ? "opacity-40" : ""
                        }
                      />
                    </button>
                    <ActionBtn
                      title="Rename workspace"
                      onClick={() =>
                        open({
                          kind: "renameWorkspace",
                          id: currentWorkspace.id,
                          value: currentWorkspace.name,
                        })
                      }
                    >
                      <PencilIco />
                    </ActionBtn>
                    <button
                      onClick={() =>
                        open({
                          kind: "editDesc",
                          id: currentWorkspace.id,
                          value: currentWorkspace.description ?? "",
                        })
                      }
                      className="px-2 py-1 text-[13px] text-[#0069ff] hover:underline"
                    >
                      Edit description
                    </button>
                    <button
                      onClick={() =>
                        open({
                          kind: "createBase",
                          workspaceId: currentWorkspace.id,
                        })
                      }
                      className="rounded bg-[#0069ff] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#0055d4]"
                    >
                      + Create base
                    </button>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="mt-2 space-y-0">
                  <div className="grid grid-cols-[1fr_180px_160px_96px] items-center border-b border-[#e0e0e0] px-1 py-2">
                    <div className="h-2.5 w-12 animate-pulse rounded bg-[#ebebeb]" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-[#ebebeb]" />
                    <div className="h-2.5 w-16 animate-pulse rounded bg-[#ebebeb]" />
                    <div />
                  </div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="grid animate-pulse grid-cols-[1fr_180px_160px_96px] items-center border-b border-[#ebebeb] px-1 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-6 w-6 rounded bg-[#e8e8e8]" />
                        <div className="h-3 max-w-[200px] flex-1 rounded bg-[#ebebeb]" />
                      </div>
                      <div className="h-3 w-28 rounded bg-[#ebebeb]" />
                      <div className="h-3 w-24 rounded bg-[#ebebeb]" />
                      <div />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading &&
                !error &&
                (page === "starred"
                  ? starredBases.length + starredWs.length === 0
                  : visibleFilteredBases.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-20 text-[#bbb]">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 48 48"
                      fill="none"
                      className="mb-4 opacity-25"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    >
                      <rect x="6" y="10" width="36" height="30" rx="3" />
                      <path d="M6 18h36M16 10v8" />
                    </svg>
                    <p className="text-[13px] text-[#888]">
                      {page === "starred"
                        ? "Nothing starred yet - star a base or workspace to pin it here."
                        : filteredBases.length > 0
                          ? "No bases opened in this time range."
                          : page === "home"
                            ? "No bases yet - click Create to get started."
                            : "No bases in this workspace yet."}
                    </p>
                    {currentWorkspace && (
                      <button
                        onClick={() =>
                          open({
                            kind: "createBase",
                            workspaceId: currentWorkspace.id,
                          })
                        }
                        className="mt-4 rounded bg-[#0069ff] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#0055d4]"
                      >
                        + Create base
                      </button>
                    )}
                  </div>
                )}

              {!isLoading && page === "starred" && dispMode === "list" && (
                <StarredListView
                  bases={starredBases}
                  workspaces={starredWs}
                  onStarBase={(base) =>
                    toggleBaseStar.mutate({ id: base.id, starred: false })
                  }
                  onStarWorkspace={(workspace) =>
                    toggleWsStar.mutate({ id: workspace.id, starred: false })
                  }
                  onOpenWorkspace={(workspaceId) => setPage(workspaceId)}
                />
              )}

              {!isLoading && page === "starred" && dispMode === "grid" && (
                <StarredGridView
                  bases={starredBases}
                  workspaces={starredWs}
                  onStarBase={(base) =>
                    toggleBaseStar.mutate({ id: base.id, starred: false })
                  }
                  onStarWorkspace={(workspace) =>
                    toggleWsStar.mutate({ id: workspace.id, starred: false })
                  }
                  onOpenWorkspace={(workspaceId) => setPage(workspaceId)}
                />
              )}

              {!isLoading &&
                page !== "starred" &&
                visibleFilteredBases.length > 0 &&
                dispMode === "list" && (
                  <BaseListView
                    bases={visibleFilteredBases}
                    showWorkspace={page === "home"}
                    onRename={(b) =>
                      open({ kind: "renameBase", id: b.id, value: b.name })
                    }
                    onDelete={requestDeleteBase}
                    onStar={(b) =>
                      toggleBaseStar.mutate({ id: b.id, starred: !b.starred })
                    }
                    onMove={(b) =>
                      open({
                        kind: "moveBase",
                        id: b.id,
                        currentWorkspaceId: b.workspaceId,
                      })
                    }
                    onDuplicate={(b) => {
                      setNewName(`${b.name} copy`);
                      open({
                        kind: "createBase",
                        workspaceId: b.workspaceId ?? undefined,
                      });
                    }}
                    onGoToWorkspace={(b) => {
                      if (b.workspaceId) setPage(b.workspaceId);
                    }}
                  />
                )}

              {!isLoading &&
                page !== "starred" &&
                visibleFilteredBases.length > 0 &&
                dispMode === "grid" && (
                  <BaseGridView
                    bases={visibleFilteredBases}
                    onRename={(b) =>
                      open({ kind: "renameBase", id: b.id, value: b.name })
                    }
                    onDelete={requestDeleteBase}
                    onStar={(b) =>
                      toggleBaseStar.mutate({ id: b.id, starred: !b.starred })
                    }
                    onMove={(b) =>
                      open({
                        kind: "moveBase",
                        id: b.id,
                        currentWorkspaceId: b.workspaceId,
                      })
                    }
                  />
                )}
            </>
          )}
        </div>
      </main>

      {searchOpen && (
        <SearchModal
          bases={bases}
          workspaces={workspaces}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
          onClick={close}
        >
          {modal.kind === "createBase" ? (
            <div
              className="h-[477px] w-[752px] overflow-visible rounded-[12px] bg-white shadow-[0_0_0_1px_#bfc4cf,0_14px_36px_rgba(0,0,0,0.24)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex h-[68px] items-center border-b border-[#d8dbe1]">
                <h2
                  className="ml-[24px] w-[728px] text-[23px] leading-[28.75px] font-semibold text-[#1d1f25]"
                  style={{
                    fontFamily:
                      '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                  }}
                >
                  How do you want to start?
                </h2>
                <button
                  onClick={close}
                  className="absolute top-1/2 right-[24px] -translate-y-1/2 rounded p-1.5 text-[#6b7280] transition-colors hover:bg-[#f5f6f8] hover:text-[#374151]"
                  aria-label="Close"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col px-[24px] pt-[22px] pb-[24px]">
                {workspaces.length > 0 && (
                  <div
                    className="relative mb-[20px] flex items-center"
                    ref={workspaceMenuRef}
                  >
                    <p
                      className="mr-[4px] text-[15px] leading-[22.5px] font-medium text-[#1d1f25]"
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
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 4.5L6 7.5L9 4.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {workspaceMenuOpen && (
                      <div
                        role="dialog"
                        tabIndex={-1}
                        className="rounded-[6px] border border-[#cfd4dc] bg-white shadow-[0_10px_28px_rgba(0,0,0,0.2)]"
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
                          <div
                            role="listbox"
                            aria-label="Options"
                            className="relative"
                          >
                            <ul className="w-full">
                              {workspaces.map((ws) => {
                                const selected =
                                  ws.id === createBaseWorkspaceId;
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
                                      selected
                                        ? "bg-[#f2f2f2]"
                                        : "hover:bg-[#f7f8fa]"
                                    }`}
                                  >
                                    {selected ? (
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        className="mr-[8px] text-[#7c8797]"
                                        aria-hidden="true"
                                      >
                                        <path
                                          d="M3.5 8.1l2.3 2.3 5-5"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    ) : (
                                      <span className="mr-[24px]" />
                                    )}
                                    <p className="truncate text-[13px] leading-[18px] text-[#1d1f25]">
                                      {ws.name}
                                    </p>
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
                      <Image
                        src={
                          modal.fromWorkspaceContext
                            ? "/airtable_assets/Omni_2x.png"
                            : "/airtable_assets/start-with-app-v2.png"
                        }
                        alt="Build an app option"
                        width={480}
                        height={320}
                        className="h-full w-full rounded-[14px] object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-[16px]">
                      <div className="flex items-center gap-2">
                        <h3
                          className="m-0 text-[21px] leading-[26px] font-semibold text-[#1d1f25]"
                          style={{
                            fontFamily:
                              '"Inter Display", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                          }}
                        >
                          Build an app with Omni
                        </h3>
                        <span className="rounded-full bg-[#bdebc4] px-2 py-[1px] text-[13px] leading-[16px] font-medium text-[#177334]">
                          New
                        </span>
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
                      <Image
                        src="/airtable_assets/start-with-data.png"
                        alt="Start with data option"
                        width={480}
                        height={320}
                        className="h-full w-full rounded-[14px] object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3
                        className="m-0 text-[21px] leading-[26px] font-semibold text-[#1d1f25]"
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
            <div
              className="w-full max-w-sm rounded-xl border border-[#e0e0e0] bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-5 text-[15px] font-semibold text-[#172b4d]">
                {modal.kind === "createWorkspace"
                  ? "Create a workspace"
                  : modal.kind === "renameBase"
                    ? "Rename base"
                    : modal.kind === "renameWorkspace"
                      ? "Rename workspace"
                      : modal.kind === "editDesc"
                        ? "Edit description"
                        : "Move to workspace"}
              </h2>

              {(modal.kind === "renameBase" ||
                modal.kind === "renameWorkspace") && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-[13px] text-[#555]">
                    {modal.kind === "renameWorkspace"
                      ? "Workspace name"
                      : "Base name"}
                  </label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submit();
                      if (e.key === "Escape") close();
                    }}
                    className="w-full rounded border border-[#d8d8d8] px-3 py-2 text-[13px] transition-colors outline-none focus:border-[#0069ff] focus:ring-2 focus:ring-[#0069ff]/10"
                    placeholder={
                      modal.kind === "renameWorkspace"
                        ? "Workspace name..."
                        : "Base name..."
                    }
                  />
                </div>
              )}

              {modal.kind === "createWorkspace" && (
                <>
                  <div className="mb-3">
                    <label className="mb-1.5 block text-[13px] text-[#555]">
                      Workspace name
                    </label>
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                        if (e.key === "Escape") close();
                      }}
                      className="w-full rounded border border-[#d8d8d8] px-3 py-2 text-[13px] transition-colors outline-none focus:border-[#0069ff] focus:ring-2 focus:ring-[#0069ff]/10"
                      placeholder="My workspace..."
                    />
                  </div>
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[13px] text-[#555]">
                      Description{" "}
                      <span className="text-[#bbb]">(optional)</span>
                    </label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded border border-[#d8d8d8] px-3 py-2 text-[13px] transition-colors outline-none focus:border-[#0069ff]"
                      placeholder="Describe this workspace..."
                    />
                  </div>
                </>
              )}

              {modal.kind === "editDesc" && (
                <div className="mb-4">
                  <textarea
                    autoFocus
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded border border-[#d8d8d8] px-3 py-2 text-[13px] transition-colors outline-none focus:border-[#0069ff]"
                    placeholder="Describe this workspace..."
                  />
                </div>
              )}

              {modal.kind === "moveBase" && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-[13px] text-[#555]">
                    Select workspace
                  </label>
                  <select
                    value={moveTo}
                    onChange={(e) => setMoveTo(e.target.value)}
                    className="w-full rounded border border-[#d8d8d8] bg-white px-3 py-2 text-[13px] transition-colors outline-none focus:border-[#0069ff]"
                  >
                    <option value="">- No workspace -</option>
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={close}
                  className="rounded px-4 py-2 text-[13px] text-[#555] transition-colors hover:bg-[#f5f5f4]"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  className="rounded bg-[#0069ff] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#0055d4]"
                >
                  {modal.kind === "createWorkspace"
                    ? "Create workspace"
                    : modal.kind === "moveBase"
                      ? "Move"
                      : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
