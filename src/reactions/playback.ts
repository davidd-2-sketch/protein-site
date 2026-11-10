/* playback.ts — playback speeds for the reaction timeline. */
export const SPEEDS = [0.25, 0.5, 1] as const
export type Speed = (typeof SPEEDS)[number]

/** Seconds for the whole reaction to play at 1× speed. */
export const DURATION_SECONDS = 14
