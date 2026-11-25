/**
 * Times the timeline and the embedded pages agree on, so a playhead counts as
 * live in the same way everywhere.
 */

/** The window of time the timeline spans, and an embedded page shows. */
export const HOUR_MS = 3_600_000;

/** A playhead this close to now counts as live. */
export const LIVE_SLACK_MS = 2000;

/** Whether a playhead at `t` is following now. */
export const isLive = (t: number, now: number) => now - t <= LIVE_SLACK_MS;
