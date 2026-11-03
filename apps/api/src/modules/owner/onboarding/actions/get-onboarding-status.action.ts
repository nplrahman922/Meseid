import { Tx } from "../../../../db/client";
import { OnboardingStatusResult } from "../onboarding.types";

/**
 * Operasi Query status ringkas kemajuan onboarding.
 */
export async function getOnboardingStatus(
  tx: Tx,
  ownerId: string
): Promise<OnboardingStatusResult> {
  const [owner] = await tx`
    SELECT business_name, business_type, custom_business_type, business_description,
           phone, onboarding_completed
    FROM owners
    WHERE id = ${ownerId}::uuid;
  `;

  const channels = await tx<{ channel: string }[]>`
    SELECT channel
    FROM channel_connections
    WHERE owner_id = ${ownerId}::uuid AND status = 'connected';
  `;

  const [kb] = await tx<{ count: string }[]>`
    SELECT count(*)::text as count
    FROM knowledge_base
    WHERE owner_id = ${ownerId}::uuid;
  `;

  return {
    onboardingCompleted: owner?.onboarding_completed ?? false,
    businessName: owner?.business_name || "",
    businessType: owner?.business_type || "",
    customCategory: owner?.custom_business_type || null,
    businessDescription: owner?.business_description || null,
    phone: owner?.phone || null,
    connectedChannels: channels.map((c) => c.channel),
    kbCount: parseInt(kb?.count || "0", 10),
  };
}
