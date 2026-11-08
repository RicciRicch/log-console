/**
 * Nazivi poslova (redova) u pg-boss-u. Novi posao se dodaje ovde i u `registerJobs`.
 * Posle M0 ovde ulaze poll-statuses (F04), evaluate-alerts (F05), process-import (F02),
 * match-cod-payments (F07) i sync-google-sheet (F08).
 */
export const QUEUES = {
  health: 'health',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
