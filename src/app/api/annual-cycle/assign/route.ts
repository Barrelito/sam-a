import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/annual-cycle/assign
 * Assigns (or unassigns) a user to an annual cycle task for a specific station.
 * Upserts a completion row with assigned_to set, keeping existing status if already set.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, stationId, year, assignedTo } = body

    if (!itemId || !year) {
        return NextResponse.json({ error: 'Missing required fields: itemId, year' }, { status: 400 })
    }

    // Determine the station context
    let targetStationId = stationId
    if (!targetStationId) {
        // Default to user's first station
        const { data: userStation } = await supabase
            .from('user_stations')
            .select('station_id')
            .eq('user_id', user.id)
            .limit(1)
            .single()
        if (userStation) targetStationId = userStation.station_id
    }

    if (!targetStationId) {
        return NextResponse.json({ error: 'No station context found' }, { status: 400 })
    }

    // Check if a completion row already exists
    const { data: existing } = await supabase
        .from('annual_task_completions')
        .select('id, status')
        .eq('annual_cycle_item_id', itemId)
        .eq('station_id', targetStationId)
        .eq('year', year)
        .single()

    if (existing) {
        // Update existing row's assigned_to
        const { error } = await supabase
            .from('annual_task_completions')
            .update({ assigned_to: assignedTo ?? null })
            .eq('id', existing.id)

        if (error) {
            console.error('Error updating assignment:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
    } else {
        // Insert new completion row with status 'not_started' (in_progress will mean "assigned but not done")
        const { error } = await supabase
            .from('annual_task_completions')
            .insert({
                annual_cycle_item_id: itemId,
                station_id: targetStationId,
                user_id: null,
                year: year,
                status: 'in_progress',
                assigned_to: assignedTo ?? null,
                completed_by: user.id,
            })

        if (error) {
            console.error('Error creating completion for assignment:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
    }

    return NextResponse.json({ success: true })
}
