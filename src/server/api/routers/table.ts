import { createTRPCRouter } from "~/server/api/trpc";
import { columnMutationProcedures } from "~/server/api/routers/table/columnMutations";
import { tableQueryProcedures } from "~/server/api/routers/table/queries";
import { rowMutationProcedures } from "~/server/api/routers/table/rowMutations";
import { tableMutationProcedures } from "~/server/api/routers/table/tableMutations";

export const tableRouter = createTRPCRouter({
  ...tableQueryProcedures,
  ...tableMutationProcedures,
  ...columnMutationProcedures,
  ...rowMutationProcedures,
});
