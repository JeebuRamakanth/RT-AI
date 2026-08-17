/**
 * Relative-time formatter — small, dependency-free, deterministic.
 * Renders lastMessageAt as "just now", "5m", "3h", "2d", or a short date.
 * Never fabricates timestamps; falls back to "—" for invalid input.
 */

export function formatRelativeTime(timestamp: number | null | undefined, now: number = Date.now()): string {
  if (!timestamp || Number.isNaN(timestamp)) return "—";
  const diff = now - timestamp;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  // Beyond a week: short date.
  const d = new Date(timestamp);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** A short absolute date for headers/tooltips. */
export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp || Number.isNaN(timestamp)) return "—";
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
