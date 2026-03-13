import {
  AppearancePanel,
  LeftSidebar,
} from "~/app/base/_components/basePagePrimitives";
import { BaseMainContent } from "~/app/base/_components/BaseMainContent";
import { BaseTableTabsBar } from "~/app/base/_components/BaseTableTabsBar";
import { BaseTopHeader } from "~/app/base/_components/BaseTopHeader";
import { BaseViewSidebar } from "~/app/base/_components/BaseViewSidebar";
import type { BasePageShellProps } from "~/app/base/_components/basePageTypes";

export function BasePageShell({
  base,
  baseId,
  panelOpen,
  setPanelOpen,
  updateApp,
  toggleStar,
  viewSidebarOpen,
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
  activeView,
  currentCfg,
  currentTable,
  updateViewConfig,
  bulkAdding,
  handleBulkAddRows,
  views,
  renamingView,
  setRenamingView,
  getViewConfig,
  deleteView,
  commitViewRename,
  addingView,
  setAddingView,
  newViewName,
  setNewViewName,
  handleAddView,
  newViewType,
  setNewViewType,
}: BasePageShellProps) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: "13px",
      }}
    >
      <LeftSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <BaseTopHeader base={base} setPanelOpen={setPanelOpen} />

        <BaseTableTabsBar
          base={base}
          setViewSidebar={setViewSidebar}
          currentTableId={currentTableId}
          renamingTable={renamingTable}
          setRenamingTable={setRenamingTable}
          commitTableRename={commitTableRename}
          setActiveTableId={setActiveTableId}
          setActiveViewId={setActiveViewId}
          baseTablesLength={baseTablesLength}
          handleDeleteTable={handleDeleteTable}
          addingTable={addingTable}
          setAddingTable={setAddingTable}
          newTableName={newTableName}
          setNewTableName={setNewTableName}
          handleAddTable={handleAddTable}
        />

        <div className="flex flex-1 overflow-hidden">
          <BaseViewSidebar
            viewSidebarOpen={viewSidebarOpen}
            activeView={activeView}
            setAddingView={setAddingView}
            setNewViewName={setNewViewName}
            views={views}
            renamingView={renamingView}
            setRenamingView={setRenamingView}
            getViewConfig={getViewConfig}
            commitViewRename={commitViewRename}
            setActiveViewId={setActiveViewId}
            deleteView={deleteView}
            addingView={addingView}
            newViewName={newViewName}
            handleAddView={handleAddView}
            newViewType={newViewType}
            setNewViewType={setNewViewType}
          />

          <BaseMainContent
            activeView={activeView}
            currentTable={currentTable}
            currentCfg={currentCfg}
            updateViewConfig={updateViewConfig}
            handleBulkAddRows={handleBulkAddRows}
            bulkAdding={bulkAdding}
            currentTableId={currentTableId}
          />
        </div>
      </div>

      {panelOpen && (
        <AppearancePanel
          base={{
            name: base.name,
            color: base.color ?? "#f82b60",
            icon: base.icon ?? "default",
            guide: base.guide ?? null,
            starred: base.starred,
          }}
          onClose={() => setPanelOpen(false)}
          onUpdateColor={(c) => updateApp.mutate({ id: baseId, color: c })}
          onUpdateIcon={(i) => updateApp.mutate({ id: baseId, icon: i })}
          onUpdateGuide={(g) => updateApp.mutate({ id: baseId, guide: g })}
          onToggleStar={() =>
            toggleStar.mutate({ id: baseId, starred: !base.starred })
          }
        />
      )}
    </div>
  );
}
