/** Map a recency window in hours to France Travail `publieeDepuis` (days, 1–31). */
export function hoursToPublieeDepuis(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return 7
  const days = Math.ceil(hours / 24)
  return Math.max(1, Math.min(31, days))
}
