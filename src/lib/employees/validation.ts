// Validering/normalisering av medarbetardata + robusta skrivningar mot Supabase.

import type { PostgrestError } from '@supabase/supabase-js'
import { EMPLOYEE_CATEGORIES, type EmployeeCategory } from './access'
import {
    EXPERIENCE_LEVELS,
    experienceLevelFromEmploymentDate,
    type ExperienceLevel,
} from './experience'

export interface EmployeeWritePayload {
    first_name?: string
    last_name?: string
    email?: string | null
    phone?: string | null
    employee_number?: string | null
    category?: EmployeeCategory
    station_id?: string
    employment_date?: string | null
    birthdate?: string | null
    experience_level?: ExperienceLevel | null
    current_salary?: number | null
    employment_rate?: number | null
    night_share?: number | null
}

/**
 * Kolumner som lagts till via senare migrationer. Om databasen inte kört dem
 * ännu strippas kolumnen bort istället för att hela sparningen misslyckas.
 */
const OPTIONAL_COLUMNS = [
    'phone',
    'birthdate',
    'experience_level',
    'employment_rate',
    'night_share',
    'employment_date',
] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function text(value: unknown): string | null {
    if (value === null || value === undefined) return null
    const trimmed = String(value).trim()
    return trimmed === '' ? null : trimmed
}

function numberOrNull(value: unknown): number | null | undefined {
    if (value === null || value === undefined || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : undefined
}

export interface NormalizeOptions {
    /** true för POST (alla obligatoriska fält måste finnas), false för PATCH. */
    requireAll: boolean
}

export interface NormalizeResult {
    payload: EmployeeWritePayload
    error?: string
}

/**
 * Plockar ut och validerar de fält som får skrivas. Endast fält som faktiskt
 * finns med i inkommande body tas med, så PATCH blir en äkta delvis uppdatering.
 */
export function normalizeEmployeeInput(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any,
    { requireAll }: NormalizeOptions
): NormalizeResult {
    if (!body || typeof body !== 'object') {
        return { payload: {}, error: 'Ogiltig data' }
    }

    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key)
    const payload: EmployeeWritePayload = {}

    // --- Namn (obligatoriskt) ---
    for (const key of ['first_name', 'last_name'] as const) {
        if (requireAll || has(key)) {
            const value = text(body[key])
            if (!value) {
                return {
                    payload: {},
                    error: key === 'first_name' ? 'Förnamn måste anges' : 'Efternamn måste anges',
                }
            }
            if (value.length > 100) {
                return { payload: {}, error: 'Namnet får vara högst 100 tecken' }
            }
            payload[key] = value
        }
    }

    // --- Kategori (obligatoriskt) ---
    if (requireAll || has('category')) {
        const category = text(body.category)
        if (!category) {
            return { payload: {}, error: 'Kategori måste anges' }
        }
        if (!EMPLOYEE_CATEGORIES.includes(category as EmployeeCategory)) {
            return { payload: {}, error: 'Ogiltig kategori. Välj VUB, SSK eller AMB' }
        }
        payload.category = category as EmployeeCategory
    }

    // --- Station (obligatoriskt) ---
    if (requireAll || has('station_id')) {
        const stationId = text(body.station_id)
        if (!stationId) {
            return { payload: {}, error: 'Station måste anges' }
        }
        payload.station_id = stationId
    }

    // --- E-post ---
    if (has('email')) {
        const email = text(body.email)
        if (email && !EMAIL_RE.test(email)) {
            return { payload: {}, error: 'Ogiltig e-postadress' }
        }
        payload.email = email ? email.toLowerCase() : null
    }

    // --- Telefon ---
    if (has('phone')) {
        const phone = text(body.phone)
        if (phone && phone.length > 40) {
            return { payload: {}, error: 'Telefonnumret är för långt' }
        }
        payload.phone = phone
    }

    // --- Personalnummer ---
    if (has('employee_number')) {
        payload.employee_number = text(body.employee_number)
    }

    // --- Datum ---
    for (const key of ['employment_date', 'birthdate'] as const) {
        if (has(key)) {
            const value = text(body[key])
            if (value && (!DATE_RE.test(value) || Number.isNaN(Date.parse(value)))) {
                return {
                    payload: {},
                    error:
                        key === 'employment_date'
                            ? 'Ogiltigt anställningsdatum (ÅÅÅÅ-MM-DD)'
                            : 'Ogiltigt födelsedatum (ÅÅÅÅ-MM-DD)',
                }
            }
            payload[key] = value
        }
    }

    // --- Erfarenhetsnivå ---
    // Anställningsdatum är källan när det finns: då härleds nivån automatiskt och
    // ett manuellt värde ignoreras. Utan anställningsdatum sparas det manuella
    // värdet som fallback. Se src/lib/employees/experience.ts.
    if (has('experience_level')) {
        const level = text(body.experience_level)
        if (level && !EXPERIENCE_LEVELS.includes(level as ExperienceLevel)) {
            return { payload: {}, error: 'Ogiltig erfarenhetsnivå' }
        }
        payload.experience_level = (level as ExperienceLevel) ?? null
    }

    if (has('employment_date')) {
        const derived = experienceLevelFromEmploymentDate(payload.employment_date)
        if (derived) {
            payload.experience_level = derived
        }
    }

    // --- Lön ---
    if (has('current_salary')) {
        const salary = numberOrNull(body.current_salary)
        if (salary === undefined) {
            return { payload: {}, error: 'Lön måste vara ett tal' }
        }
        if (salary !== null && (salary < 0 || salary > 1_000_000)) {
            return { payload: {}, error: 'Lön måste vara mellan 0 och 1 000 000 kr' }
        }
        payload.current_salary = salary
    }

    // --- Sysselsättningsgrad / nattandel (procent) ---
    for (const key of ['employment_rate', 'night_share'] as const) {
        if (has(key)) {
            const value = numberOrNull(body[key])
            if (value === undefined) {
                return { payload: {}, error: 'Sysselsättningsgrad och nattandel måste vara tal' }
            }
            if (value !== null && (value < 0 || value > 100)) {
                return {
                    payload: {},
                    error: 'Sysselsättningsgrad och nattandel anges i procent (0-100)',
                }
            }
            payload[key] = value
        }
    }

    return { payload }
}

/** Plockar ut kolumnnamnet ur ett Postgrest-fel om kolumnen saknas i schemat. */
function missingColumn(error: PostgrestError | null): string | null {
    if (!error) return null
    const isMissingColumn =
        error.code === 'PGRST204' ||
        error.code === '42703' ||
        /column .* does not exist/i.test(error.message || '')
    if (!isMissingColumn) return null

    const match = /'([a-z_]+)'/i.exec(error.message || '') || /"([a-z_]+)"/i.exec(error.message || '')
    const column = match?.[1]
    return column && (OPTIONAL_COLUMNS as readonly string[]).includes(column) ? column : null
}

/**
 * Kör en skrivning och tar bort valfria kolumner som databasen inte känner till,
 * så att en icke-körd migration inte blockerar hela sparningen.
 */
export async function writeWithOptionalColumns<T>(
    payload: EmployeeWritePayload,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run: (payload: Record<string, any>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>
): Promise<{ data: T | null; error: PostgrestError | null; skippedColumns: string[] }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: Record<string, any> = { ...payload }
    const skippedColumns: string[] = []
    let lastError: PostgrestError | null = null

    for (let attempt = 0; attempt <= OPTIONAL_COLUMNS.length; attempt++) {
        const { data, error } = await run(current)
        if (!error) return { data, error: null, skippedColumns }

        lastError = error
        const column = missingColumn(error)
        if (!column || !(column in current)) {
            return { data, error, skippedColumns }
        }

        console.warn(
            `[employees] Kolumnen "${column}" saknas i databasen - hoppar över den. Kör migrationerna i supabase/migrations.`
        )
        delete current[column]
        skippedColumns.push(column)
    }

    return { data: null, error: lastError, skippedColumns }
}

/** Översätter vanliga databasfel till begripliga svenska meddelanden. */
export function describeEmployeeError(error: PostgrestError): { message: string; status: number } {
    if (error.code === '23505') {
        if ((error.message || '').includes('employee_number')) {
            return { message: 'Personalnumret används redan av en annan medarbetare', status: 409 }
        }
        return { message: 'Uppgifterna krockar med en befintlig medarbetare', status: 409 }
    }
    if (error.code === '23503') {
        return { message: 'Vald station finns inte längre', status: 400 }
    }
    if (error.code === '23514') {
        return { message: 'Ett av fälten har ett otillåtet värde', status: 400 }
    }
    if (error.code === '42501' || error.code === 'PGRST301') {
        return { message: 'Du saknar behörighet för den här medarbetaren', status: 403 }
    }
    return { message: error.message || 'Okänt databasfel', status: 500 }
}
