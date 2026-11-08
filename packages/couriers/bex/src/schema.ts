import { z } from 'zod';

/**
 * Response of GET /api/Shipments/shipmentHistory.
 * Only the fields we use are validated; unknown fields are ignored.
 * `eventPrediction` holds masked recipient data and is intentionally not parsed.
 */
export const bexHistoryEventSchema = z.object({
  statusCode: z.number().int(),
  scanCode: z.number().int(),
  reasonCode: z.number().int(),
  statusName: z.string(),
  statusLocation: z.string().nullish(),
  /** Local time without offset, e.g. "2026-01-05T09:46:42". */
  timeStamp: z.string(),
  /** Offset of `timeStamp`, e.g. "GMT+1" (winter) or "GMT+2" (summer). */
  timeZone: z.string(),
});

export const bexHistoryResponseSchema = z.object({
  listShipmentHistory: z.array(bexHistoryEventSchema),
});

export type BexHistoryEvent = z.infer<typeof bexHistoryEventSchema>;
export type BexHistoryResponse = z.infer<typeof bexHistoryResponseSchema>;
