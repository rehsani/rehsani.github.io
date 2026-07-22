// Progressive bracket tax, shared by the federal and state income engines.
// brackets: [[lowerThreshold, marginalRate], ...] sorted ascending.
export function progressiveTax(taxable, brackets) {
  taxable = Math.max(0, taxable);
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const [lower, rate] = brackets[i];
    if (taxable <= lower) break;
    const upper = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
    tax += (Math.min(taxable, upper) - lower) * rate;
  }
  return tax;
}
