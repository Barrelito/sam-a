import type { EmployeeCategory } from '@/lib/salary-review/types'
import type { HercmaParsedEmployee, EmployeeMatchResult } from './types'

// =============================================
// Types for DB employees passed in
// =============================================

export interface DbEmployee {
  id: string
  first_name: string
  last_name: string
  category: EmployeeCategory
  station_id: string
}

// =============================================
// Public API
// =============================================

/**
 * Match parsed HERCMA employees against existing DB employees.
 * Returns a Map keyed by "rawName|rawCategory" with match results.
 *
 * Pure function — no DB calls, receives pre-fetched employee list.
 */
export function matchEmployees(
  parsedEmployees: HercmaParsedEmployee[],
  dbEmployees: DbEmployee[]
): Map<string, EmployeeMatchResult> {
  const results = new Map<string, EmployeeMatchResult>()

  // Build a normalized lookup index from DB employees
  const dbIndex = buildDbIndex(dbEmployees)

  // Deduplicate parsed employees by rawName|rawCategory
  const seen = new Set<string>()

  for (const parsed of parsedEmployees) {
    const key = `${parsed.rawName}|${parsed.rawCategory}`
    if (seen.has(key)) continue
    seen.add(key)

    const match = findBestMatch(parsed, dbEmployees, dbIndex)
    results.set(key, match)
  }

  return results
}

// =============================================
// Matching Logic
// =============================================

interface DbIndexEntry {
  employee: DbEmployee
  normalizedLast: string
  normalizedFirst: string
}

function buildDbIndex(dbEmployees: DbEmployee[]): DbIndexEntry[] {
  return dbEmployees.map((emp) => ({
    employee: emp,
    normalizedLast: normalize(emp.last_name),
    normalizedFirst: normalize(emp.first_name),
  }))
}

function findBestMatch(
  parsed: HercmaParsedEmployee,
  _dbEmployees: DbEmployee[],
  dbIndex: DbIndexEntry[]
): EmployeeMatchResult {
  const parsedLast = normalize(parsed.lastName)
  const parsedFirst = normalize(parsed.firstName)

  // Strategy 1: Exact match on both names
  const exactMatches = dbIndex.filter(
    (e) => e.normalizedLast === parsedLast && e.normalizedFirst === parsedFirst
  )

  if (exactMatches.length === 1) {
    return makeResult(exactMatches[0].employee, parsed, 'exact')
  }

  if (exactMatches.length > 1) {
    // Multiple exact name matches — prefer one with matching category
    const categoryMatch = exactMatches.find((e) =>
      isCategoryCompatible(parsed.rawCategory, e.employee.category)
    )
    if (categoryMatch) {
      return makeResult(categoryMatch.employee, parsed, 'exact')
    }
    // Fall back to first match
    return makeResult(exactMatches[0].employee, parsed, 'exact')
  }

  // Strategy 2: Partial first name match (handles abbreviations)
  const partialFirstMatches = dbIndex.filter(
    (e) =>
      e.normalizedLast === parsedLast &&
      (e.normalizedFirst.startsWith(parsedFirst) ||
        parsedFirst.startsWith(e.normalizedFirst)) &&
      parsedFirst.length >= 2 &&
      e.normalizedFirst.length >= 2
  )

  if (partialFirstMatches.length === 1) {
    return makeResult(partialFirstMatches[0].employee, parsed, 'fuzzy')
  }

  if (partialFirstMatches.length > 1) {
    const categoryMatch = partialFirstMatches.find((e) =>
      isCategoryCompatible(parsed.rawCategory, e.employee.category)
    )
    if (categoryMatch) {
      return makeResult(categoryMatch.employee, parsed, 'fuzzy')
    }
    return makeResult(partialFirstMatches[0].employee, parsed, 'fuzzy')
  }

  // Strategy 3: Fuzzy last name (Levenshtein ≤ 2) + exact first name
  const fuzzyMatches = dbIndex.filter(
    (e) =>
      levenshtein(e.normalizedLast, parsedLast) <= 2 &&
      e.normalizedFirst === parsedFirst
  )

  if (fuzzyMatches.length >= 1) {
    const best = fuzzyMatches.reduce((a, b) =>
      levenshtein(a.normalizedLast, parsedLast) <=
      levenshtein(b.normalizedLast, parsedLast)
        ? a
        : b
    )
    return makeResult(best.employee, parsed, 'fuzzy')
  }

  // No match
  return {
    employeeId: null,
    matchedName: null,
    resolvedCategory: resolveCategory(parsed.rawCategory, null),
    confidence: 'none',
  }
}

// =============================================
// Helpers
// =============================================

function makeResult(
  dbEmp: DbEmployee,
  parsed: HercmaParsedEmployee,
  confidence: 'exact' | 'fuzzy'
): EmployeeMatchResult {
  return {
    employeeId: dbEmp.id,
    matchedName: `${dbEmp.first_name} ${dbEmp.last_name}`,
    resolvedCategory: resolveCategory(parsed.rawCategory, dbEmp.category),
    confidence,
  }
}

/**
 * Resolve the final category:
 * - If DB employee is found, use their actual category (VUB or SSK)
 * - If "Ambulanssjukvårdare", always AMB
 * - If no match and "Ambulanssjuksköterska", default to SSK
 */
function resolveCategory(
  rawCategory: string,
  dbCategory: EmployeeCategory | null
): EmployeeCategory {
  const lower = rawCategory.toLowerCase()

  // Ambulanssjukvårdare is always AMB
  if (lower.includes('sjukvårdare') || lower.includes('sjukvardare')) {
    return 'AMB'
  }

  // If we have a DB match, trust the DB category
  if (dbCategory) {
    return dbCategory
  }

  // Default for sjuksköterska without DB match
  return 'SSK'
}

/**
 * Check if HERCMA category is compatible with DB category.
 * "Ambulanssjuksköterska" matches VUB or SSK.
 * "Ambulanssjukvårdare" matches AMB.
 */
function isCategoryCompatible(
  rawCategory: string,
  dbCategory: EmployeeCategory
): boolean {
  const lower = rawCategory.toLowerCase()

  if (lower.includes('sjukvårdare') || lower.includes('sjukvardare')) {
    return dbCategory === 'AMB'
  }

  // Ambulanssjuksköterska can be VUB or SSK
  return dbCategory === 'VUB' || dbCategory === 'SSK'
}

/**
 * Normalize a string for comparison:
 * lowercase, trim, collapse whitespace, NFC normalization
 */
function normalize(str: string): string {
  return str
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost  // substitution
      )
    }
  }

  return matrix[b.length][a.length]
}
