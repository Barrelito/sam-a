import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { anonymizeOvertimeData } from '@/lib/overtime/anonymize'
import { sanitizePdfContent } from '@/lib/overtime/pdf-sanitizer'
import { OVERTIME_LIMITS } from '@/lib/overtime/config'
import { formatHours } from '@/lib/overtime/types'
import type { AnonymizedReport } from '@/lib/overtime/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Role check (admin, vo_chief, area_manager)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'vo_chief', 'area_manager', 'station_manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { reportId } = body

    if (!reportId) {
      return NextResponse.json({ error: 'reportId krävs' }, { status: 400 })
    }

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from('overtime_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Rapport hittades inte' }, { status: 404 })
    }

    // Fetch entries
    const { data: entries, error: entriesError } = await supabase
      .from('overtime_entries')
      .select('*')
      .eq('report_id', reportId)

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 500 })
    }

    // Fetch stations
    const { data: stations } = await supabase
      .from('stations')
      .select('id, name')

    // Anonymize data
    const anonymized = anonymizeOvertimeData(
      report,
      entries ?? [],
      stations ?? []
    )

    // Build employee names for sanitization check
    const employeeNames = (entries ?? []).map((e) => {
      const parts = e.raw_name.split(',')
      return {
        rawName: e.raw_name,
        lastName: (parts[0] ?? '').trim(),
        firstName: (parts[1] ?? '').trim(),
      }
    })

    // Generate HTML
    const html = generatePdfHtml(anonymized)

    // Sanitization check — search HTML for any leaked personal data
    const sanitization = sanitizePdfContent(html, employeeNames)
    if (!sanitization.passed) {
      console.error('Anonymiseringskontroll misslyckades:', sanitization.violations)

      // Log incident
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'ANONYMIZATION_FAILURE',
          resource_id: reportId,
          resource_type: 'overtime_report',
          details: { violations: sanitization.violations },
        })
      } catch (e) {
        console.warn('Audit log failed:', e)
      }

      return NextResponse.json(
        { error: 'Anonymiseringskontroll misslyckades. Exporten avbröts.' },
        { status: 500 }
      )
    }

    // Generate PDF via Puppeteer
    const isDev = process.env.NODE_ENV === 'development'
    if (!isDev) {
      chromium.setGraphicsMode = false
    }

    const browser = await puppeteer.launch({
      args: isDev
        ? ['--no-sandbox', '--disable-setuid-sandbox']
        : [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      executablePath: isDev ? undefined : await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      printBackground: true,
      displayHeaderFooter: false,
    })

    await browser.close()

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'EXPORT_OVERTIME_PDF',
        resource_id: reportId,
        resource_type: 'overtime_report',
        details: {
          period: `${report.period_start} – ${report.period_end}`,
          entryCount: anonymized.entries.length,
        },
      })
    } catch (e) {
      console.warn('Audit log failed:', e)
    }

    // Update report status
    await supabase
      .from('overtime_reports')
      .update({ status: 'exported' })
      .eq('id', reportId)

    const filename = `Overtidsrapport_anonymiserad_${report.period_start}_${report.period_end}.pdf`

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating overtime PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

// =============================================
// HTML Template
// =============================================

function generatePdfHtml(data: AnonymizedReport): string {
  const formatDate = (d: string) => new Date(d).toLocaleDateString('sv-SE')
  const generatedDate = new Date().toLocaleDateString('sv-SE')

  const alertLabel = (monthly: string, yearly: string): string => {
    if (yearly === 'breach') return 'Årsgräns överskriden'
    if (monthly === 'breach') return 'Månadsgräns överskriden'
    if (yearly === 'warning') return 'Närmar sig årsgräns'
    if (monthly === 'warning') return 'Närmar sig månadsgräns'
    return 'OK'
  }

  const alertColor = (monthly: string, yearly: string): string => {
    if (yearly === 'breach' || monthly === 'breach') return '#dc2626'
    if (yearly === 'warning' || monthly === 'warning') return '#d97706'
    return '#16a34a'
  }

  // Station summary rows
  const stationRows = data.stationSummaries
    .map(
      (s) => `
      <tr>
        <td>${s.stationLabel}</td>
        <td style="text-align:center">${s.employeeCount}</td>
        <td style="text-align:right">${formatHours(s.totalOvertime)}</td>
        <td style="text-align:center">${s.warningCount}</td>
        <td style="text-align:center">${s.breachCount}</td>
      </tr>`
    )
    .join('')

  // Individual entry rows
  const entryRows = data.entries
    .map(
      (e) => `
      <tr>
        <td><strong>${e.pseudoId}</strong></td>
        <td>${e.stationLabel}</td>
        <td>${e.category ?? '—'}</td>
        <td style="text-align:right">${formatHours(e.overtimeMonthly)}</td>
        <td style="text-align:right">${formatHours(e.overtimeTotal)}</td>
        <td style="text-align:right">${Math.round(e.yearlyPercentage)}%</td>
        <td style="color:${alertColor(e.monthlyAlert, e.yearlyAlert)}">${alertLabel(e.monthlyAlert, e.yearlyAlert)}</td>
      </tr>`
    )
    .join('')

  // Warning entries
  const warningEntries = data.entries.filter(
    (e) => e.monthlyAlert !== 'none' || e.yearlyAlert !== 'none'
  )
  const warningRows = warningEntries
    .map(
      (e) => `
      <tr>
        <td><strong>${e.pseudoId}</strong></td>
        <td style="color:${alertColor(e.monthlyAlert, e.yearlyAlert)}">${alertLabel(e.monthlyAlert, e.yearlyAlert)}</td>
        <td style="text-align:right">${formatHours(e.hoursToYearlyLimit)}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <title>Övertidsrapport</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1f2937; line-height: 1.5; }
    .page { page-break-after: always; padding: 20px; }
    .page:last-child { page-break-after: auto; }
    h1 { font-size: 22px; color: #111827; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #374151; margin: 20px 0 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
    h3 { font-size: 13px; color: #4b5563; margin: 15px 0 8px; }
    .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 8px; }
    .disclaimer { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px; font-size: 9px; color: #6b7280; margin: 12px 0; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }
    .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; text-align: center; }
    .kpi-value { font-size: 20px; font-weight: 700; }
    .kpi-label { font-size: 9px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 10px 0; }
    th { background: #f3f4f6; padding: 6px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .method-note { font-size: 9px; color: #9ca3af; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <!-- Sida 1: Försättssida -->
  <div class="page">
    <div style="text-align:center; padding-top:80px;">
      <h1 style="font-size:28px;">Övertidsrapport</h1>
      <p style="font-size:16px; color:#6b7280; margin-top:8px;">Ambulanssjukvården Norrtälje</p>
      <p style="font-size:14px; color:#9ca3af; margin-top:20px;">
        Rapportperiod: ${formatDate(data.periodStart)} – ${formatDate(data.periodEnd)}
      </p>
      <p style="font-size:12px; color:#9ca3af; margin-top:8px;">
        Genererad: ${generatedDate}
      </p>
    </div>
    <div class="disclaimer" style="margin-top:60px;">
      Rapporten är pseudonymiserad enligt GDPR art. 4(5). Inga personuppgifter förekommer.
      ID:n är ej beständiga mellan rapporter. Stationer med färre än 5 medarbetare
      har slagits samman till "Övriga stationer" för att förhindra återidentifiering.
    </div>
  </div>

  <!-- Sida 2: Sammanfattning -->
  <div class="page">
    <h2>Sammanfattning</h2>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-value">${data.kpis.totalEmployees}</div>
        <div class="kpi-label">Medarbetare med övertid</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${formatHours(data.kpis.totalOvertimePeriod)}</div>
        <div class="kpi-label">Total övertid perioden</div>
      </div>
      <div class="kpi">
        <div class="kpi-value" style="color:#dc2626">${data.kpis.breachMonthCount}</div>
        <div class="kpi-label">Månadsgräns överskriden</div>
      </div>
      <div class="kpi">
        <div class="kpi-value" style="color:#dc2626">${data.kpis.breachYearCount}</div>
        <div class="kpi-label">Årsgräns överskriden</div>
      </div>
      <div class="kpi">
        <div class="kpi-value" style="color:#d97706">${data.kpis.warnYearCount}</div>
        <div class="kpi-label">Närmar sig årsgräns</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${formatHours(data.kpis.avgOvertimeYtd)}</div>
        <div class="kpi-label">Snitt övertid YTD</div>
      </div>
    </div>

    <h3>Per station</h3>
    <table>
      <thead>
        <tr>
          <th>Station</th>
          <th style="text-align:center">Medarbetare</th>
          <th style="text-align:right">Övertid period</th>
          <th style="text-align:center">Varningar</th>
          <th style="text-align:center">Överskridanden</th>
        </tr>
      </thead>
      <tbody>${stationRows}</tbody>
    </table>
  </div>

  <!-- Sida 3: Individtabell -->
  <div class="page">
    <h2>Individöversikt (anonymiserad)</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Station</th>
          <th>Kategori</th>
          <th style="text-align:right">ÖT Mån (h)</th>
          <th style="text-align:right">ÖT År (h)</th>
          <th style="text-align:right">% av årsgräns</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${entryRows}</tbody>
    </table>
  </div>

  <!-- Sida 4: Varningar -->
  ${warningEntries.length > 0 ? `
  <div class="page">
    <h2>Varningar och överskridanden</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
          <th style="text-align:right">Timmar kvar till årsgräns</th>
        </tr>
      </thead>
      <tbody>${warningRows}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- Sista sida: Metodnot -->
  <div class="page">
    <h2>Metodnot</h2>
    <h3>Gränsvärden</h3>
    <p>Månadsgräns: ${OVERTIME_LIMITS.MONTHLY_LIMIT} timmar övertid per medarbetare och månad. Varning vid ≥ ${OVERTIME_LIMITS.MONTHLY_WARNING} timmar.</p>
    <p>Årsgräns: ${OVERTIME_LIMITS.YEARLY_LIMIT} timmar övertid per medarbetare och år. Varning vid ≥ ${OVERTIME_LIMITS.YEARLY_WARNING} timmar.</p>
    <p>Mertid spåras separat och räknas inte in i övertidsgränserna.</p>

    <h3>Pseudonymisering</h3>
    <p>Varje medarbetare har tilldelats ett anonymt ID enligt mönstret STATION-LÖPNR (t.ex. HAL-01).
    Löpnumret baseras på sortering efter total övertid. ID:n är inte beständiga mellan rapporter
    och återgenereras vid varje export.</p>

    <h3>K-anonymitet</h3>
    <p>Stationer med färre än ${MIN_K_ANONYMITY} medarbetare med registrerad övertid har slagits
    samman till "Övriga stationer". Yrkeskategori visas enbart om det finns minst
    ${MIN_K_ANONYMITY} individer i kategorin per station.</p>

    <div class="method-note">
      Denna rapport är genererad av Ambulansledning – Övertidsuppföljning.
      Ingen uppgift om vem som genererat rapporten lagras i dokumentet.
    </div>
  </div>
</body>
</html>`
}

const MIN_K_ANONYMITY = 5
