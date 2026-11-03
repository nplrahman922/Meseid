import { Tx } from "../../../../db/client";
import { UpdatedOwnerRecord, UpdateOwnerProfileInput } from "../profile.types";

/**
 * Memperbarui data profil bisnis owner (nama bisnis, tipe, telepon, deskripsi, dsb).
 */
export async function updateOwnerProfile(
  tx: Tx,
  ownerId: string,
  data: UpdateOwnerProfileInput
): Promise<UpdatedOwnerRecord> {
  const customBusinessType = data.custom_business_type ?? null;
  const businessDescription = data.business_description ?? null;
  const phone = data.phone ?? null;
  const onboardingCompleted = data.onboarding_completed !== undefined ? data.onboarding_completed : null;

  const [updated] = await tx<UpdatedOwnerRecord[]>`
    UPDATE owners
    SET business_name = COALESCE(${data.business_name?.trim() || null}, business_name),
        business_type = COALESCE(${data.business_type || null}, business_type),
        custom_business_type = CASE WHEN ${data.custom_business_type !== undefined} THEN ${customBusinessType} ELSE custom_business_type END,
        business_description = CASE WHEN ${data.business_description !== undefined} THEN ${businessDescription} ELSE business_description END,
        phone = CASE WHEN ${data.phone !== undefined} THEN ${phone} ELSE phone END,
        onboarding_completed = CASE WHEN ${data.onboarding_completed !== undefined} THEN ${onboardingCompleted} ELSE onboarding_completed END,
        timezone = COALESCE(${data.timezone || null}, timezone),
        updated_at = now()
    WHERE id = ${ownerId}::uuid
    RETURNING id, business_name, business_type, custom_business_type, business_description,
              phone, onboarding_completed, timezone, status, updated_at;
  `;

  return updated;
}
