import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { applyEmployeeFilters, describeFilters, type EmployeeFilters } from '@/lib/employees/query'
import {
    DEFAULT_EXPORT_COLUMNS,
    getExportColumns,
    type ExportColumn,
} from '@/lib/employees/export-columns'
import { formatExperience, resolveExperience } from '@/lib/employees/experience'

/** Tak för hur många rader en export får innehålla. */
const MAX_ROWS = 2000

interface ExportEmployee {
    id: string
    first_name: string
    last_name: string
    employee_number?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    category: string
    birthdate?: string | null
    employment_date?: string | null
    experience_level?: string | null
    current_salary?: number | null
    employment_rate?: number | null
    night_share?: number | null
    station?: { id: string; name: string } | null
}

// POST /api/employees/export-pdf
// Body: { columns?: string[], search?, station_id?, category? }
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: Record<string, unknown>
        try {
            body = await request.json()
        } catch {
            body = {}
        }

        const requestedColumns = Array.isArray(body.columns)
            ? (body.columns as unknown[]).filter((c): c is string => typeof c === 'string')
            : DEFAULT_EXPORT_COLUMNS

        // Okända nycklar filtreras bort av getExportColumns
        const columns = getExportColumns(requestedColumns)

        const filters: EmployeeFilters = {
            search: typeof body.search === 'string' ? body.search.trim() || null : null,
            stationId: typeof body.station_id === 'string' ? body.station_id : null,
            category: typeof body.category === 'string' ? body.category : null,
        }

        // RLS avgör vilka medarbetare som kommer med
        const baseQuery = supabase
            .from('employees')
            .select(`
                *,
                station:stations (
                    id,
                    name
                )
            `)
            .order('last_name', { ascending: true })
            .order('first_name', { ascending: true })

        const { query } = await applyEmployeeFilters(supabase, baseQuery, filters)

        // PostgREST returnerar max 1000 rader utan explicit range
        const { data, error } = await query.range(0, MAX_ROWS - 1)

        if (error) {
            console.error('Error fetching employees for export:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const employees = (data || []) as unknown as ExportEmployee[]

        if (employees.length === 0) {
            return NextResponse.json(
                { error: 'Inga medarbetare matchar urvalet - det finns inget att exportera' },
                { status: 400 }
            )
        }

        let stationName: string | null = null
        if (filters.stationId) {
            stationName =
                employees.find((e) => e.station?.id === filters.stationId)?.station?.name ?? null
        }

        const html = generatePdfHtml({
            employees,
            columns,
            filterDescription: describeFilters(filters, stationName),
            truncated: employees.length >= MAX_ROWS,
        })

        // Samma uppsättning som övriga PDF-exporter i appen
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

        try {
            const page = await browser.newPage()
            await page.setContent(html, { waitUntil: 'networkidle0' })

            const pdf = await page.pdf({
                format: 'A4',
                // Fler kolumner behöver liggande format för att inte tryckas ihop
                landscape: columns.length > 4,
                margin: { top: '12mm', right: '10mm', bottom: '16mm', left: '10mm' },
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: '<div></div>',
                footerTemplate: `
                    <div style="width:100%;font-size:8px;color:#64748b;padding:0 10mm;display:flex;justify-content:space-between;">
                        <span>Personallista – Ambulansledning</span>
                        <span>Sida <span class="pageNumber"></span> av <span class="totalPages"></span></span>
                    </div>`,
            })

            // Audit log (bästa försök) - export av personuppgifter ska kunna spåras
            try {
                await supabase.from('audit_logs').insert({
                    user_id: user.id,
                    action: 'EXPORT_EMPLOYEE_LIST',
                    resource_type: 'employee',
                    details: {
                        columns: columns.map((c) => c.key),
                        employee_count: employees.length,
                        filters: {
                            station_id: filters.stationId,
                            category: filters.category,
                            search: filters.search,
                        },
                    },
                })
            } catch (e) {
                console.warn('Audit log failed', e)
            }

            const today = new Date().toISOString().split('T')[0]
            const filename = `Personallista_${today}.pdf`

            return new NextResponse(Buffer.from(pdf), {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            })
        } finally {
            await browser.close()
        }
    } catch (error) {
        console.error('Error generating employee list PDF:', error)
        return NextResponse.json({ error: 'Kunde inte skapa PDF' }, { status: 500 })
    }
}

// =============================================
// HTML-mall
// =============================================

function escapeHtml(value: unknown): string {
    if (value === null || value === undefined) return ''
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function formatDate(value?: string | null): string {
    if (!value) return '–'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? '–' : parsed.toLocaleDateString('sv-SE')
}

function formatNumber(value?: number | null, suffix = ''): string {
    if (value === null || value === undefined) return '–'
    return `${Number(value).toLocaleString('sv-SE')}${suffix}`
}

function cellValue(employee: ExportEmployee, column: ExportColumn): string {
    switch (column.key) {
        case 'employee_number':
            return employee.employee_number || '–'
        case 'category':
            return employee.category || '–'
        case 'email':
            return employee.email || '–'
        case 'phone':
            return employee.phone || '–'
        case 'address':
            return employee.address || '–'
        case 'birthdate':
            return formatDate(employee.birthdate)
        case 'employment_date':
            return formatDate(employee.employment_date)
        case 'experience':
            return formatExperience(resolveExperience(employee))
        case 'employment_rate':
            return formatNumber(employee.employment_rate, ' %')
        case 'night_share':
            return formatNumber(employee.night_share, ' %')
        case 'current_salary':
            return employee.current_salary != null
                ? `${formatNumber(employee.current_salary)} kr`
                : '–'
        default:
            return '–'
    }
}

interface PdfData {
    employees: ExportEmployee[]
    columns: ExportColumn[]
    filterDescription: string | null
    truncated: boolean
}

function generatePdfHtml({ employees, columns, filterDescription, truncated }: PdfData): string {
    // Gruppera på station, i bokstavsordning. Medarbetare utan station hamnar sist.
    const groups = new Map<string, ExportEmployee[]>()
    for (const employee of employees) {
        const key = employee.station?.name || 'Utan stationstillhörighet'
        const group = groups.get(key)
        if (group) group.push(employee)
        else groups.set(key, [employee])
    }

    const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
        if (a === 'Utan stationstillhörighet') return 1
        if (b === 'Utan stationstillhörighet') return -1
        return a.localeCompare(b, 'sv')
    })

    const hasSensitive = columns.some((c) => c.sensitive)
    const generatedAt = new Date().toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' })

    const sections = sortedGroups
        .map(([stationName, stationEmployees]) => {
            const rows = stationEmployees
                .map((employee) => {
                    const cells = columns
                        .map(
                            (column) =>
                                `<td${column.numeric ? ' class="num"' : ''}>${escapeHtml(cellValue(employee, column))}</td>`
                        )
                        .join('')

                    return `<tr><td class="name">${escapeHtml(`${employee.last_name}, ${employee.first_name}`)}</td>${cells}</tr>`
                })
                .join('')

            const headerCells = columns
                .map((column) => `<th${column.numeric ? ' class="num"' : ''}>${escapeHtml(column.label)}</th>`)
                .join('')

            return `
        <section class="station">
          <h2>${escapeHtml(stationName)} <span class="count">${stationEmployees.length} medarbetare</span></h2>
          <table>
            <thead><tr><th class="name">Namn</th>${headerCells}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`
        })
        .join('')

    return `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #0f172a;
    font-size: 9.5pt;
    margin: 0;
  }
  h1 { font-size: 16pt; margin: 0 0 2mm; }
  .meta { color: #475569; font-size: 8.5pt; line-height: 1.5; margin-bottom: 5mm; }
  .meta div { margin-bottom: 0.5mm; }
  .notice {
    border-left: 3px solid #b45309;
    background: #fffbeb;
    color: #78350f;
    padding: 2mm 3mm;
    font-size: 8.5pt;
    margin-bottom: 5mm;
  }
  .station { margin-bottom: 7mm; page-break-inside: auto; }
  .station h2 {
    font-size: 11pt;
    margin: 0 0 2mm;
    padding-bottom: 1mm;
    border-bottom: 1.5px solid #0f172a;
  }
  .station h2 .count { font-weight: normal; color: #64748b; font-size: 8.5pt; float: right; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th {
    text-align: left;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
    padding: 1.5mm 2mm;
    border-bottom: 1px solid #cbd5e1;
  }
  td { padding: 1.5mm 2mm; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  td.name, th.name { font-weight: 600; white-space: nowrap; }
  .num { text-align: right; white-space: nowrap; }
  tbody tr:nth-child(even) { background: #f8fafc; }
</style>
</head>
<body>
  <h1>Personallista</h1>
  <div class="meta">
    <div>Genererad ${escapeHtml(generatedAt)}</div>
    <div>${employees.length} medarbetare på ${sortedGroups.length} ${sortedGroups.length === 1 ? 'station' : 'stationer'}</div>
    ${filterDescription ? `<div>Urval – ${escapeHtml(filterDescription)}</div>` : ''}
  </div>

  ${truncated
            ? `<div class="notice">Listan är avkortad till de första ${MAX_ROWS} medarbetarna. Filtrera på station eller kategori för att få med alla.</div>`
            : ''}

  ${hasSensitive
            ? `<div class="notice">Dokumentet innehåller känsliga personuppgifter (${escapeHtml(
                columns.filter((c) => c.sensitive).map((c) => c.label.toLowerCase()).join(', ')
            )}). Hantera och förvara det enligt gällande rutin.</div>`
            : ''}

  ${sections}
</body>
</html>`
}
