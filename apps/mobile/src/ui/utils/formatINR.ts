/**
 * Indian-system currency formatting: ₹1,23,456 — lakh/crore grouping,
 * no decimals for whole rupees (fines and pots are whole ₹ in CONQR).
 */
const formatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function formatINR(amount: number): string {
  return `₹${formatter.format(amount)}`;
}
