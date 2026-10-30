export function isValidRevenueRecoveryPercentage(value) {
  if (value === undefined || value === null || value === "") return true;
  const percentage = Number(value);
  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100;
}

export function calculateRevenueRecovery(revenue, percentage) {
  const totalRevenue = Number(revenue) || 0;
  const recoveryPercentage = Number(percentage) || 0;
  const recoveredRevenue = (totalRevenue * recoveryPercentage) / 100;

  return {
    recoveredRevenue,
    pendingRevenue: totalRevenue - recoveredRevenue,
  };
}
