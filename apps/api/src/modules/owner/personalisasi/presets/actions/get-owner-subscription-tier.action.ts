import { Tx } from "../../../../../db/client";
import type { OwnerSubscriptionTierInfo } from "../preset.types";

/**
 * Mengambil informasi status langganan riil owner untuk menentukan kepemilikan tier Pro.
 * Multi-tenant RLS compliance: difilter berdasarkan owner_id.
 */
export async function getOwnerSubscriptionTierAction(
  tx: Tx,
  ownerId: string
): Promise<OwnerSubscriptionTierInfo> {
  const [sub] = await tx<
    {
      plan_name: string;
      display_name: string;
      status: string;
      current_period_end: Date | null;
    }[]
  >`
    SELECT p.name AS plan_name, p.display_name, s.status, s.current_period_end
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.owner_id = ${ownerId}::uuid
    LIMIT 1;
  `;

  if (!sub) {
    return {
      plan_name: "gratis",
      display_name: "Paket Gratis",
      is_active: true,
      is_pro: false,
      current_period_end: null,
    };
  }

  const now = new Date();
  const isPeriodValid = !sub.current_period_end || new Date(sub.current_period_end) > now;
  const isActive = sub.status === "active" && isPeriodValid;
  const isPro = isActive && sub.plan_name.toLowerCase() === "pro";

  return {
    plan_name: sub.plan_name,
    display_name: sub.display_name,
    is_active: isActive,
    is_pro: isPro,
    current_period_end: sub.current_period_end,
  };
}
