import { z } from 'zod';

/**
 * Unified shipment status, the same for every courier.
 * Courier modules map their own codes to these six values (see docs/features/F03-bex-modul.md).
 */
export const UNIFIED_STATUSES = [
  'created',
  'in_transit',
  'failed_delivery',
  'delivered',
  'returning',
  'returned',
] as const;

export type UnifiedStatus = (typeof UNIFIED_STATUSES)[number];

export const unifiedStatusSchema = z.enum(UNIFIED_STATUSES);

export function isUnifiedStatus(value: unknown): value is UnifiedStatus {
  return unifiedStatusSchema.safeParse(value).success;
}
