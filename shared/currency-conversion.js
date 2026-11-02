export function convertCurrencyAmount(amount, fromInrPerUnit, toInrPerUnit) {
  const value = Number(amount);
  const sourceRate = Number(fromInrPerUnit);
  const targetRate = Number(toInrPerUnit);

  if (
    !Number.isFinite(value) ||
    !Number.isFinite(sourceRate) ||
    !Number.isFinite(targetRate) ||
    sourceRate <= 0 ||
    targetRate <= 0
  ) {
    throw new RangeError("Currency conversion requires a finite amount and positive exchange rates.");
  }

  return (value * sourceRate) / targetRate;
}
