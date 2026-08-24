import { SupabaseClient } from '@supabase/supabase-js'
import { mapAnnualCategory } from './annual-cycle'

// Materialization is limited to a window around the current year so that
// browsing far into the past/future never creates rows.
const MATERIALIZE_YEAR_WINDOW = 1

/**
 * Ensure every annual cycle item has a real tasks row for each of the given
 * stations for the given year. Idempotent: existing rows are left untouched
 * and concurrent calls converge via the unique index on
 * (annual_cycle_item_id, station_id, year).
 *
 * This runs as the requesting user, so RLS applies: only call it with
 * stations the user manages (the INSERT policy requires station access).
 */
export async function ensureAnnualTasksForStations(
    supabase: SupabaseClient,
    userId: string,
    stationIds: string[],
    year: number
): Promise<void> {
    if (stationIds.length === 0) return
    const currentYear = new Date().getFullYear()
    if (Math.abs(year - currentYear) > MATERIALIZE_YEAR_WINDOW) return

    const [{ data: items }, { data: existing }, { data: stations }] = await Promise.all([
        supabase
            .from('annual_cycle_items')
            .select('id, title, description, category, month'),
        supabase
            .from('tasks')
            .select('annual_cycle_item_id, station_id')
            .eq('year', year)
            .in('station_id', stationIds)
            .not('annual_cycle_item_id', 'is', null),
        supabase
            .from('stations')
            .select('id, vo_id')
            .in('id', stationIds),
    ])

    if (!items || items.length === 0) return

    const existingKeys = new Set(
        (existing || []).map(t => `${t.annual_cycle_item_id}:${t.station_id}`)
    )
    const voByStation = new Map((stations || []).map(s => [s.id, s.vo_id]))

    const missing = []
    for (const item of items) {
        for (const stationId of stationIds) {
            if (existingKeys.has(`${item.id}:${stationId}`)) continue
            missing.push({
                title: item.title,
                description: item.description,
                category: mapAnnualCategory(item.category),
                owner_type: 'station',
                vo_id: voByStation.get(stationId) ?? null,
                station_id: stationId,
                created_by: userId,
                year,
                start_month: item.month,
                end_month: item.month,
                deadline_day: 25,
                status: 'not_started',
                annual_cycle_item_id: item.id,
            })
        }
    }
    if (missing.length === 0) return

    const { error } = await supabase
        .from('tasks')
        .upsert(missing, {
            onConflict: 'annual_cycle_item_id,station_id,year',
            ignoreDuplicates: true,
        })

    if (error) {
        // Log and continue: a failed materialization should not break the fetch
        console.error('Error materializing annual cycle tasks:', error)
    }
}
