// Federal tax engine (2025): income tax + Social Security + Medicare.
// Mirrors data_pipeline/federal_tax.py.
import { progressiveTax } from "./brackets.js";

const FEDERAL_BRACKETS = {
  single: [[0, 0.10], [11925, 0.12], [48475, 0.22], [103350, 0.24],
           [197300, 0.32], [250525, 0.35], [626350, 0.37]],
  married_jointly: [[0, 0.10], [23850, 0.12], [96950, 0.22], [206700, 0.24],
                    [394600, 0.32], [501050, 0.35], [751600, 0.37]],
  head_of_household: [[0, 0.10], [17000, 0.12], [64850, 0.22], [103350, 0.24],
                      [197300, 0.32], [250500, 0.35], [626350, 0.37]],
};

const STANDARD_DEDUCTION = { single: 15750, married_jointly: 31500, head_of_household: 23625 };

const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 176100;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLD = { single: 200000, married_jointly: 250000, head_of_household: 200000 };

// Round to cents to stay bit-identical with the Python engines.
const round2 = (x) => Math.round(x * 100) / 100;

export function federalIncomeTax(gross, status) {
  return round2(progressiveTax(gross - STANDARD_DEDUCTION[status], FEDERAL_BRACKETS[status]));
}

export function socialSecurityTax(gross) {
  return round2(Math.min(gross, SOCIAL_SECURITY_WAGE_BASE) * SOCIAL_SECURITY_RATE);
}

export function medicareTax(gross, status) {
  const over = Math.max(0, gross - ADDITIONAL_MEDICARE_THRESHOLD[status]);
  return round2(gross * MEDICARE_RATE + over * ADDITIONAL_MEDICARE_RATE);
}

// Federal total is constant across the map for a given income + status.
// incomeType "wage" applies FICA (Social Security + Medicare); "nonwage"
// (retirement/investment income) applies income tax only.
export function federalTotal(gross, status, incomeType = "wage") {
  const payroll = incomeType === "wage"
    ? socialSecurityTax(gross) + medicareTax(gross, status) : 0;
  return round2(federalIncomeTax(gross, status) + payroll);
}
