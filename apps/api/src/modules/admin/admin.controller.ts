import { Tx } from "../../db/client";
import {
  logAdminOverviewAccessed,
  handleAdminOperationError,
  successResponse,
  SetContext,
} from "../../logs";
import { getAdminOverview } from "./admin.model";

export interface AdminContext {
  runAdminTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: SetContext;
}

/**
 * Controller for GET /api/admin/overview
 */
export async function getAdminOverviewController({ runAdminTx, set }: AdminContext) {
  try {
    const stats = await runAdminTx(async (tx) => {
      return await getAdminOverview(tx);
    });

    logAdminOverviewAccessed();

    return successResponse({ stats }, "Admin overview");
  } catch (err: any) {
    return handleAdminOperationError(set, "get_admin_overview", err);
  }
}
