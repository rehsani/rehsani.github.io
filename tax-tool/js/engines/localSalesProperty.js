// Local income, sales, and property tax engines (county-level inputs).
const round2 = (x) => Math.round(x * 100) / 100;

// Local income tax: rate on income, or (base "state_tax") rate on state tax.
// taxableOffset is subtracted from gross first for jurisdictions that levy on a
// net figure (MD, IN, MI, NYC); it is 0 for OH/PA/KY, which levy on gross, and
// is ignored for the "state_tax" base.
export function localIncomeTax(gross, stateTax, localRate, localBase, taxableOffset = 0) {
  if (!localRate) return 0;
  if (localBase === "state_tax") return round2(localRate * stateTax);
  return round2(localRate * Math.max(0, gross - taxableOffset));
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
