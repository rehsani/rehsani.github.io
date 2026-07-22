// State income tax engine. Mirrors data_pipeline/state_income_tax.py.
// `records` is the states map from web/data/state_income_tax.json.
import { progressiveTax } from "./brackets.js";

export function stateIncomeTax(gross, status, record) {
  if (!record || record.type === "none") return 0;
  const fs = record.filing_statuses[status] || record.filing_statuses.single;
  const exemption = fs.personal_exemption || 0;
  const asCredit = fs.exemption_is_credit || false;
  const deduction = fs.standard_deduction || 0;
  const taxable = gross - deduction - (asCredit ? 0 : exemption);
  let tax = progressiveTax(taxable, fs.brackets);
  if (asCredit) tax = Math.max(0, tax - exemption);
  return Math.round(tax * 100) / 100;
}
