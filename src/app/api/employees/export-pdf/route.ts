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
import { generatePdfHtml, type ExportEmployee } from '@/lib/employees/pdf-template'

/** Tak för hur många rader en export får innehålla. */
const MAX_ROWS = 2000

// Chromium behöver startas upp per anrop; standardtaket på 10 s räcker inte
export const maxDuration = 60
export const runtime = 'nodejs'

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
            maxRows: MAX_ROWS,
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

        // Ta med det underliggande felet - annars går det inte att se skillnad på
        // ett fel i mallen och att Chromium inte kan startas i miljön.
        const detail = error instanceof Error ? error.message : String(error)
        return NextResponse.json(
            { error: `Kunde inte skapa PDF: ${detail}` },
            { status: 500 }
        )
    }
}
