import type { EmployeeCategory } from '@/lib/salary-review/types'

// =============================================
// Övertidsgränser (kollektivavtal)
// =============================================

export const OVERTIME_LIMITS = {
  MONTHLY_LIMIT: 50,       // timmar – överskridande = breach
  MONTHLY_WARNING: 40,     // timmar – varning
  YEARLY_LIMIT: 200,       // timmar – överskridande = breach
  YEARLY_WARNING: 150,     // timmar – varning
} as const

// =============================================
// HERCMA-kategorimappning
// =============================================

export const HERCMA_CATEGORY_MAP: Record<string, EmployeeCategory> = {
  'Ambulanssjuksköterska': 'SSK',   // Default – kan bli VUB vid DB-matchning
  'Ambulanssjukvårdare': 'AMB',
  'Specialistsjuksköterska': 'VUB',
}

// Omvänd mappning för visning
export const CATEGORY_DISPLAY: Record<EmployeeCategory, string> = {
  VUB: 'Specialistsjuksköterska',
  SSK: 'Sjuksköterska',
  AMB: 'Ambulanssjukvårdare',
}

// =============================================
// Stationsprefix för PDF-anonymisering
// =============================================

export const STATION_PREFIX_MAP: Record<string, string> = {
  'Hallstavik': 'HAL',
  'Norrtälje': 'NOR',
  'Rimbo': 'RIM',
}

// Fallback-prefix för okända stationer
export const DEFAULT_STATION_PREFIX = 'STN'

// =============================================
// K-anonymitet (GDPR)
// =============================================

export const MIN_K_ANONYMITY = 5

// =============================================
// Filuppladdning
// =============================================

export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls']

// =============================================
// Alert-konfiguration (UI)
// =============================================

export const ALERT_CONFIG = {
  none: {
    label: 'OK',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: null,
  },
  warning: {
    label: 'Varning',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '⚠',
  },
  breach: {
    label: 'Överskriden',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '⛔',
  },
} as const

// =============================================
// Progress bar-färger (procent av årsgräns)
// =============================================

export function getProgressColor(percentage: number): string {
  if (percentage > 100) return 'bg-red-500'
  if (percentage >= 90) return 'bg-orange-500'
  if (percentage >= 75) return 'bg-yellow-500'
  return 'bg-green-500'
}
