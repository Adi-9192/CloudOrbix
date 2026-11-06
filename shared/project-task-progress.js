export function normalizeProjectTaskProgress(value) {
  const progress = Number(value);
  if (!Number.isFinite(progress)) return 0;
  const percentage = progress > 0 && progress <= 1 ? progress * 100 : progress;
  return Math.min(100, Math.max(0, percentage));
}
