// Server-side age check for signup validation (16-100 bound) only — API responses return the
// raw dateOfBirth and both frontends compute age client-side for display, so there's never a
// stale computed age reconciled against a different clock.
export function calculateAge(dateOfBirth: Date): number {
  const now = new Date()
  let age = now.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = now.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age--
  }
  return age
}
