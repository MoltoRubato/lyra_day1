import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import type { BaseItem, DispMode, ModalState, PageView, WsFull } from "~/app/_components/home/types";

export function useHomePageController() {
  const utils = api.useUtils();
  const [pendingDeleteBaseIds, setPendingDeleteBaseIds] = useState<string[]>([]);

  const { data: bases = [], isLoading: basesLoading, error: basesError } = api.base.getAll.useQuery();
  const { data: workspaces = [], isLoading: wsLoading, error: wsError } = api.workspace.getAll.useQuery();
  const isLoading = basesLoading || wsLoading;
  const error = basesError ?? wsError;

  const cancelBases = () => utils.base.getAll.cancel();
  const snapshotBases = () => utils.base.getAll.getData();
  const patchBases = (fn: Parameters<typeof utils.base.getAll.setData>[1]) =>
    utils.base.getAll.setData(undefined, fn);
  const invalidateBases = () => void utils.base.getAll.invalidate();

  const cancelWs = () => utils.workspace.getAll.cancel();
  const snapshotWs = () => utils.workspace.getAll.getData();
  const patchWs = (fn: Parameters<typeof utils.workspace.getAll.setData>[1]) =>
    utils.workspace.getAll.setData(undefined, fn);
  const invalidateWs = () => void utils.workspace.getAll.invalidate();
  const pendingDeleteBaseIdSet = useMemo(
    () => new Set(pendingDeleteBaseIds),
    [pendingDeleteBaseIds],
  );

  const removeBaseFromCachedLists = (id: string) => {
    patchBases((p) => p?.filter((b) => b.id !== id));
    patchWs((p) => p?.map((w) => ({ ...w, bases: w.bases.filter((b) => b.id !== id) })));
  };

  const createBase = api.base.create.useMutation({
    onMutate: async ({ name, workspaceId }) => {
      await cancelBases(); await cancelWs();
      const snapshotB = snapshotBases(); const snapshotW = snapshotWs();
      const tempBase: BaseItem = {
        id: `temp-base-${Date.now()}`, name, starred: false,
        color: "#f82b60", icon: "default",
        guide: null,
        workspaceId: workspaceId ?? null, lastOpenedAt: new Date(),
        createdAt: new Date(), updatedAt: new Date(),
        workspace: null, tables: [],
      };
      patchBases((p) => p ? [tempBase, ...p] : [tempBase]);
      if (workspaceId) {
        patchWs((p) => p?.map((w) => w.id !== workspaceId ? w : {
          ...w, bases: [tempBase as unknown as WsFull["bases"][number], ...w.bases],
        }));
      }
      return { snapshotB, snapshotW };
    },
    onError: (_e, _v, ctx) => { patchBases(() => ctx?.snapshotB); patchWs(() => ctx?.snapshotW); },
    onSettled: () => { invalidateBases(); invalidateWs(); },
  });

  const renameBase = api.base.rename.useMutation({
    onMutate: async ({ id, name }) => {
      await cancelBases(); await cancelWs();
      const snapshotB = snapshotBases(); const snapshotW = snapshotWs();
      patchBases((p) => p?.map((b) => b.id === id ? { ...b, name } : b));
      patchWs((p) => p?.map((w) => ({ ...w, bases: w.bases.map((b) => b.id === id ? { ...b, name } : b) })));
      return { snapshotB, snapshotW };
    },
    onError: (_e, _v, ctx) => { patchBases(() => ctx?.snapshotB); patchWs(() => ctx?.snapshotW); },
    onSettled: () => { invalidateBases(); invalidateWs(); },
  });

  const deleteBase = api.base.delete.useMutation({
    onMutate: async ({ id }) => {
      await cancelBases(); await cancelWs();
      const snapshotB = snapshotBases(); const snapshotW = snapshotWs();
      setPendingDeleteBaseIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      removeBaseFromCachedLists(id);
      return { snapshotB, snapshotW };
    },
    onSuccess: ({ id }) => {
      removeBaseFromCachedLists(id);
      setPendingDeleteBaseIds((prev) => prev.filter((candidate) => candidate !== id));
    },
    onError: (_e, v, ctx) => {
      setPendingDeleteBaseIds((prev) => prev.filter((candidate) => candidate !== v.id));
      patchBases(() => ctx?.snapshotB);
      patchWs(() => ctx?.snapshotW);
    },
    onSettled: (_data, _error, vars) => {
      setPendingDeleteBaseIds((prev) => prev.filter((candidate) => candidate !== vars.id));
      invalidateBases();
      invalidateWs();
    },
  });

  const toggleBaseStar = api.base.toggleStar.useMutation({
    onMutate: async ({ id, starred }) => {
      await cancelBases(); await cancelWs();
      const snapshotB = snapshotBases(); const snapshotW = snapshotWs();
      patchBases((p) => p?.map((b) => b.id === id ? { ...b, starred } : b));
      patchWs((p) => p?.map((w) => ({ ...w, bases: w.bases.map((b) => b.id === id ? { ...b, starred } : b) })));
      return { snapshotB, snapshotW };
    },
    onError: (_e, _v, ctx) => { patchBases(() => ctx?.snapshotB); patchWs(() => ctx?.snapshotW); },
    onSettled: invalidateBases,
  });

  const moveBase = api.base.moveToWorkspace.useMutation({
    onMutate: async ({ id, workspaceId }) => {
      await cancelBases(); await cancelWs();
      const snapshotB = snapshotBases(); const snapshotW = snapshotWs();
      patchBases((p) => p?.map((b) => b.id === id ? { ...b, workspaceId: workspaceId ?? null, workspace: null } : b));
      patchWs((p) => {
        if (!p) return p;
        const baseToMove = p.flatMap((w) => w.bases).find((b) => b.id === id);
        if (!baseToMove) return p;
        return p.map((w) => {
          if (w.bases.some((b) => b.id === id)) return { ...w, bases: w.bases.filter((b) => b.id !== id) };
          if (workspaceId && w.id === workspaceId) return { ...w, bases: [...w.bases, { ...baseToMove, workspaceId }] };
          return w;
        });
      });
      return { snapshotB, snapshotW };
    },
    onError: (_e, _v, ctx) => { patchBases(() => ctx?.snapshotB); patchWs(() => ctx?.snapshotW); },
    onSettled: () => { invalidateBases(); invalidateWs(); },
  });

  const createWs = api.workspace.create.useMutation({
    onMutate: async ({ name, description }) => {
      await cancelWs();
      const snapshot = snapshotWs();
      patchWs((p) => p ? [...p, {
        id: `temp-ws-${Date.now()}`,
        name,
        description: description ?? null,
        starred: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        bases: [],
      }] : undefined);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => patchWs(() => ctx?.snapshot),
    onSettled: invalidateWs,
  });

  const renameWs = api.workspace.rename.useMutation({
    onMutate: async ({ id, name }) => {
      await cancelWs(); await cancelBases();
      const snapshotW = snapshotWs(); const snapshotB = snapshotBases();
      patchWs((p) => p?.map((w) => w.id === id ? { ...w, name } : w));
      patchBases((p) => p?.map((b) => b.workspaceId !== id ? b : { ...b, workspace: b.workspace ? { ...b.workspace, name } : { id, name } }));
      return { snapshotW, snapshotB };
    },
    onError: (_e, _v, ctx) => { patchWs(() => ctx?.snapshotW); patchBases(() => ctx?.snapshotB); },
    onSettled: () => { invalidateWs(); invalidateBases(); },
  });

  const updateDesc = api.workspace.updateDescription.useMutation({
    onMutate: async ({ id, description }) => {
      await cancelWs();
      const snapshot = snapshotWs();
      patchWs((p) => p?.map((w) => w.id === id ? { ...w, description: description ?? null } : w));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => patchWs(() => ctx?.snapshot),
    onSettled: invalidateWs,
  });

  const deleteWs = api.workspace.delete.useMutation({
    onMutate: async ({ id }) => {
      await cancelWs(); await cancelBases();
      const snapshotW = snapshotWs(); const snapshotB = snapshotBases();
      patchWs((p) => p?.filter((w) => w.id !== id));
      patchBases((p) => p?.map((b) => b.workspaceId !== id ? b : { ...b, workspaceId: null, workspace: null }));
      return { snapshotW, snapshotB };
    },
    onError: (_e, _v, ctx) => { patchWs(() => ctx?.snapshotW); patchBases(() => ctx?.snapshotB); },
    onSettled: () => { invalidateWs(); invalidateBases(); },
  });

  const toggleWsStar = api.workspace.toggleStar.useMutation({
    onMutate: async ({ id, starred }) => {
      await cancelWs();
      const snapshot = snapshotWs();
      patchWs((p) => p?.map((w) => w.id === id ? { ...w, starred } : w));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => patchWs(() => ctx?.snapshot),
    onSettled: invalidateWs,
  });

  const [page, setPage] = useState<PageView>("home");
  const [dispMode, setDispMode] = useState<DispMode>("list");
  const [sidebarOpen, setSidebar] = useState(true);
  const [wsExpanded, setWsExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [createBaseWorkspaceId, setCreateBaseWorkspaceId] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleBases = useMemo(
    () => (bases as BaseItem[]).filter((base) => !pendingDeleteBaseIdSet.has(base.id)),
    [bases, pendingDeleteBaseIdSet],
  );
  const visibleWorkspaces = useMemo(
    () =>
      (workspaces as WsFull[]).map((workspace) => ({
        ...workspace,
        bases: workspace.bases.filter((base) => !pendingDeleteBaseIdSet.has(base.id)),
      })),
    [workspaces, pendingDeleteBaseIdSet],
  );

  const currentWorkspace = useMemo(
    () => (page !== "home" && page !== "starred" && page !== "workspaces")
      ? (visibleWorkspaces.find((w) => w.id === page) ?? null)
      : null,
    [page, visibleWorkspaces],
  );

  const filteredBases = useMemo(() => {
    const list = visibleBases;
    if (page === "starred") return list.filter((b) => b.starred);
    if (page === "workspaces") return list;
    if (page === "home") return list;
    return list.filter((b) => b.workspaceId === page);
  }, [visibleBases, page]);

  const filteredWs = useMemo(() => visibleWorkspaces, [visibleWorkspaces]);
  const starredWs = useMemo(
    () => visibleWorkspaces.filter((workspace) => workspace.starred),
    [visibleWorkspaces],
  );

  function open(m: ModalState) {
    if (!m) return;
    if (m.kind === "createBase") {
      const wsList = workspaces as WsFull[];
      const pageWorkspaceId =
        page !== "home" && page !== "starred" && page !== "workspaces" ? page : undefined;
      const explicitWorkspaceId =
        m.workspaceId && wsList.some((ws) => ws.id === m.workspaceId) ? m.workspaceId : undefined;
      const workspaceId = explicitWorkspaceId ?? pageWorkspaceId ?? wsList[0]?.id;
      setCreateBaseWorkspaceId(workspaceId ?? "");
      setNewName("Untitled Base");
      const fromWorkspaceContext =
        m.fromWorkspaceContext ??
        Boolean(pageWorkspaceId);
      setModal({ ...m, fromWorkspaceContext });
      return;
    }
    setModal(m);
    if (m.kind === "createWorkspace") { setNewName(""); setNewDesc(""); }
    if (m.kind === "renameBase" || m.kind === "renameWorkspace") setNewName(m.value);
    if (m.kind === "editDesc") setNewDesc(m.value);
    if (m.kind === "moveBase") setMoveTo(m.currentWorkspaceId ?? "");
  }

  function close() { setModal(null); }

  function submit() {
    if (!modal) return;
    switch (modal.kind) {
      case "createBase":
        createBase.mutate({
          name: newName.trim() || "Untitled Base",
          workspaceId: createBaseWorkspaceId || undefined,
        });
        break;
      case "createWorkspace":
        if (!newName.trim()) return;
        createWs.mutate({ name: newName.trim(), description: newDesc.trim() || undefined });
        break;
      case "renameBase":
        if (!newName.trim()) return;
        renameBase.mutate({ id: modal.id, name: newName.trim() });
        break;
      case "renameWorkspace":
        if (!newName.trim()) return;
        renameWs.mutate({ id: modal.id, name: newName.trim() });
        break;
      case "editDesc":
        updateDesc.mutate({ id: modal.id, description: newDesc.trim() || null });
        break;
      case "moveBase":
        moveBase.mutate({ id: modal.id, workspaceId: moveTo || null });
        break;
    }
    close();
  }

  const pageTitle =
    page === "home" ? "Home" :
      page === "starred" ? "Starred" :
        page === "workspaces" ? "Workspaces" :
          currentWorkspace?.name ?? "Workspace";

  return {
    bases: visibleBases,
    workspaces: visibleWorkspaces,
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
    createBase,
    renameBase,
    deleteBase,
    toggleBaseStar,
    moveBase,
    createWs,
    renameWs,
    updateDesc,
    deleteWs,
    toggleWsStar,
  };
}

