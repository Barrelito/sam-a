import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseHercmaExcel } from '@/lib/overtime/hercma-parser'
import { matchEmployees, type DbEmployee } from '@/lib/overtime/match-employees'
import { OVERTIME_LIMITS, MAX_FILE_SIZE_BYTES, ALLOWED_EXTENSIONS } from '@/lib/overtime/config'
import type { AlertLevel } from '@/lib/overtime/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Profile + role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, vo_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'vo_chief', 'area_manager', 'station_manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Read FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Ingen fil bifogad' }, { status: 400 })
    }

    // Validate file extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Otillåten filtyp. Tillåtna: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Filen är för stor. Max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` },
        { status: 400 }
      )
    }

    // Parse Excel
    const buffer = await file.arrayBuffer()
    const parseResult = parseHercmaExcel(buffer, file.name)

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'Parsningsfel', details: parseResult.errors },
        { status: 400 }
      )
    }

    // Fetch stations for matching
    const { data: stations } = await supabase
      .from('stations')
      .select('id, name')

    const stationMap = new Map<string, string>()
    for (const s of stations ?? []) {
      stationMap.set(s.name.toLowerCase().trim(), s.id)
    }

    // Fetch employees for cross-referencing
    let employeeQuery = supabase
      .from('employees')
      .select('id, first_name, last_name, category, station_id')

    // Role-based filtering
    if (profile.role === 'station_manager' || profile.role === 'area_manager') {
      const { data: userStations } = await supabase
        .from('user_stations')
        .select('station_id')
        .eq('user_id', user.id)

      const stationIds = userStations?.map((us) => us.station_id) ?? []

      if (profile.role === 'area_manager') {
        const { data: groupStations } = await supabase
          .from('user_station_groups')
          .select('station_group_id')
          .eq('user_id', user.id)

        if (groupStations && groupStations.length > 0) {
          const groupIds = groupStations.map((gs) => gs.station_group_id)
          const { data: members } = await supabase
            .from('station_group_members')
            .select('station_id')
            .in('station_group_id', groupIds)

          const memberIds = members?.map((m) => m.station_id) ?? []
          stationIds.push(...memberIds)
        }
      }

      if (stationIds.length > 0) {
        employeeQuery = employeeQuery.in('station_id', [...new Set(stationIds)])
      }
    }

    const { data: dbEmployees } = await employeeQuery
    const typedDbEmployees: DbEmployee[] = (dbEmployees ?? []).map((e) => ({
      id: e.id,
      first_name: e.first_name,
      last_name: e.last_name,
      category: e.category,
      station_id: e.station_id,
    }))

    // Flatten all parsed employees for matching
    const allParsed = parseResult.sheets.flatMap((s) => s.employees)
    const matchResults = matchEmployees(allParsed, typedDbEmployees)

    // Create overtime report
    const uniqueStations = new Set(parseResult.sheets.map((s) => s.stationName))
    const uniqueEmployees = new Set(allParsed.map((e) => `${e.rawName}|${e.rawCategory}`))

    const { data: report, error: reportError } = await supabase
      .from('overtime_reports')
      .insert({
        uploaded_by: user.id,
        filename: file.name,
        period_start: parseResult.periodStart,
        period_end: parseResult.periodEnd,
        status: 'draft',
        parse_warnings: parseResult.warnings,
        employee_count: uniqueEmployees.size,
        station_count: uniqueStations.size,
      })
      .select()
      .single()

    if (reportError || !report) {
      console.error('Error creating overtime report:', reportError)
      return NextResponse.json({ error: 'Kunde inte skapa rapport' }, { status: 500 })
    }

    // Build and insert entries
    const entries = []
    let matchedCount = 0
    let unmatchedCount = 0

    for (const sheet of parseResult.sheets) {
      const stationId = stationMap.get(sheet.stationName.toLowerCase().trim()) ?? null

      for (const emp of sheet.employees) {
        const matchKey = `${emp.rawName}|${emp.rawCategory}`
        const match = matchResults.get(matchKey)

        if (match?.employeeId) {
          matchedCount++
        } else {
          unmatchedCount++
        }

        // Compute alert levels
        const monthlyAlert = computeAlert(
          emp.overtimeMonthly,
          OVERTIME_LIMITS.MONTHLY_WARNING,
          OVERTIME_LIMITS.MONTHLY_LIMIT
        )
        const yearlyAlert = computeAlert(
          emp.overtimeTotal,
          OVERTIME_LIMITS.YEARLY_WARNING,
          OVERTIME_LIMITS.YEARLY_LIMIT
        )

        entries.push({
          report_id: report.id,
          employee_id: match?.employeeId ?? null,
          raw_name: emp.rawName,
          matched_name: match?.matchedName ?? null,
          category: match?.resolvedCategory ?? emp.category,
          station_id: stationId,
          station_name: sheet.stationName,
          fmgrp: emp.fmgrp,
          overtime_monthly: emp.overtimeMonthly,
          overtime_total: emp.overtimeTotal,
          extra_time_monthly: emp.extraTimeMonthly,
          extra_time_total: emp.extraTimeTotal,
          worked_time_monthly: emp.workedTimeMonthly,
          worked_time_total: emp.workedTimeTotal,
          monthly_alert: monthlyAlert,
          yearly_alert: yearlyAlert,
        })
      }
    }

    // Bulk insert entries
    if (entries.length > 0) {
      const { error: entriesError } = await supabase
        .from('overtime_entries')
        .insert(entries)

      if (entriesError) {
        console.error('Error inserting overtime entries:', entriesError)
        // Clean up the report
        await supabase.from('overtime_reports').delete().eq('id', report.id)
        return NextResponse.json({ error: 'Kunde inte spara övertidsdata' }, { status: 500 })
      }
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'UPLOAD_OVERTIME',
        resource_id: report.id,
        resource_type: 'overtime_report',
        details: {
          filename: file.name,
          period: `${parseResult.periodStart} – ${parseResult.periodEnd}`,
          employees: uniqueEmployees.size,
          stations: uniqueStations.size,
          matched: matchedCount,
          unmatched: unmatchedCount,
        },
      })
    } catch (e) {
      console.warn('Audit log failed:', e)
    }

    return NextResponse.json({
      report,
      matchedCount,
      unmatchedCount,
      warnings: parseResult.warnings,
      entryCount: entries.length,
    }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in overtime upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function computeAlert(value: number, warningThreshold: number, breachThreshold: number): AlertLevel {
  if (value >= breachThreshold) return 'breach'
  if (value >= warningThreshold) return 'warning'
  return 'none'
}
