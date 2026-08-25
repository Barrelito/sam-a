// Delade hjälpfunktioner för medarbetarhantering (server-side).
//
// Syftet är att ha EN källa till sanning för:
//  - vilka stationer en användare får placera medarbetare på
//  - validering/normalisering av medarbetarformulär
//  - skrivningar mot employees-tabellen som tål att valfria kolumner
//    (t.ex. phone) ännu inte migrerats i databasen

import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, 'public', any>

export const EMPLOYEE_CATEGORIES = ['VUB', 'SSK', 'AMB'] as const
export type EmployeeCategory = (typeof EMPLOYEE_CATEGORIES)[number]

// Erfarenhetsnivåerna bor i experience.ts tillsammans med härledningslogiken
export { EXPERIENCE_LEVELS, EXPERIENCE_LABELS } from './experience'
export type { ExperienceLevel } from './experience'

export const CATEGORY_LABELS: Record<EmployeeCategory, string> = {
    VUB: 'VUB - Specialistsjuksköterska',
    SSK: 'SSK - Grundsjuksköterska',
    AMB: 'AMB - Ambulanssjukvårdare',
}

export interface AssignableStation {
    id: string
    name: string
    vo_id?: string | null
}

/**
 * Returnerar de stationer som användaren får placera/flytta medarbetare på.
 * Spegling av RLS-policyn "Create/Update employees":
 *  - admin            → alla stationer
 *  - vo_chief         → alla stationer i sitt VO
 *  - area_manager     → stationer i sina stationsområden (+ ev. egna stationer)
 *  - station_manager  → sina stationer via user_stations
 */
export async function getAssignableStations(
    supabase: Client,
    userId: string
): Promise<{ stations: AssignableStation[]; role: string | null }> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, vo_id')
        .eq('id', userId)
        .single()

    const role: string | null = profile?.role ?? null
    const stations = new Map<string, AssignableStation>()

    const add = (station: AssignableStation | null | undefined) => {
        if (station?.id) stations.set(station.id, station)
    }

    if (role === 'admin') {
        const { data } = await supabase.from('stations').select('id, name, vo_id')
        data?.forEach(add)
    } else if (role === 'vo_chief' && profile?.vo_id) {
        const { data } = await supabase
            .from('stations')
            .select('id, name, vo_id')
            .eq('vo_id', profile.vo_id)
        data?.forEach(add)
    } else {
        if (role === 'area_manager') {
            const { data: groups } = await supabase
                .from('user_station_groups')
                .select(
                    `station_group:station_group_id (
                        station_group_members (
                            station:station_id (id, name, vo_id)
                        )
                    )`
                )
                .eq('user_id', userId)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            groups?.forEach((row: any) =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                row.station_group?.station_group_members?.forEach((m: any) => add(m.station))
            )
        }

        // Alla roller kan dessutom ha direkta stationskopplingar
        const { data: userStations } = await supabase
            .from('user_stations')
            .select('station:station_id (id, name, vo_id)')
            .eq('user_id', userId)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userStations?.forEach((row: any) => add(row.station))
    }

    return {
        stations: [...stations.values()].sort((a, b) => a.name.localeCompare(b.name, 'sv')),
        role,
    }
}

/** Kontrollerar att användaren får placera en medarbetare på angiven station. */
export async function canAssignToStation(
    supabase: Client,
    userId: string,
    stationId: string
): Promise<boolean> {
    const { stations } = await getAssignableStations(supabase, userId)
    return stations.some((s) => s.id === stationId)
}
