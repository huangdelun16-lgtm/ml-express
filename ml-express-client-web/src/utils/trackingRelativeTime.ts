export function formatTrackingAge(
  lastActive: string | number | Date | null | undefined,
  labels: { justNow: string; minutesAgo: string; hoursAgo: string },
): string {
  if (lastActive == null || lastActive === '') return labels.justNow;
  const ts = new Date(lastActive).getTime();
  if (Number.isNaN(ts)) return labels.justNow;
  const deltaSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (deltaSec < 45) return labels.justNow;
  const minutes = Math.max(1, Math.round(deltaSec / 60));
  if (minutes < 60) return labels.minutesAgo.replace('{n}', String(minutes));
  const hours = Math.max(1, Math.round(minutes / 60));
  return labels.hoursAgo.replace('{n}', String(hours));
}
