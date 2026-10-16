function addMonths(value, offset) {
  const date = new Date(`${value}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function buildPeriods(requestedDate, durationMonths, durationDays) {
  const anchorMonth = new Date(requestedDate).toISOString().slice(0, 7);
  const periods = Array.from({ length: durationMonths }, (_, index) => ({
    key: `month-${index + 1}`,
    month: addMonths(anchorMonth, index),
    days: null,
  }));
  if (durationDays > 0) {
    periods.push({
      key: "days",
      month: addMonths(anchorMonth, durationMonths),
      days: durationDays,
    });
  }
  if (!periods.length) {
    periods.push({ key: "month-1", month: anchorMonth, days: null });
  }
  return periods;
}

export function periodAllocationKey(
  allocationMonth,
  requestedDate,
  durationMonths,
  durationDays,
) {
  const anchor = new Date(requestedDate).toISOString().slice(0, 7);
  const offset =
    (Number(allocationMonth.slice(0, 4)) - Number(anchor.slice(0, 4))) * 12 +
    Number(allocationMonth.slice(5, 7)) -
    Number(anchor.slice(5, 7));
  if (offset >= 0 && offset < durationMonths) return `month-${offset + 1}`;
  if (durationDays > 0 && offset === durationMonths) return "days";
  return null;
}