
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, stationId, year, status } = body

    if (!itemId || !year) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine target (station or user)
    // If stationId provided, use it. Otherwise assume personal task?
    // For manual completion via UI, we usually want to link to a station if the user is a manager.

    let targetStationId = stationId
    let targetUserId = null

    if (!targetStationId) {
        // Try to find user's default station
        const { data: userStation } = await supabase
            .from('user_stations')
            .select('station_id')
            .eq('user_id', user.id)
            .limit(1)
            .single()

        if (userStation) {
            targetStationId = userStation.station_id
        } else {
            // Personal completion
            targetUserId = user.id
        }
    }

    // Upsert completion
    const { data, error } = await supabase
        .from('annual_task_completions')
        .upsert({
            annual_cycle_item_id: itemId,
            station_id: targetStationId,
            user_id: targetUserId,
            year: year,
            status: status || 'completed',
            completed_by: user.id,
            completed_at: new Date().toISOString()
        }, {
            onConflict: targetStationId
                ? 'annual_cycle_item_id, station_id, year'
                : 'annual_cycle_item_id, user_id, year'
        })
        .select()
        .single()

    if (error) {
        console.error('Error saving completion:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, completion: data })
}
