// Combine all engines into a per-county total-tax breakdown.
import { federalTotal } from "./federal.js";
import { stateIncomeTax } from "./stateIncome.js";
import { localIncomeTax, salesTax, propertyTax } from "./localSalesProperty.js";

// Compute the tax breakdown for one county.
//   inputs: {gross, status, monthlySpend, housePrice, taxableFraction}
//   county: {state, property_rate, sales_rate, local_rate, local_base}
//   stateRecords: states map from state_income_tax.json
//   federal: precomputed federal total (constant across counties)
export function countyBreakdown(inputs, county, stateRecords, federal) {
  const { gross, status, monthlySpend, housePrice, taxableFraction } = inputs;
  const property = propertyTax(housePrice, county.property_rate);
  if (property === null) return null; // no property data -> render as no-data
  const stateInc = stateIncomeTax(gross, status, stateRecords[county.state]);
  const local = localIncomeTax(gross, stateInc, county.local_rate, county.local_base);
  const sales = salesTax(monthlySpend, taxableFraction, county.sales_rate);
  const total = Math.round((federal + stateInc + local + sales + property) * 100) / 100;
  return {
    federal, stateIncome: stateInc, localIncome: local,
    sales, property, total,
    effective: gross > 0 ? total / gross : 0,
  };
}
