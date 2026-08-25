// Delad filtrering för medarbetarlistan.
//
// Listvyn och PDF-exporten måste tolka samma filter likadant - annars exporterar
// man något annat än det man ser på skärmen. Därför bor filtreringen här.

import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, 'public', any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Query = PostgrestFilterBuilder<any, any, any, any, any>

export interface EmployeeFilters {
    search?: string | null
    stationId?: string | null
    category?: string | null
}

/** Max antal sökord som vägs in - skyddar mot orimligt långa frågor. */
const MAX_SEARCH_TOKENS = 5

/**
 * Tar bort tecken som har egen betydelse i PostgRESTs or()-syntax, så att en
 * söksträng aldrig kan bryta sig ur sitt filter.
 */
function sanitizeSearchToken(token: string): string {
    return token.replace(/[,()"\\*]/g, '').trim()
}

export function parseEmployeeFilters(searchParams: URLSearchParams): EmployeeFilters {
    return {
        search: (searchParams.get('search') || '').trim() || null,
        stationId: searchParams.get('station_id'),
        category: searchParams.get('category'),
    }
}

/**
 * Lägger på sök- och urvalsfilter. Varje sökord måste matcha något fält
 * (kedjade or() blir AND mellan orden), så "anna norrtälje" hittar Anna på
 * Norrtälje. Stationsnamn ligger i en annan tabell och slås därför upp till id:n.
 *
 * Frågan returneras inslagen i ett objekt: en PostgrestFilterBuilder är själv
 * en thenable, så ett direkt `return query` från en async-funktion skulle köra
 * frågan i stället för att lämna tillbaka byggaren.
 */
export async function applyEmployeeFilters<T extends Query>(
    supabase: Client,
    query: T,
    filters: EmployeeFilters
): Promise<{ query: T }> {
    let result = query

    if (filters.stationId) result = result.eq('station_id', filters.stationId) as T
    if (filters.category) result = result.eq('category', filters.category) as T

    if (!filters.search) return { query: result }

    const tokens = filters.search
        .split(/\s+/)
        .map(sanitizeSearchToken)
        .filter(Boolean)
        .slice(0, MAX_SEARCH_TOKENS)

    for (const token of tokens) {
        const conditions = [
            `first_name.ilike.%${token}%`,
            `last_name.ilike.%${token}%`,
            `employee_number.ilike.%${token}%`,
            `email.ilike.%${token}%`,
        ]

        const { data: matchingStations } = await supabase
            .from('stations')
            .select('id')
            .ilike('name', `%${token}%`)
            .limit(50)

        if (matchingStations && matchingStations.length > 0) {
            conditions.push(`station_id.in.(${matchingStations.map((s) => s.id).join(',')})`)
        }

        result = result.or(conditions.join(',')) as T
    }

    return { query: result }
}

/** Beskriver aktiva filter i klartext - används i PDF-huvudet. */
export function describeFilters(
    filters: EmployeeFilters,
    stationName?: string | null
): string | null {
    const parts: string[] = []

    if (stationName) parts.push(`Station: ${stationName}`)
    if (filters.category) parts.push(`Kategori: ${filters.category}`)
    if (filters.search) parts.push(`Sökning: "${filters.search}"`)

    return parts.length > 0 ? parts.join(' · ') : null
}
