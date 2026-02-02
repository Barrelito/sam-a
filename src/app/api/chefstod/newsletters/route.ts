import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Helper function to get current ISO week number
function getISOWeek(date: Date): { year: number; week: number } {
    const target = new Date(date.valueOf())
    const dayNr = (date.getDay() + 6) % 7
    target.setDate(target.getDate() - dayNr + 3)
    const firstThursday = target.valueOf()
    target.setMonth(0, 1)
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
    }
    const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
    const year = target.getFullYear()
    return { year, week }
}

// GET /api/chefstod/newsletters - List newsletters
export async function GET(req: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Parse query params
        const { searchParams } = new URL(req.url)
        const stationId = searchParams.get('station_id')
        const year = searchParams.get('year')
        const week = searchParams.get('week')
        const status = searchParams.get('status')

        // Build query
        let query = supabase
            .from('weekly_newsletters')
            .select(`
                *,
                station:stations (
                    id,
                    name
                ),
                creator:profiles!created_by (
                    id,
                    email
                )
            `)
            .order('year', { ascending: false })
            .order('week_number', { ascending: false })

        // Apply filters
        if (stationId) {
            query = query.eq('station_id', stationId)
        }
        if (year) {
            query = query.eq('year', parseInt(year))
        }
        if (week) {
            query = query.eq('week_number', parseInt(week))
        }
        if (status) {
            query = query.eq('status', status)
        }

        const { data: newsletters, error } = await query

        if (error) {
            console.error('Error fetching newsletters:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ newsletters })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/chefstod/newsletters - Create new newsletter
export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        let { station_id, year, week_number, initial_bullets } = body

        // If station_id not provided, get user's first station
        if (!station_id) {
            const { data: userStations } = await supabase
                .from('user_stations')
                .select('station_id')
                .eq('user_id', user.id)
                .limit(1)

            if (!userStations || userStations.length === 0) {
                return NextResponse.json(
                    { error: 'No station found for user' },
                    { status: 400 }
                )
            }

            station_id = userStations[0].station_id
        }

        // If year/week not provided, use current week
        const currentWeek = getISOWeek(new Date())
        const finalYear = year || currentWeek.year
        const finalWeek = week_number || currentWeek.week

        // Check if newsletter already exists for this week
        const { data: existing } = await supabase
            .from('weekly_newsletters')
            .select('id')
            .eq('station_id', station_id)
            .eq('year', finalYear)
            .eq('week_number', finalWeek)
            .single()

        if (existing) {
            return NextResponse.json(
                { error: 'Newsletter already exists for this week', existingId: existing.id },
                { status: 409 }
            )
        }

        // Create newsletter
        const { data: newsletter, error } = await supabase
            .from('weekly_newsletters')
            .insert({
                station_id,
                year: finalYear,
                week_number: finalWeek,
                created_by: user.id,
                raw_bullets: [],
                status: 'draft'
            })
            .select(`
                *,
                station:stations (
                    id,
                    name
                )
            `)
            .single()

        if (error) {
            console.error('Error creating newsletter:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ newsletter }, { status: 201 })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
