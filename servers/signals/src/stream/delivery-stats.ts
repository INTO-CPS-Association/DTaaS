import { Injectable } from '@nestjs/common';

/**
 * Why a broker message was not forwarded: larger than max-message-bytes,
 * outside the payload convention, or the client was reading slower than
 * max-backlog-bytes allows.
 */
export type DropReason = 'tooLarge' | 'invalid' | 'congested';

/** What one stream, or all the streams of one user, delivered. */
export type DeliveryCounts = {
  forwarded: number;
  /** Past readings sent from the history to fill a gap. */
  backfilled: number;
  dropped: Record<DropReason, number>;
};

export function emptyCounts(): DeliveryCounts {
  return {
    forwarded: 0,
    backfilled: 0,
    dropped: { tooLarge: 0, invalid: 0, congested: 0 },
  };
}

function addTo(total: DeliveryCounts, counts: DeliveryCounts): void {
  total.forwarded += counts.forwarded;
  total.backfilled += counts.backfilled;
  total.dropped.tooLarge += counts.dropped.tooLarge;
  total.dropped.invalid += counts.dropped.invalid;
  total.dropped.congested += counts.dropped.congested;
}

/**
 * Totals per user of the streams that have ended since the gateway started,
 * so a delivery measurement can compare what was published with what was
 * forwarded. Keyed by user id, so it grows only with the users who open a
 * stream.
 */
@Injectable()
export default class DeliveryStats {
  private readonly totals = new Map<string, DeliveryCounts>();

  record(userId: string, counts: DeliveryCounts): void {
    const total = this.totals.get(userId) ?? emptyCounts();
    addTo(total, counts);
    this.totals.set(userId, total);
  }

  of(userId: string): DeliveryCounts {
    const total = emptyCounts();
    const recorded = this.totals.get(userId);
    if (recorded !== undefined) addTo(total, recorded);
    return total;
  }
}
