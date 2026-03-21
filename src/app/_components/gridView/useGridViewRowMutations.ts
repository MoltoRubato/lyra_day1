import { useCallback, useRef } from "react";
import { api } from "~/trpc/react";

type EditingCell = { rowId: string; columnId: string; value: string };

type RowMutationArgs = {
  tableId: string;
  visCols: Array<{ id: string; type: string }>;
  isSelect: (type: string) => boolean;
  setEditing: React.Dispatch<React.SetStateAction<EditingCell | null>>;
  cancelCache: () => Promise<void>;
  snapshotCache: () => ReturnType<ReturnType<typeof api.useUtils>["table"]["getById"]["getData"]>;
  patchCache: (updater: Parameters<ReturnType<typeof api.useUtils>["table"]["getById"]["setData"]>[1]) => void;
  restoreCache: (snap: ReturnType<ReturnType<typeof api.useUtils>["table"]["getById"]["getData"]>) => void;
  invalidate: () => void;
};

export function useGridViewRowMutations({
  tableId,
  visCols,
  isSelect,
  setEditing,
  cancelCache,
  snapshotCache,
  patchCache,
  restoreCache,
  invalidate,
}: RowMutationArgs) {
  const tempToRealId = useRef<Record<string, string>>({});
  const pendingEdits = useRef<
    Array<{ tempRowId: string; columnId: string; value: string | null }>
  >([]);

  const updateCell = api.table.updateCell.useMutation({
    onMutate: async ({ rowId, columnId, value }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) =>
        prev
          ? {
              ...prev,
              rows: prev.rows.map((r) =>
                r.id !== rowId
                  ? r
                  : {
                      ...r,
                      cells: (() => {
                        const existing = r.cells.find((c) => c.columnId === columnId);
                        if (existing) {
                          return r.cells.map((c) =>
                            c.columnId !== columnId ? c : { ...c, value },
                          );
                        }
                        return [
                          ...r.cells,
                          {
                            id: `temp-cell-${rowId}-${columnId}`,
                            rowId,
                            columnId,
                            value,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                          },
                        ];
                      })(),
                    },
              ),
            }
          : prev,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
  });

  const addRow = api.table.addRow.useMutation({
    onMutate: async () => {
      await cancelCache();
      const snapshot = snapshotCache();
      const tempId = `temp-${Date.now()}`;
      patchCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: [
            ...prev.rows,
            {
              id: tempId,
              tableId,
              order: prev.rows.length,
              createdAt: new Date(),
              updatedAt: new Date(),
              cells: prev.columns.map((c) => ({
                id: `tc-${c.id}-${tempId}`,
                rowId: tempId,
                columnId: c.id,
                value: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
            },
          ],
          rowCount: prev.rowCount + 1,
        };
      });

      const firstEditable = visCols.find(
        (c) => c.type !== "CHECKBOX" && c.type !== "ATTACHMENT" && !isSelect(c.type),
      );
      if (firstEditable) {
        setEditing({ rowId: tempId, columnId: firstEditable.id, value: "" });
      }

      return { snapshot, tempId };
    },
    onSuccess: (realRow, _vars, ctx) => {
      if (!ctx?.tempId) return;
      const { tempId } = ctx;
      tempToRealId.current[tempId] = realRow.id;
      patchCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((r) =>
            r.id === tempId
              ? { ...realRow, cells: r.cells.map((c) => ({ ...c, rowId: realRow.id })) }
              : r,
          ),
        };
      });

      setEditing((prev) => (prev?.rowId === tempId ? { ...prev, rowId: realRow.id } : prev));

      const queued = pendingEdits.current.filter((e) => e.tempRowId === tempId);
      pendingEdits.current = pendingEdits.current.filter((e) => e.tempRowId !== tempId);
      for (const edit of queued) {
        updateCell.mutate({ rowId: realRow.id, columnId: edit.columnId, value: edit.value });
      }
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const deleteRow = api.table.deleteRow.useMutation({
    onMutate: async ({ rowId }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((p) =>
        p
          ? {
              ...p,
              rows: p.rows.filter((r) => r.id !== rowId),
              rowCount: Math.max(0, p.rowCount - 1),
            }
          : p,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const bulkDeleteRows = api.table.bulkDeleteRows.useMutation({
    onMutate: async (value) => {
      await cancelCache();
      const snapshot = snapshotCache();
      const deleteAll = !("rowIds" in value);
      const doomed = deleteAll ? new Set<string>() : new Set(value.rowIds);
      patchCache((p) =>
        p
          ? {
              ...p,
              rows: deleteAll ? [] : p.rows.filter((r) => !doomed.has(r.id)),
              rowCount: deleteAll
                ? 0
                : Math.max(0, p.rowCount - doomed.size),
            }
          : p,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const reorderRows = api.table.reorderRows.useMutation({
    onMutate: async ({ orderedIds }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
      patchCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows
            .map((r) => ({
              ...r,
              order: orderMap.has(r.id) ? (orderMap.get(r.id) ?? r.order) : r.order,
            }))
            .sort((a, b) => a.order - b.order),
        };
      });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const safeUpdateCell = useCallback(
    (rowId: string, columnId: string, value: string | null) => {
      const realId = tempToRealId.current[rowId] ?? rowId;
      if (realId.startsWith("temp-")) {
        patchCache((prev) =>
          prev
            ? {
                ...prev,
                rows: prev.rows.map((r) =>
                  r.id !== realId
                    ? r
                    : {
                        ...r,
                        cells: r.cells.map((c) =>
                          c.columnId !== columnId ? c : { ...c, value },
                        ),
                      },
                ),
              }
            : prev,
        );
        pendingEdits.current.push({ tempRowId: rowId, columnId, value });
        return;
      }
      updateCell.mutate({ rowId: realId, columnId, value });
    },
    [updateCell, patchCache],
  );

  return {
    updateCell,
    addRow,
    deleteRow,
    bulkDeleteRows,
    reorderRows,
    safeUpdateCell,
  };
}
