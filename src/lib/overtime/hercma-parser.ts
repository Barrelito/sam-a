import * as XLSX from 'xlsx'
import { HERCMA_CATEGORY_MAP } from './config'
import type { EmployeeCategory } from '@/lib/salary-review/types'
import type {
  HercmaParsedEmployee,
  HercmaParsedSheet,
  HercmaParseResult,
} from './types'

// =============================================
// Public API
// =============================================

/**
 * Parse a HERCMA Övertidsjournal Excel file.
 * Pure function — no side effects, no DB calls.
 */
export function parseHercmaExcel(
  buffer: ArrayBuffer,
  filename: string
): HercmaParseResult {
  const warnings: string[] = []
  const errors: string[] = []

  // 1. Parse period from filename
  const filenamePeriod = parsePeriodFromFilename(filename)
  if (!filenamePeriod) {
    errors.push(
      `Kunde inte tolka rapportperiod från filnamn: "${filename}". Förväntat format: Overtidsjournal_YY-MM-DD_YY-MM-DD.xlsx`
    )
    return { sheets: [], periodStart: '', periodEnd: '', filename, warnings, errors }
  }

  // 2. Read workbook
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'array' })
  } catch (e) {
    errors.push(`Kunde inte läsa Excel-filen: ${e instanceof Error ? e.message : String(e)}`)
    return { sheets: [], periodStart: filenamePeriod.start, periodEnd: filenamePeriod.end, filename, warnings, errors }
  }

  // 3. Parse each sheet
  const sheets: HercmaParsedSheet[] = []

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName]
    if (!ws) {
      warnings.push(`Flik "${sheetName}" kunde inte läsas.`)
      continue
    }

    const result = parseSheet(ws, sheetName, filenamePeriod, warnings)
    if (result) {
      sheets.push(result)
    }
  }

  if (sheets.length === 0) {
    errors.push('Inga giltiga stationsflikar hittades i filen.')
  }

  return {
    sheets,
    periodStart: filenamePeriod.start,
    periodEnd: filenamePeriod.end,
    filename,
    warnings,
    errors,
  }
}

// =============================================
// Sheet Parsing
// =============================================

function parseSheet(
  ws: XLSX.WorkSheet,
  sheetName: string,
  filenamePeriod: { start: string; end: string },
  warnings: string[]
): HercmaParsedSheet | null {
  const stationName = parseStationFromTab(sheetName)
  if (!stationName) {
    warnings.push(`Kunde inte extrahera stationsnamn från flik "${sheetName}".`)
    return null
  }

  // Read all data as array of arrays
  const data: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true,
  })

  if (data.length < 5) {
    warnings.push(`Flik "${sheetName}": För få rader (${data.length}), hoppar över.`)
    return null
  }

  // Row 1 (index 0): Verify period from title
  const titleRow = String(data[0]?.[0] ?? '')
  const sheetPeriod = parsePeriodFromTitle(titleRow)
  if (sheetPeriod) {
    if (sheetPeriod.start !== filenamePeriod.start || sheetPeriod.end !== filenamePeriod.end) {
      warnings.push(
        `Flik "${sheetName}": Period i cell A1 (${sheetPeriod.start} – ${sheetPeriod.end}) matchar inte filnamnet (${filenamePeriod.start} – ${filenamePeriod.end}).`
      )
    }
  }

  // Row 4 (index 3): Validate headers
  const headerRow = data[3]
  if (headerRow) {
    const firstHeader = String(headerRow[0] ?? '').trim().toLowerCase()
    if (!firstHeader.includes('namn')) {
      warnings.push(
        `Flik "${sheetName}": Förväntade kolumnrubriker på rad 4, hittade "${headerRow[0]}".`
      )
    }
  }

  // Rows 5+ (index 4+): Employee data
  const employees: HercmaParsedEmployee[] = []
  let consecutiveEmpty = 0
  let totalsRow: (string | number | null | undefined)[] | null = null

  for (let i = 4; i < data.length; i++) {
    const row = data[i]
    if (!row) {
      consecutiveEmpty++
      if (consecutiveEmpty >= 2) break
      continue
    }

    const cellA = String(row[0] ?? '').trim()

    // Check for Totalsumma row
    if (cellA.toLowerCase().startsWith('totalsumma')) {
      totalsRow = row
      break
    }

    // Skip empty rows
    if (!cellA) {
      consecutiveEmpty++
      if (consecutiveEmpty >= 2) break
      continue
    }
    consecutiveEmpty = 0

    // Parse employee row
    const employee = parseEmployeeRow(row, stationName, sheetName, warnings)
    if (employee) {
      employees.push(employee)
    }
  }

  // Parse totals for validation
  let totals: HercmaParsedSheet['totals'] = null
  if (totalsRow) {
    totals = {
      overtimeMonthly: parseHercmaTime(totalsRow[3]),
      overtimeTotal: parseHercmaTime(totalsRow[4]),
      extraTimeMonthly: parseHercmaTime(totalsRow[5]),
      extraTimeTotal: parseHercmaTime(totalsRow[6]),
      workedTimeMonthly: parseHercmaTime(totalsRow[7]),
      workedTimeTotal: parseHercmaTime(totalsRow[8]),
    }

    // Validate sums
    validateSums(employees, totals, stationName, warnings)
  }

  return {
    sheetName,
    stationName,
    employees,
    totals,
  }
}

function parseEmployeeRow(
  row: (string | number | null | undefined)[],
  stationName: string,
  sheetName: string,
  warnings: string[]
): HercmaParsedEmployee | null {
  const rawName = String(row[0] ?? '').trim()
  if (!rawName) return null

  // Parse name: "Efternamn, Förnamn"
  const { lastName, firstName } = parseName(rawName)
  if (!lastName) {
    warnings.push(`Flik "${sheetName}": Kunde inte tolka namn "${rawName}".`)
    return null
  }

  // Category
  const rawCategory = String(row[1] ?? '').trim()
  const category = mapCategory(rawCategory)
  if (!category) {
    warnings.push(
      `Flik "${sheetName}": Okänd kategori "${rawCategory}" för ${rawName}. Använder SSK som default.`
    )
  }

  // Fmgrp
  const fmgrpRaw = row[2]
  const fmgrp = fmgrpRaw != null ? Number(fmgrpRaw) : null

  return {
    rawName,
    lastName,
    firstName,
    rawCategory,
    category: category || 'SSK',
    fmgrp: fmgrp && !isNaN(fmgrp) ? fmgrp : null,
    stationName,
    overtimeMonthly: parseHercmaTime(row[3]),
    overtimeTotal: parseHercmaTime(row[4]),
    extraTimeMonthly: parseHercmaTime(row[5]),
    extraTimeTotal: parseHercmaTime(row[6]),
    workedTimeMonthly: parseHercmaTime(row[7]),
    workedTimeTotal: parseHercmaTime(row[8]),
  }
}

// =============================================
// Validation
// =============================================

function validateSums(
  employees: HercmaParsedEmployee[],
  totals: NonNullable<HercmaParsedSheet['totals']>,
  stationName: string,
  warnings: string[]
) {
  const fields: { key: keyof typeof totals; label: string }[] = [
    { key: 'overtimeMonthly', label: 'Övertid Mån' },
    { key: 'overtimeTotal', label: 'Övertid Total' },
    { key: 'extraTimeMonthly', label: 'Mertid Mån' },
    { key: 'extraTimeTotal', label: 'Mertid Total' },
    { key: 'workedTimeMonthly', label: 'Arbetad tid Mån' },
    { key: 'workedTimeTotal', label: 'Arbetad tid Total' },
  ]

  for (const { key, label } of fields) {
    const sum = employees.reduce((acc, e) => acc + e[key], 0)
    const expected = totals[key]
    const diff = Math.abs(sum - expected)
    // Avvikelse > 1 minut (1/60 timme ≈ 0.0167)
    if (diff > 1 / 60) {
      warnings.push(
        `${stationName}: Summan för ${label} avviker. Beräknad: ${sum.toFixed(2)}h, Totalsumma: ${expected.toFixed(2)}h (diff: ${diff.toFixed(2)}h).`
      )
    }
  }
}

// =============================================
// Helper Functions
// =============================================

/**
 * Parse time string "H:MM" or "HH:MM" to decimal hours.
 * Examples: "95:10" → 95.1667, "1:30" → 1.5, "" → 0
 */
export function parseHercmaTime(value: string | number | null | undefined): number {
  if (value == null) return 0

  // If it's already a number (Excel might do this), return it
  if (typeof value === 'number') return value

  const str = String(value).trim()
  if (!str || str === '0' || str === '0:00') return 0

  // Handle negative values
  const negative = str.startsWith('-')
  const clean = negative ? str.slice(1) : str

  const match = clean.match(/^(\d+):(\d{1,2})$/)
  if (!match) {
    // Try as plain number
    const num = parseFloat(str)
    return isNaN(num) ? 0 : num
  }

  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const decimal = hours + minutes / 60

  return negative ? -decimal : decimal
}

/**
 * Parse period from filename.
 * Pattern: Overtidsjournal_YY-MM-DD_YY-MM-DD.xlsx
 */
export function parsePeriodFromFilename(filename: string): { start: string; end: string } | null {
  const match = filename.match(/(\d{2}-\d{2}-\d{2})[_\s](\d{2}-\d{2}-\d{2})/)
  if (!match) return null

  return {
    start: parseYYMMDD(match[1]),
    end: parseYYMMDD(match[2]),
  }
}

/**
 * Parse period from cell A1 title.
 * Pattern: "HERCMA ÖVERTIDSJOURNAL: 26-01-01 – 26-04-10"
 */
export function parsePeriodFromTitle(title: string): { start: string; end: string } | null {
  const match = title.match(/(\d{2}-\d{2}-\d{2})\s*[–\-]\s*(\d{2}-\d{2}-\d{2})/)
  if (!match) return null

  return {
    start: parseYYMMDD(match[1]),
    end: parseYYMMDD(match[2]),
  }
}

/**
 * Convert "YY-MM-DD" to ISO date string "20YY-MM-DD"
 */
function parseYYMMDD(str: string): string {
  const parts = str.split('-')
  if (parts.length !== 3) return ''
  return `20${parts[0]}-${parts[1]}-${parts[2]}`
}

/**
 * Extract station name from sheet tab.
 * "Hallstavik 23 9" → "Hallstavik"
 */
export function parseStationFromTab(tabName: string): string {
  const trimmed = tabName.trim()
  const firstWord = trimmed.split(/\s+/)[0]
  return firstWord || ''
}

/**
 * Parse "Efternamn, Förnamn" into parts.
 */
function parseName(raw: string): { lastName: string; firstName: string } {
  const commaIdx = raw.indexOf(',')
  if (commaIdx === -1) {
    // No comma — try space separation as fallback
    const parts = raw.split(/\s+/)
    if (parts.length >= 2) {
      return { lastName: parts[0], firstName: parts.slice(1).join(' ') }
    }
    return { lastName: raw, firstName: '' }
  }

  return {
    lastName: raw.slice(0, commaIdx).trim(),
    firstName: raw.slice(commaIdx + 1).trim(),
  }
}

/**
 * Map HERCMA category string to system EmployeeCategory.
 */
function mapCategory(raw: string): EmployeeCategory | null {
  // Try exact match first
  if (raw in HERCMA_CATEGORY_MAP) {
    return HERCMA_CATEGORY_MAP[raw]
  }

  // Try case-insensitive match
  const lower = raw.toLowerCase()
  for (const [key, value] of Object.entries(HERCMA_CATEGORY_MAP)) {
    if (key.toLowerCase() === lower) return value
  }

  return null
}
