import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// `fullName` stays the single field stored/sent everywhere; these just split/join it
// for UI that wants separate first/last name inputs.
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = fullName.split(" ")
  return { firstName, lastName: rest.join(" ") }
}

export function joinFullName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(" ")
}
