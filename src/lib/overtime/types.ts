import type { EmployeeCategory } from '@/lib/salary-review/types'

// =============================================
// Alert Levels
// =============================================

export type AlertLevel = 'none' | 'warning' | 'breach'

// =============================================
// Parsed Data (from Excel)
// =============================================

export interface HercmaParsedEmployee {
  rawName: string              // "Efternamn, Förnamn" as-is from Excel
  lastName: string
  firstName: string
  rawCategory: string          // "Ambulanssjuksköterska" original string
  category: EmployeeCategory   // Mapped to VUB/SSK/AMB
  fmgrp: number | null
  stationName: string          // From sheet tab name
  overtimeMonthly: number      // Decimal hours
  overtimeTotal: number        // Decimal hours (YTD)
  extraTimeMonthly: number     // Mertid
  extraTimeTotal: number
  workedTimeMonthly: number
  workedTimeTotal: number
}

export interface HercmaParsedSheet {
  sheetName: string            // Raw tab name e.g. "Hallstavik 23 9"
  stationName: string          // Extracted e.g. "Hallstavik"
  employees: HercmaParsedEmployee[]
  totals: {
    overtimeMonthly: number
    overtimeTotal: number
    extraTimeMonthly: number
    extraTimeTotal: number
    workedTimeMonthly: number
    workedTimeTotal: number
  } | null
}

export interface HercmaParseResult {
  sheets: HercmaParsedSheet[]
  periodStart: string          // ISO date string
  periodEnd: string            // ISO date string
  filename: string
  warnings: string[]           // Non-fatal parse issues
  errors: string[]             // Fatal parse issues
}

// =============================================
// Database Types
// =============================================

export type OvertimeReportStatus = 'draft' | 'confirmed' | 'exported'

export interface OvertimeReport {
  id: string
  uploaded_by: string
  filename: string
  period_start: string
  period_end: string
  status: OvertimeReportStatus
  parse_warnings: string[]
  employee_count: number
  station_count: number
  created_at: string
  updated_at: string
}

export interface OvertimeEntry {
  id: string
  report_id: string
  employee_id: string | null
  raw_name: string
  matched_name: string | null
  category: EmployeeCategory
  station_id: string | null
  station_name: string
  fmgrp: number | null
  overtime_monthly: number
  overtime_total: number
  extra_time_monthly: number
  extra_time_total: number
  worked_time_monthly: number
  worked_time_total: number
  monthly_alert: AlertLevel
  yearly_alert: AlertLevel
  created_at: string
}

// =============================================
// Dashboard / Computed Types
// =============================================

export interface OvertimeEmployeeSummary {
  employeeId: string | null
  rawName: string
  displayName: string
  category: EmployeeCategory
  stations: { id: string | null; name: string }[]
  overtimeMonthly: number
  overtimeTotal: number
  extraTimeMonthly: number
  extraTimeTotal: number
  workedTimeMonthly: number
  workedTimeTotal: number
  monthlyAlert: AlertLevel
  yearlyAlert: AlertLevel
  monthlyPercentage: number    // 0-100+ (overtime_monthly / 50 * 100)
  yearlyPercentage: number     // 0-100+ (overtime_total / 200 * 100)
  hoursToYearlyLimit: number   // 200 - overtime_total
}

export interface OvertimeStationSummary {
  stationId: string | null
  stationName: string
  employeeCount: number
  warningCount: number
  breachCount: number
  avgOvertimeMonthly: number
  avgOvertimeYearly: number
  totalOvertimeMonthly: number
  totalOvertimeYearly: number
}

export interface OvertimeDashboardKpis {
  totalEmployees: number
  matchedEmployees: number
  unmatchedEmployees: number
  warningCount: number
  breachCount: number
  avgMonthlyOvertime: number
  avgYearlyOvertime: number
  medianYearlyOvertime: number
  highestMonthly: { name: string; hours: number } | null
  highestYearly: { name: string; hours: number } | null
}

export interface OvertimeDashboardData {
  report: OvertimeReport
  employees: OvertimeEmployeeSummary[]
  stations: OvertimeStationSummary[]
  kpis: OvertimeDashboardKpis
}

// =============================================
// PDF Anonymized Types
// =============================================

export interface AnonymizedEntry {
  pseudoId: string               // "HAL-01", "NOR-07"
  stationLabel: string           // "Hallstavik" or "Övriga stationer"
  category: string | null        // null if k-anonymity suppressed
  overtimeMonthly: number
  overtimeTotal: number
  yearlyPercentage: number
  monthlyAlert: AlertLevel
  yearlyAlert: AlertLevel
  hoursToYearlyLimit: number
}

export interface AnonymizedReport {
  periodStart: string
  periodEnd: string
  generatedAt: string
  entries: AnonymizedEntry[]
  stationSummaries: {
    stationLabel: string
    employeeCount: number
    totalOvertime: number
    warningCount: number
    breachCount: number
  }[]
  kpis: {
    totalEmployees: number
    totalOvertimePeriod: number
    breachMonthCount: number
    breachYearCount: number
    warnYearCount: number
    avgOvertimeYtd: number
    medianOvertimeYtd: number
  }
}

// =============================================
// Employee Matching
// =============================================

export type MatchConfidence = 'exact' | 'fuzzy' | 'none'

export interface EmployeeMatchResult {
  employeeId: string | null
  matchedName: string | null
  resolvedCategory: EmployeeCategory
  confidence: MatchConfidence
}

// =============================================
// Helpers
// =============================================

/**
 * Convert decimal hours to "H:MM" display format
 */
export function formatHours(decimal: number): string {
  if (decimal === 0) return '0:00'
  const negative = decimal < 0
  const abs = Math.abs(decimal)
  const hours = Math.floor(abs)
  const minutes = Math.round((abs - hours) * 60)
  const formatted = `${hours}:${String(minutes).padStart(2, '0')}`
  return negative ? `-${formatted}` : formatted
}
