import { api } from "~/trpc/react";

type ColumnMutationArgs = {
  tableId: string;
  cancelCache: () => Promise<void>;
  snapshotCache: () => ReturnType<ReturnType<typeof api.useUtils>["table"]["getById"]["getData"]>;
  patchCache: (updater: Parameters<ReturnType<typeof api.useUtils>["table"]["getById"]["setData"]>[1]) => void;
  restoreCache: (snap: ReturnType<ReturnType<typeof api.useUtils>["table"]["getById"]["getData"]>) => void;
  invalidate: () => void;
};

export function useGridViewColumnMutations({
  tableId,
  cancelCache,
  snapshotCache,
  patchCache,
  restoreCache,
  invalidate,
}: ColumnMutationArgs) {
  const addColumn = api.table.addColumn.useMutation({
    onMutate: async ({ name, type }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      const tempId = `temp-col-${Date.now()}`;
      patchCache((prev) => {
        if (!prev) return prev;
        const createdAt = new Date();
        return {
          ...prev,
          columns: [
            ...prev.columns,
            {
              id: tempId,
              name,
              type: type ?? "TEXT",
              description: null,
              order: prev.columns.length,
              width: 180,
              tableId,
              createdAt,
              updatedAt: createdAt,
              selectOptions: [],
            },
          ],
          rows: prev.rows.map((r) => ({
            ...r,
            cells: [
              ...r.cells,
              {
                id: `tc-${tempId}-${r.id}`,
                rowId: r.id,
                columnId: tempId,
                value: null,
                createdAt,
                updatedAt: createdAt,
              },
            ],
          })),
        };
      });
      return { snapshot, tempId };
    },
    onSuccess: (realColumn, _vars, ctx) => {
      if (!ctx?.tempId) return;
      patchCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id !== ctx.tempId
              ? col
              : {
                  ...col,
                  id: realColumn.id,
                  name: realColumn.name,
                  type: realColumn.type,
                  description: realColumn.description ?? null,
                  order: realColumn.order,
                  width: realColumn.width,
                  tableId: realColumn.tableId,
                  createdAt: realColumn.createdAt,
                  updatedAt: realColumn.updatedAt,
                  selectOptions: realColumn.selectOptions ?? [],
                },
          ),
          rows: prev.rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell) =>
              cell.columnId !== ctx.tempId ? cell : { ...cell, columnId: realColumn.id },
            ),
          })),
        };
      });
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const deleteColumn = api.table.deleteColumn.useMutation({
    onMutate: async ({ columnId }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((p) =>
        p
          ? {
              ...p,
              columns: p.columns.filter((c) => c.id !== columnId),
              rows: p.rows.map((r) => ({
                ...r,
                cells: r.cells.filter((c) => c.columnId !== columnId),
              })),
            }
          : p,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const renameColumn = api.table.renameColumn.useMutation({
    onMutate: async ({ columnId, name }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((p) =>
        p
          ? { ...p, columns: p.columns.map((c) => (c.id === columnId ? { ...c, name } : c)) }
          : p,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const changeType = api.table.changeColumnType.useMutation({
    onMutate: async ({ columnId, type }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((p) =>
        p
          ? { ...p, columns: p.columns.map((c) => (c.id === columnId ? { ...c, type } : c)) }
          : p,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const updateColumnDescription = api.table.updateColumnDescription.useMutation({
    onMutate: async ({ columnId, description }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((p) =>
        p
          ? {
              ...p,
              columns: p.columns.map((c) => (c.id === columnId ? { ...c, description } : c)),
            }
          : p,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const duplicateColumn = api.table.duplicateColumn.useMutation({
    onMutate: async ({ columnId, duplicateCells }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) => {
        if (!prev) return prev;
        const source = prev.columns.find((c) => c.id === columnId);
        if (!source) return prev;

        const copiedName = `${source.name} copy`;
        const used = new Set(prev.columns.map((c) => c.name.toLowerCase()));
        let finalName = copiedName;
        let suffix = 2;
        while (used.has(finalName.toLowerCase())) {
          finalName = `${copiedName} ${suffix}`;
          suffix += 1;
        }

        const tempId = `temp-col-copy-${Date.now()}`;
        const nextOrder = source.order + 1;
        const createdAt = new Date();
        const inserted = {
          id: tempId,
          name: finalName,
          description: source.description ?? null,
          type: source.type,
          order: nextOrder,
          width: source.width,
          tableId: source.tableId,
          createdAt,
          updatedAt: createdAt,
          selectOptions: (source.selectOptions ?? []).map((opt, idx) => ({
            ...opt,
            id: `temp-opt-copy-${Date.now()}-${idx}`,
            columnId: tempId,
          })),
        };

        return {
          ...prev,
          columns: [
            ...prev.columns.map((c) => (c.order > source.order ? { ...c, order: c.order + 1 } : c)),
            inserted,
          ].sort((a, b) => a.order - b.order),
          rows: prev.rows.map((r) => {
            const sourceValue = r.cells.find((cell) => cell.columnId === source.id)?.value ?? null;
            return {
              ...r,
              cells: [
                ...r.cells,
                {
                  id: `tc-${tempId}-${r.id}`,
                  rowId: r.id,
                  columnId: tempId,
                  value: duplicateCells ? sourceValue : null,
                  createdAt,
                  updatedAt: createdAt,
                },
              ],
            };
          }),
        };
      });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const insertColumnLeft = api.table.insertColumnLeft.useMutation({
    onMutate: async ({ anchorColumnId, name, type }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      const colName = name ?? "New field";
      const colType = type ?? "TEXT";
      patchCache((prev) => {
        if (!prev) return prev;
        const anchor = prev.columns.find((c) => c.id === anchorColumnId);
        if (!anchor) return prev;

        const tempId = `temp-col-left-${Date.now()}`;
        const createdAt = new Date();
        return {
          ...prev,
          columns: [
            ...prev.columns.map((c) =>
              c.order >= anchor.order ? { ...c, order: c.order + 1 } : c,
            ),
            {
              id: tempId,
              name: colName,
              description: null,
              type: colType,
              order: anchor.order,
              width: 180,
              tableId: anchor.tableId,
              createdAt,
              updatedAt: createdAt,
              selectOptions: [],
            },
          ].sort((a, b) => a.order - b.order),
          rows: prev.rows.map((r) => ({
            ...r,
            cells: [
              ...r.cells,
              {
                id: `tc-${tempId}-${r.id}`,
                rowId: r.id,
                columnId: tempId,
                value: null,
                createdAt,
                updatedAt: createdAt,
              },
            ],
          })),
        };
      });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const insertColumnRight = api.table.insertColumnRight.useMutation({
    onMutate: async ({ anchorColumnId, name, type }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      const colName = name ?? "New field";
      const colType = type ?? "TEXT";
      patchCache((prev) => {
        if (!prev) return prev;
        const anchor = prev.columns.find((c) => c.id === anchorColumnId);
        if (!anchor) return prev;

        const tempId = `temp-col-right-${Date.now()}`;
        const createdAt = new Date();
        const insertOrder = anchor.order + 1;
        return {
          ...prev,
          columns: [
            ...prev.columns.map((c) =>
              c.order > anchor.order ? { ...c, order: c.order + 1 } : c,
            ),
            {
              id: tempId,
              name: colName,
              description: null,
              type: colType,
              order: insertOrder,
              width: 180,
              tableId: anchor.tableId,
              createdAt,
              updatedAt: createdAt,
              selectOptions: [],
            },
          ].sort((a, b) => a.order - b.order),
          rows: prev.rows.map((r) => ({
            ...r,
            cells: [
              ...r.cells,
              {
                id: `tc-${tempId}-${r.id}`,
                rowId: r.id,
                columnId: tempId,
                value: null,
                createdAt,
                updatedAt: createdAt,
              },
            ],
          })),
        };
      });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const reorderColumns = api.table.reorderColumns.useMutation({
    onMutate: async ({ orderedIds }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) => {
        if (!prev) return prev;
        const byId = Object.fromEntries(prev.columns.map((c) => [c.id, c]));
        return { ...prev, columns: orderedIds.map((id, i) => ({ ...byId[id]!, order: i })) };
      });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const resizeColumn = api.table.resizeColumn.useMutation({
    onMutate: ({ columnId, width }) =>
      patchCache((p) =>
        p
          ? {
              ...p,
              columns: p.columns.map((c) => (c.id === columnId ? { ...c, width } : c)),
            }
          : p,
      ),
  });

  const addOption = api.table.addSelectOption.useMutation({
    onMutate: async ({ columnId, label, color }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) => {
        if (!prev) return prev;
        const tempId = `temp-opt-${Date.now()}`;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id !== columnId
              ? col
              : {
                  ...col,
                  selectOptions: [
                    ...(col.selectOptions ?? []),
                    {
                      id: tempId,
                      label,
                      color: color ?? "#166254",
                      order: (col.selectOptions ?? []).length,
                      columnId,
                    },
                  ],
                },
          ),
        };
      });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const deleteOption = api.table.deleteSelectOption.useMutation({
    onMutate: async ({ optionId }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((col) => ({
                ...col,
                selectOptions: (col.selectOptions ?? []).filter((o) => o.id !== optionId),
              })),
            }
          : prev,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  const updateOption = api.table.updateSelectOption.useMutation({
    onMutate: async ({ optionId, label, color }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((col) => ({
                ...col,
                selectOptions: (col.selectOptions ?? []).map((o) =>
                  o.id !== optionId
                    ? o
                    : {
                        ...o,
                        ...(label !== undefined ? { label } : {}),
                        ...(color !== undefined ? { color } : {}),
                      },
                ),
              })),
            }
          : prev,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });

  return {
    addColumn,
    deleteColumn,
    renameColumn,
    changeType,
    updateColumnDescription,
    duplicateColumn,
    insertColumnLeft,
    insertColumnRight,
    reorderColumns,
    resizeColumn,
    addOption,
    deleteOption,
    updateOption,
  };
}
