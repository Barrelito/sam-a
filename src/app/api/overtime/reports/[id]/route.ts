import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { OVERTIME_LIMITS } from '@/lib/overtime/config'
import type {
  AlertLevel,
  OvertimeEmployeeSummary,
  OvertimeStationSummary,
  OvertimeDashboardKpis,
} from '@/lib/overtime/types'

// GET /api/overtime/reports/[id] — Get report with dashboard data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from('overtime_reports')
      .select('*')
      .eq('id', id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Rapport hittades inte' }, { status: 404 })
    }

    // Fetch entries with employee and station joins
    const { data: entries, error: entriesError } = await supabase
      .from('overtime_entries')
      .select(`
        *,
        employee:employees(id, first_name, last_name, category),
        station:stations(id, name)
      `)
      .eq('report_id', id)
      .order('overtime_total', { ascending: false })

    if (entriesError) {
      console.error('Error fetching overtime entries:', entriesError)
      return NextResponse.json({ error: entriesError.message }, { status: 500 })
    }

    const allEntries = entries ?? []

    // Aggregate by employee (same person on multiple stations)
    const employeeMap = new Map<string, OvertimeEmployeeSummary>()

    for (const entry of allEntries) {
      const key = entry.employee_id ?? entry.raw_name
      const existing = employeeMap.get(key)

      const stationInfo = {
        id: entry.station_id,
        name: entry.station?.name ?? entry.station_name,
      }

      if (existing) {
        // Sum monthly overtime across stations
        existing.overtimeMonthly += entry.overtime_monthly
        existing.extraTimeMonthly += entry.extra_time_monthly
        existing.workedTimeMonthly += entry.worked_time_monthly
        // YTD totals — take max (should be same across sheets)
        existing.overtimeTotal = Math.max(existing.overtimeTotal, entry.overtime_total)
        existing.extraTimeTotal = Math.max(existing.extraTimeTotal, entry.extra_time_total)
        existing.workedTimeTotal = Math.max(existing.workedTimeTotal, entry.worked_time_total)
        // Add station if not already present
        if (!existing.stations.some((s) => s.name === stationInfo.name)) {
          existing.stations.push(stationInfo)
        }
        // Take worst alert
        existing.monthlyAlert = worstAlert(existing.monthlyAlert, entry.monthly_alert)
        existing.yearlyAlert = worstAlert(existing.yearlyAlert, entry.yearly_alert)
      } else {
        const displayName = entry.employee
          ? `${entry.employee.first_name} ${entry.employee.last_name}`
          : entry.matched_name ?? entry.raw_name

        employeeMap.set(key, {
          employeeId: entry.employee_id,
          rawName: entry.raw_name,
          displayName,
          category: entry.category,
          stations: [stationInfo],
          overtimeMonthly: entry.overtime_monthly,
          overtimeTotal: entry.overtime_total,
          extraTimeMonthly: entry.extra_time_monthly,
          extraTimeTotal: entry.extra_time_total,
          workedTimeMonthly: entry.worked_time_monthly,
          workedTimeTotal: entry.worked_time_total,
          monthlyAlert: entry.monthly_alert,
          yearlyAlert: entry.yearly_alert,
          monthlyPercentage: 0,
          yearlyPercentage: 0,
          hoursToYearlyLimit: 0,
        })
      }
    }

    // Compute percentages
    const employees = Array.from(employeeMap.values()).map((emp) => ({
      ...emp,
      monthlyPercentage: (emp.overtimeMonthly / OVERTIME_LIMITS.MONTHLY_LIMIT) * 100,
      yearlyPercentage: (emp.overtimeTotal / OVERTIME_LIMITS.YEARLY_LIMIT) * 100,
      hoursToYearlyLimit: Math.max(0, OVERTIME_LIMITS.YEARLY_LIMIT - emp.overtimeTotal),
    }))

    // Sort by yearly overtime desc
    employees.sort((a, b) => b.overtimeTotal - a.overtimeTotal)

    // Station summaries
    const stationMap = new Map<string, OvertimeStationSummary>()
    for (const emp of employees) {
      for (const station of emp.stations) {
        const key = station.name
        const existing = stationMap.get(key)
        const hasWarning = emp.monthlyAlert === 'warning' || emp.yearlyAlert === 'warning'
        const hasBreach = emp.monthlyAlert === 'breach' || emp.yearlyAlert === 'breach'

        if (existing) {
          existing.employeeCount++
          existing.totalOvertimeMonthly += emp.overtimeMonthly
          existing.totalOvertimeYearly += emp.overtimeTotal
          if (hasWarning) existing.warningCount++
          if (hasBreach) existing.breachCount++
        } else {
          stationMap.set(key, {
            stationId: station.id,
            stationName: station.name,
            employeeCount: 1,
            warningCount: hasWarning ? 1 : 0,
            breachCount: hasBreach ? 1 : 0,
            avgOvertimeMonthly: 0,
            avgOvertimeYearly: 0,
            totalOvertimeMonthly: emp.overtimeMonthly,
            totalOvertimeYearly: emp.overtimeTotal,
          })
        }
      }
    }

    const stations = Array.from(stationMap.values()).map((s) => ({
      ...s,
      avgOvertimeMonthly: s.employeeCount > 0 ? s.totalOvertimeMonthly / s.employeeCount : 0,
      avgOvertimeYearly: s.employeeCount > 0 ? s.totalOvertimeYearly / s.employeeCount : 0,
    }))

    // KPIs
    const overtimeTotals = employees.map((e) => e.overtimeTotal).sort((a, b) => a - b)
    const median =
      overtimeTotals.length > 0
        ? overtimeTotals.length % 2 === 0
          ? (overtimeTotals[overtimeTotals.length / 2 - 1] + overtimeTotals[overtimeTotals.length / 2]) / 2
          : overtimeTotals[Math.floor(overtimeTotals.length / 2)]
        : 0

    const kpis: OvertimeDashboardKpis = {
      totalEmployees: employees.length,
      matchedEmployees: employees.filter((e) => e.employeeId).length,
      unmatchedEmployees: employees.filter((e) => !e.employeeId).length,
      warningCount: employees.filter(
        (e) => e.monthlyAlert === 'warning' || e.yearlyAlert === 'warning'
      ).length,
      breachCount: employees.filter(
        (e) => e.monthlyAlert === 'breach' || e.yearlyAlert === 'breach'
      ).length,
      avgMonthlyOvertime:
        employees.length > 0
          ? employees.reduce((s, e) => s + e.overtimeMonthly, 0) / employees.length
          : 0,
      avgYearlyOvertime:
        employees.length > 0
          ? employees.reduce((s, e) => s + e.overtimeTotal, 0) / employees.length
          : 0,
      medianYearlyOvertime: median,
      highestMonthly: employees.length > 0
        ? {
            name: employees.reduce((a, b) =>
              a.overtimeMonthly >= b.overtimeMonthly ? a : b
            ).displayName,
            hours: Math.max(...employees.map((e) => e.overtimeMonthly)),
          }
        : null,
      highestYearly: employees.length > 0
        ? {
            name: employees[0].displayName,
            hours: employees[0].overtimeTotal,
          }
        : null,
    }

    return NextResponse.json({
      report,
      employees,
      stations,
      kpis,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/overtime/reports/[id] — Update report status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['draft', 'confirmed', 'exported'].includes(status)) {
      return NextResponse.json({ error: 'Ogiltig status' }, { status: 400 })
    }

    const { data: report, error } = await supabase
      .from('overtime_reports')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating overtime report:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/overtime/reports/[id] — Delete report (entries cascade)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('overtime_reports')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting overtime report:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'DELETE_OVERTIME',
        resource_id: id,
        resource_type: 'overtime_report',
        details: {},
      })
    } catch (e) {
      console.warn('Audit log failed:', e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function worstAlert(a: AlertLevel, b: AlertLevel): AlertLevel {
  const severity: Record<AlertLevel, number> = { none: 0, warning: 1, breach: 2 }
  return severity[a] >= severity[b] ? a : b
}
