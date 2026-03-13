import ViewToolbar from "~/app/_components/ViewToolbar";
import GridView from "~/app/_components/GridView";
import KanbanView from "~/app/_components/KanbanView";
import type { BasePageShellProps } from "~/app/base/_components/basePageTypes";

type BaseMainContentProps = Pick<
  BasePageShellProps,
  | "activeView"
  | "currentTable"
  | "currentCfg"
  | "updateViewConfig"
  | "handleBulkAddRows"
  | "bulkAdding"
  | "currentTableId"
>;

export function BaseMainContent({
  activeView,
  currentTable,
  currentCfg,
  updateViewConfig,
  handleBulkAddRows,
  bulkAdding,
  currentTableId,
}: BaseMainContentProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {activeView && currentTable ? (
        <ViewToolbar
          columns={currentTable.columns}
          config={currentCfg}
          onConfigChange={(patch) => updateViewConfig(activeView.id, patch)}
          activeViewName={activeView.name}
          activeViewType={activeView.type}
          onBulkAddRows={
            activeView.type === "GRID" ? handleBulkAddRows : undefined
          }
          bulkAdding={bulkAdding}
        />
      ) : (
        <div className="h-10 flex-shrink-0 border-b border-[#e0e0e0] bg-white" />
      )}

      <div className="flex-1 overflow-hidden bg-white">
        {!currentTableId ? (
          <div className="flex h-full items-center justify-center text-[13px] text-[#aaa]">
            No tables yet — click &ldquo;Add or import&rdquo; to create one.
          </div>
        ) : !activeView ? (
          <div className="flex h-full animate-pulse items-center justify-center text-[13px] text-[#aaa]">
            Loading views…
          </div>
        ) : activeView.type === "GRID" ? (
          <GridView
            key={activeView.id}
            tableId={currentTableId}
            hiddenFields={currentCfg.hiddenFields}
            filters={currentCfg.filters}
            sorts={currentCfg.sorts}
            groups={currentCfg.groups}
            rowHeight={currentCfg.rowHeight}
            onSortsChange={(sorts) =>
              updateViewConfig(activeView.id, { sorts })
            }
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
  );
}
