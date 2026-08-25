// HTML-mall för PDF-export av personallistan.
// Utbruten ur API-rutten så att den går att rendera och granska fristående.

import { formatExperience, resolveExperience } from './experience'
import type { ExportColumn } from './export-columns'

export interface ExportEmployee {
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

// =============================================
// HTML-mall
// =============================================

export function escapeHtml(value: unknown): string {
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

export interface PdfData {
    employees: ExportEmployee[]
    columns: ExportColumn[]
    filterDescription: string | null
    truncated: boolean
    /** Radtaket, används i texten om listan är avkortad. */
    maxRows: number
}

export function generatePdfHtml({
    employees,
    columns,
    filterDescription,
    truncated,
    maxRows,
}: PdfData): string {
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
            ? `<div class="notice">Listan är avkortad till de första ${maxRows} medarbetarna. Filtrera på station eller kategori för att få med alla.</div>`
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
