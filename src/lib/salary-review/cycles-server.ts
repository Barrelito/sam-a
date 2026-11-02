// Hämtar löneöversyner och väljer den en vy ska visa.
// Allt som behöver "vald löneöversyn" ska gå hit, inte göra egna uppslag:
// flera år kan vara öppna samtidigt (ADR 0004).

import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { parseYear, pickCycle } from './lonesattning'
import type { SalaryReviewCycle } from './types'

type Client = SupabaseClient<any, 'public', any>

/** Cookien som håller chefens valda år mellan sidorna i löneöversynen. */
export const SELECTED_YEAR_COOKIE = 'loneoversyn_ar'

/** Alla löneöversyner, nyaste först. */
export async function loadCycles(supabase: Client): Promise<SalaryReviewCycle[]> {
    const { data, error } = await supabase
        .from('salary_review_cycles')
        .select('*')
        .order('year', { ascending: false })

    if (error) {
        console.error('Error fetching salary review cycles:', error)
        return []
    }
    return (data ?? []) as SalaryReviewCycle[]
}

/** Året chefen valt i årsvalet, om något. */
export async function selectedYearFromCookie(): Promise<number | null> {
    try {
        const store = await cookies()
        return parseYear(store.get(SELECTED_YEAR_COOKIE)?.value)
    } catch {
        // Utanför en request (t.ex. i tester) finns ingen cookie att läsa.
        return null
    }
}

/**
 * Vald löneöversyn, plus alla år. Ett uttryckligt år vinner; annars gäller
 * årsvalet, annars nyaste öppna.
 */
export async function getSelectedCycle(
    supabase: Client,
    requestedYear?: number | null
): Promise<{ cycle: SalaryReviewCycle | null; cycles: SalaryReviewCycle[] }> {
    const cycles = await loadCycles(supabase)
    const year = requestedYear ?? (await selectedYearFromCookie())
    return { cycle: pickCycle(cycles, year), cycles }
}
