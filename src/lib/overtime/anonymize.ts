import { STATION_PREFIX_MAP, DEFAULT_STATION_PREFIX, MIN_K_ANONYMITY, OVERTIME_LIMITS } from './config'
import type { AlertLevel, AnonymizedEntry, AnonymizedReport, OvertimeEntry, OvertimeReport } from './types'

// =============================================
// Public API
// =============================================

interface StationInfo {
  id: string
  name: string
}

/**
 * Anonymize overtime data for PDF export.
 * Pure function — no side effects.
 *
 * Applies:
 * 1. Pseudonymized IDs (HAL-01, NOR-07, etc.)
 * 2. K-anonymity: stations with < MIN_K_ANONYMITY employees merged to "Övriga stationer"
 * 3. Category suppression: hidden if < MIN_K_ANONYMITY per category per station
 * 4. No names, no fmgrp
 */
export function anonymizeOvertimeData(
  report: OvertimeReport,
  entries: OvertimeEntry[],
  stations: StationInfo[]
): AnonymizedReport {
  // 1. Aggregate entries by employee (same person may appear on multiple stations)
  const employeeMap = aggregateByEmployee(entries)

  // 2. Group by station and apply k-anonymity
  const { groups, mergedStations } = applyKAnonymity(
    Array.from(employeeMap.values()),
    stations
  )

  // 3. Generate pseudonymized entries
  const anonymizedEntries: AnonymizedEntry[] = []

  for (const [stationLabel, employees] of Object.entries(groups)) {
    const prefix = getStationPrefix(stationLabel)

    // Sort by overtime total desc for consistent numbering
    const sorted = [...employees].sort((a, b) => b.overtimeTotal - a.overtimeTotal)

    // Check category k-anonymity per station
    const categoryCounts = new Map<string, number>()
    for (const emp of sorted) {
      categoryCounts.set(emp.category, (categoryCounts.get(emp.category) ?? 0) + 1)
    }

    sorted.forEach((emp, idx) => {
      const categoryCount = categoryCounts.get(emp.category) ?? 0
      const showCategory = categoryCount >= MIN_K_ANONYMITY

      anonymizedEntries.push({
        pseudoId: `${prefix}-${String(idx + 1).padStart(2, '0')}`,
        stationLabel,
        category: showCategory ? emp.category : null,
        overtimeMonthly: emp.overtimeMonthly,
        overtimeTotal: emp.overtimeTotal,
        yearlyPercentage: (emp.overtimeTotal / OVERTIME_LIMITS.YEARLY_LIMIT) * 100,
        monthlyAlert: emp.monthlyAlert,
        yearlyAlert: emp.yearlyAlert,
        hoursToYearlyLimit: Math.max(0, OVERTIME_LIMITS.YEARLY_LIMIT - emp.overtimeTotal),
      })
    })
  }

  // 4. Station summaries
  const stationSummaries = Object.entries(groups).map(([stationLabel, employees]) => ({
    stationLabel,
    employeeCount: employees.length,
    totalOvertime: employees.reduce((sum, e) => sum + e.overtimeMonthly, 0),
    warningCount: employees.filter(
      (e) => e.monthlyAlert === 'warning' || e.yearlyAlert === 'warning'
    ).length,
    breachCount: employees.filter(
      (e) => e.monthlyAlert === 'breach' || e.yearlyAlert === 'breach'
    ).length,
  }))

  // 5. KPIs
  const allEmployees = Array.from(employeeMap.values())
  const overtimeTotals = allEmployees.map((e) => e.overtimeTotal).sort((a, b) => a - b)
  const median =
    overtimeTotals.length > 0
      ? overtimeTotals.length % 2 === 0
        ? (overtimeTotals[overtimeTotals.length / 2 - 1] + overtimeTotals[overtimeTotals.length / 2]) / 2
        : overtimeTotals[Math.floor(overtimeTotals.length / 2)]
      : 0

  return {
    periodStart: report.period_start,
    periodEnd: report.period_end,
    generatedAt: new Date().toISOString(),
    entries: anonymizedEntries,
    stationSummaries,
    kpis: {
      totalEmployees: allEmployees.length,
      totalOvertimePeriod: allEmployees.reduce((s, e) => s + e.overtimeMonthly, 0),
      breachMonthCount: allEmployees.filter((e) => e.monthlyAlert === 'breach').length,
      breachYearCount: allEmployees.filter((e) => e.yearlyAlert === 'breach').length,
      warnYearCount: allEmployees.filter((e) => e.yearlyAlert === 'warning').length,
      avgOvertimeYtd:
        allEmployees.length > 0
          ? allEmployees.reduce((s, e) => s + e.overtimeTotal, 0) / allEmployees.length
          : 0,
      medianOvertimeYtd: median,
    },
  }
}

// =============================================
// Aggregation
// =============================================

interface AggregatedEmployee {
  rawName: string
  category: string
  primaryStation: string
  overtimeMonthly: number
  overtimeTotal: number
  monthlyAlert: AlertLevel
  yearlyAlert: AlertLevel
}

function aggregateByEmployee(entries: OvertimeEntry[]): Map<string, AggregatedEmployee> {
  const map = new Map<string, AggregatedEmployee>()

  for (const entry of entries) {
    // Key by raw_name + category for grouping
    const key = `${entry.raw_name}|${entry.category}`

    const existing = map.get(key)
    if (existing) {
      // Sum monthly overtime across stations
      existing.overtimeMonthly += entry.overtime_monthly
      // YTD total is cumulative — take the max (should be same across sheets)
      existing.overtimeTotal = Math.max(existing.overtimeTotal, entry.overtime_total)
      // Take worst alert
      existing.monthlyAlert = worstAlert(existing.monthlyAlert, entry.monthly_alert)
      existing.yearlyAlert = worstAlert(existing.yearlyAlert, entry.yearly_alert)
    } else {
      map.set(key, {
        rawName: entry.raw_name,
        category: entry.category,
        primaryStation: entry.station_name,
        overtimeMonthly: entry.overtime_monthly,
        overtimeTotal: entry.overtime_total,
        monthlyAlert: entry.monthly_alert,
        yearlyAlert: entry.yearly_alert,
      })
    }
  }

  return map
}

// =============================================
// K-Anonymity
// =============================================

function applyKAnonymity(
  employees: AggregatedEmployee[],
  _stations: StationInfo[]
): {
  groups: Record<string, AggregatedEmployee[]>
  mergedStations: string[]
} {
  // Group by primary station
  const stationGroups = new Map<string, AggregatedEmployee[]>()
  for (const emp of employees) {
    const existing = stationGroups.get(emp.primaryStation) ?? []
    existing.push(emp)
    stationGroups.set(emp.primaryStation, existing)
  }

  const result: Record<string, AggregatedEmployee[]> = {}
  const mergedStations: string[] = []
  const ovriga: AggregatedEmployee[] = []

  for (const [station, emps] of stationGroups) {
    if (emps.length >= MIN_K_ANONYMITY) {
      result[station] = emps
    } else {
      // Merge small stations into "Övriga stationer"
      mergedStations.push(station)
      ovriga.push(...emps)
    }
  }

  if (ovriga.length > 0) {
    result['Övriga stationer'] = ovriga
  }

  return { groups: result, mergedStations }
}

// =============================================
// Helpers
// =============================================

function getStationPrefix(stationLabel: string): string {
  if (stationLabel === 'Övriga stationer') return 'OVR'
  return STATION_PREFIX_MAP[stationLabel] ?? DEFAULT_STATION_PREFIX
}

function worstAlert(a: AlertLevel, b: AlertLevel): AlertLevel {
  const severity: Record<AlertLevel, number> = { none: 0, warning: 1, breach: 2 }
  return severity[a] >= severity[b] ? a : b
}
