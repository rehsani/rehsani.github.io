// State income tax engine. Mirrors data_pipeline/state_income_tax.py.
// `records` is the states map from web/data/state_income_tax.json.
import { progressiveTax } from "./brackets.js";

// Standard deduction for states whose chart steps down with AGI: it holds at
// `base` up to `start`, then drops by `decrement` for every `step` dollars of
// AGI, bottoming out at `floor` (Alabama, Form 40 instructions p.9). Returns
// null when the state has no phase-down chart.
export function phasedStandardDeduction(agi, status, record) {
  const chart = (record.standard_deduction_phasedown || {})[status];
  if (!chart) return null;
  if (agi < chart.start) return chart.base;
  const steps = Math.floor((agi - chart.start) / chart.step) + 1;
  return Math.max(chart.floor, chart.base - chart.decrement * steps);
}

// Tax from a state's low-income table, or null if the filer is over its limit.
// The table replaces the standard-deduction path for a filer within its limits
// (the deduction is already built into it). It is a PRE-credit figure, so the
// caller still applies any personal tax credit afterwards. Zero up to `zero_to`;
// above that the published rows are linear in AGI (Arkansas, 2025 Low Income
// Tax Tables).
export function lowIncomeTableTax(agi, table) {
  if (agi > table.ceiling) return null;
  if (agi <= table.zero_to) return 0;
  return Math.max(0, (agi - table.intercept) * table.rate);
}

// federalIncomeTax is deductible only in states flagged federal_tax_deductible
// (Alabama); it is ignored everywhere else.
export function stateIncomeTax(gross, status, record, federalIncomeTax = 0) {
  if (!record || record.type === "none") return 0;
  const fs = record.filing_statuses[status] || record.filing_statuses.single;
  const exemption = fs.personal_exemption || 0;
  const asCredit = fs.exemption_is_credit || false;
  const charted = phasedStandardDeduction(gross, status, record);
  const deduction = charted !== null ? charted : (fs.standard_deduction || 0);
  const federalDeduction = record.federal_tax_deductible ? federalIncomeTax : 0;
  const taxable = gross - deduction - federalDeduction - (asCredit ? 0 : exemption);

  let tax = progressiveTax(taxable, fs.brackets);
  if (asCredit) tax = Math.max(0, tax - exemption);

  if (fs.low_income_table) {
    const low = lowIncomeTableTax(gross, fs.low_income_table);
    // The table is the filer's category, not an alternative to compare against
    // (AR1000F line 26 selects one table). It is a pre-credit figure, so the
    // personal credit still comes off after it: line 29 tax -> line 34 credits.
    if (low !== null) tax = Math.max(0, low - (asCredit ? exemption : 0));
  }
  return Math.round(tax * 100) / 100;
}
