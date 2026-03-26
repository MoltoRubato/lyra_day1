import { useCallback } from "react";
import { api } from "~/trpc/react";

export function useGridViewCacheHelpers(tableId: string) {
  const utils = api.useUtils();

  const cancelCache = useCallback(
    () => utils.table.getById.cancel({ id: tableId }),
    [utils, tableId],
  );

  const snapshotCache = useCallback(
    () => utils.table.getById.getData({ id: tableId }),
    [utils, tableId],
  );

  const patchCache = useCallback(
    (updater: Parameters<typeof utils.table.getById.setData>[1]) => {
      utils.table.getById.setData({ id: tableId }, updater);
    },
    [utils, tableId],
  );

  const restoreCache = useCallback(
    (snap: ReturnType<typeof snapshotCache>) => {
      utils.table.getById.setData({ id: tableId }, snap);
    },
    [utils, tableId],
  );

  const invalidate = useCallback(
    () => {
      const current = utils.table.getById.getData({ id: tableId });
      if (current && current.rows.length >= current.rowCount) {
        return;
      }
      // Skip invalidation if there are in-flight temp rows to avoid
      // a refetch that would wipe out optimistic state
      if (current && current.rows.some((r) => r.id.startsWith("temp-"))) {
        return;
      }
      void utils.table.getById.invalidate({ id: tableId });
    },
    [utils, tableId],
  );

  return {
    utils,
    cancelCache,
    snapshotCache,
    patchCache,
    restoreCache,
    invalidate,
  };
}
