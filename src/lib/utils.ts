import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date utilities
export function getMonthName(month: number): string {
  const monthNames = [
    "Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December"
  ]
  return monthNames[month - 1] || ""
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

export function getTertial(month: number): number {
  if (month <= 4) return 1
  if (month <= 8) return 2
  return 3
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
