// Exact-fraction rounding for money math: computes round(pence * numerator / denominator)
// using integer/BigInt arithmetic throughout, avoiding the floating-point boundary errors
// that plain `pence * (numerator / denominator)` can produce — the same class of bug fixed in
// promo.ts's applyDiscount (kept as a separate helper here rather than refactoring that
// already-verified function, to avoid touching previously-tested payment-calculation code).
export function exactFractionOfPence(pence: number, numerator: number, denominator: number): number {
  const num = BigInt(pence) * BigInt(numerator)
  const den = BigInt(denominator)
  const quotient = num / den
  const remainder = num % den
  return Number(remainder * 2n >= den ? quotient + 1n : quotient) // round-half-up
}
