import {
  tabBarBg,
  tabBarBorder,
} from "~/app/base/_components/basePagePrimitives";
import type { BasePageShellProps } from "~/app/base/_components/basePageTypes";

type BaseTableTabsBarProps = Pick<
  BasePageShellProps,
  | "base"
  | "setViewSidebar"
  | "currentTableId"
  | "renamingTable"
  | "setRenamingTable"
  | "commitTableRename"
  | "setActiveTableId"
  | "setActiveViewId"
  | "baseTablesLength"
  | "handleDeleteTable"
  | "addingTable"
  | "setAddingTable"
  | "newTableName"
  | "setNewTableName"
  | "handleAddTable"
>;

export function BaseTableTabsBar({
  base,
  setViewSidebar,
  currentTableId,
  renamingTable,
  setRenamingTable,
  commitTableRename,
  setActiveTableId,
  setActiveViewId,
  baseTablesLength,
  handleDeleteTable,
  addingTable,
  setAddingTable,
  newTableName,
  setNewTableName,
  handleAddTable,
}: BaseTableTabsBarProps) {
  const baseColor = base.color ?? "#f82b60";

  return (
    <div
      className="flex h-9 flex-shrink-0 items-center overflow-x-auto px-2"
      style={{
        background: tabBarBg(baseColor),
        borderBottom: `1px solid ${tabBarBorder(baseColor)}`,
      }}
    >
      <button
        onClick={() => setViewSidebar((p) => !p)}
        className="mr-1 flex-shrink-0 rounded p-1.5 text-[#444] transition-colors hover:bg-black/10"
        title="Toggle view sidebar"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect
            x="1"
            y="2"
            width="4"
            height="12"
            rx="1"
            fill="currentColor"
            opacity="0.5"
          />
          <rect
            x="6"
            y="2"
            width="9"
            height="4"
            rx="1"
            fill="currentColor"
            opacity="0.3"
          />
          <rect
            x="6"
            y="7"
            width="9"
            height="4"
            rx="1"
            fill="currentColor"
            opacity="0.3"
          />
        </svg>
      </button>

      {base.tables.map((table) => {
        const isActive = currentTableId === table.id;
        const isRenaming = renamingTable?.id === table.id;
        return (
          <div
            key={table.id}
            className={`group/tab relative flex h-9 flex-shrink-0 items-center transition-all ${
              isActive
                ? "z-10 -mb-px rounded-t border-t border-r border-l border-[#d8d8d8] bg-white"
                : ""
            }`}
          >
            {isRenaming ? (
              <input
                autoFocus
                value={renamingTable.value}
                className="mx-2 my-1 w-28 rounded border border-[#0069ff] bg-white px-2 py-0.5 text-[12px] outline-none"
                onChange={(e) =>
                  setRenamingTable({
                    ...renamingTable,
                    value: e.target.value,
                  })
                }
                onBlur={commitTableRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTableRename();
                  if (e.key === "Escape") setRenamingTable(null);
                }}
              />
            ) : (
              <button
                onClick={() => {
                  setActiveTableId(table.id);
                  setActiveViewId(null);
                }}
                onDoubleClick={() =>
                  setRenamingTable({ id: table.id, value: table.name })
                }
                className={`flex h-full items-center gap-1 px-3 text-[12px] font-medium transition-colors ${
                  isActive
                    ? "text-[#172b4d]"
                    : "rounded-t text-[#444] hover:bg-black/5 hover:text-[#172b4d]"
                }`}
              >
                {table.name}
                {isActive && (
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-[#888]"
                  >
                    <path d="M2.5 4l2.5 2.5L7.5 4" />
                  </svg>
                )}
              </button>
            )}
            {!isRenaming && !isActive && baseTablesLength > 1 && (
              <button
                onClick={() => handleDeleteTable(table.id)}
                className="mr-1 rounded p-0.5 text-[10px] text-[#888] opacity-0 transition-all group-hover/tab:opacity-100 hover:text-red-500"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      {addingTable ? (
        <div className="ml-2 flex items-center gap-1">
          <input
            autoFocus
            value={newTableName}
            placeholder="Table name…"
            className="w-28 rounded border border-[#0069ff] bg-white px-2 py-0.5 text-[12px] outline-none"
            onChange={(e) => setNewTableName(e.target.value)}
            onBlur={() => {
              if (!newTableName.trim()) setAddingTable(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTable();
              if (e.key === "Escape") {
                setAddingTable(false);
                setNewTableName("");
              }
            }}
          />
          <button
            onClick={handleAddTable}
            className="rounded bg-[#166a5b] px-2 py-0.5 text-[11px] text-white"
          >
            Add
          </button>
          <button
            onClick={() => {
              setAddingTable(false);
              setNewTableName("");
            }}
            className="px-1 text-[10px] text-[#666]"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingTable(true)}
          className="ml-1 flex flex-shrink-0 items-center gap-1 rounded px-2 py-1 text-[12px] font-medium text-[#444] transition-colors hover:bg-black/5 hover:text-[#172b4d]"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5.5 1v9M1 5.5h9" />
          </svg>
          Add or import
        </button>
      )}

      <div className="ml-auto flex-shrink-0">
        <button className="flex items-center gap-1 rounded px-2 py-1 text-[12px] text-[#444] transition-colors hover:bg-black/5 hover:text-[#172b4d]">
          Tools
          <svg
            width="9"
            height="9"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 2l4 3-4 3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
