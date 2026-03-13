import type { ViewType } from "@prisma/client";
import type { ViewConfig } from "~/app/_components/ViewToolbar";

export type BaseSummary = {
  name: string;
  color: string;
  icon: string;
  guide: string | null;
  starred: boolean;
  tables: { id: string; name: string }[];
};

export type ActiveView = {
  id: string;
  name: string;
  type: string;
  groupByColumnId: string | null;
} | null;

export type BasePageShellProps = {
  base: BaseSummary;
  baseId: string;
  panelOpen: boolean;
  setPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  updateApp: {
    mutate: (v: { id: string; color?: string; icon?: string; guide?: string }) => void;
  };
  toggleStar: { mutate: (v: { id: string; starred: boolean }) => void };
  viewSidebarOpen: boolean;
  setViewSidebar: (v: boolean | ((p: boolean) => boolean)) => void;
  currentTableId: string | null;
  renamingTable: { id: string; value: string } | null;
  setRenamingTable: (v: { id: string; value: string } | null) => void;
  commitTableRename: () => void;
  setActiveTableId: (v: string | null) => void;
  setActiveViewId: (v: string | null) => void;
  baseTablesLength: number;
  handleDeleteTable: (tableId: string) => void;
  addingTable: boolean;
  setAddingTable: (v: boolean) => void;
  newTableName: string;
  setNewTableName: (v: string) => void;
  handleAddTable: () => void;
  activeView: ActiveView;
  currentCfg: ViewConfig;
  currentTable: { columns: unknown[] } | null | undefined;
  updateViewConfig: (viewId: string, patch: Partial<ViewConfig>) => void;
  bulkAdding: boolean;
  handleBulkAddRows: () => void;
  views: { id: string; name: string; type: string }[];
  renamingView: { id: string; value: string } | null;
  setRenamingView: (v: { id: string; value: string } | null) => void;
  getViewConfig: (viewId: string) => ViewConfig;
  deleteView: { mutate: (v: { viewId: string }) => void };
  commitViewRename: () => void;
  addingView: boolean;
  setAddingView: (v: boolean) => void;
  newViewName: string;
  setNewViewName: (v: string) => void;
  handleAddView: () => void;
  newViewType: ViewType;
  setNewViewType: (v: ViewType) => void;
};
