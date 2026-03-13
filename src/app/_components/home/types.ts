export type PageView = "home" | "starred" | "workspaces" | (string & {});
export type DispMode = "list" | "grid";
export type ModalState =
  | { kind: "createBase"; workspaceId?: string }
  | { kind: "createWorkspace" }
  | { kind: "renameBase"; id: string; value: string }
  | { kind: "renameWorkspace"; id: string; value: string }
  | { kind: "moveBase"; id: string; currentWorkspaceId: string | null }
  | { kind: "editDesc"; id: string; value: string }
  | null;

export type BaseItem = {
  id: string;
  name: string;
  starred: boolean;
  color: string;
  icon: string;
  workspaceId: string | null;
  lastOpenedAt: Date | null;
  workspace: { id: string; name: string } | null;
  tables: { id: string; name: string; _count: { rows: number } }[];
};

export type WsFull = {
  id: string;
  name: string;
  description: string | null;
  starred: boolean;
  bases: BaseItem[];
};


