
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()

    // 1. Get all roadmap items (templates)
    const { data: items, error: itemsError } = await supabase
        .from('annual_cycle_items')
        .select('*')
        .order('month', { ascending: true })

    if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // 2. Get completions for this user/station(s) for the requested year
    // We need to know which station(s) the user manages to filter relevant completions
    const { data: userStations } = await supabase
        .from('user_stations')
        .select('station_id')
        .eq('user_id', user.id)

    const stationIds = userStations?.map(us => us.station_id) || []

    let completionsQuery = supabase
        .from('annual_task_completions')
        .select('*')
        .eq('year', year)
        .eq('status', 'completed')

    if (stationIds.length > 0) {
        // If user has stations, fetch completions matching those stations OR personal completions
        completionsQuery = completionsQuery.or(`station_id.in.(${stationIds.join(',')}),user_id.eq.${user.id}`)
    } else {
        // Fallback for users without stations (e.g. admins or unassigned)
        completionsQuery = completionsQuery.eq('user_id', user.id)
    }

    const { data: completions, error: completionsError } = await completionsQuery

    if (completionsError) {
        console.error('Error fetching completions:', completionsError)
        // Log error but continue with empty completions to not break the UI
    }

    // 3. Merge items with completion status
    // For now, if a user has multiple stations, we can mark it complete if ANY station has done it?
    // Or maybe we need a more complex UI for multi-station managers.
    // Let's assume for Visualization V1: "Completed" means completed for at least one of my stations.

    const enrichedItems = items.map(item => {
        const isCompleted = completions?.some(c => c.annual_cycle_item_id === item.id)
        return {
            ...item,
            is_completed: isCompleted || false,
            completion_details: completions?.filter(c => c.annual_cycle_item_id === item.id)
        }
    })

    return NextResponse.json({
        year,
        items: enrichedItems
    })
}
