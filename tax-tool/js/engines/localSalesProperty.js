// Local income, sales, and property tax engines (county-level inputs).
const round2 = (x) => Math.round(x * 100) / 100;

// Local income tax: rate on income, or (base "state_tax") rate on state tax.
export function localIncomeTax(gross, stateTax, localRate, localBase) {
  if (!localRate) return 0;
  return round2(localBase === "state_tax" ? localRate * stateTax : localRate * gross);
}

// Sales tax applies to the taxable portion of annual spending.
// monthlySpend * 12 * taxableFraction * combinedRate.
export function salesTax(monthlySpend, taxableFraction, salesRate) {
  return round2(monthlySpend * 12 * taxableFraction * (salesRate || 0));
}

// Property tax: county effective rate applied to the house price.
// Returns null when the county has no property data (so callers can show
// no-data rather than treating it as $0).
export function propertyTax(housePrice, propertyRate) {
  if (propertyRate === null || propertyRate === undefined) return null;
  return round2(housePrice * propertyRate);
}
