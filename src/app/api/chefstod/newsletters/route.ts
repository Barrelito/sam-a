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
                station_group:station_groups (
                    id,
                    name,
                    members:station_group_members (
                        station:stations (
                            id,
                            name
                        )
                    )
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
        let { station_id, station_group_id, year, week_number, initial_bullets } = body

        // If neither station_id nor station_group_id provided, auto-select
        if (!station_id && !station_group_id) {
            // Get user's stations
            const { data: userStations } = await supabase
                .from('user_stations')
                .select('station_id, station:stations(id, name)')
                .eq('user_id', user.id)

            // Get station groups user has access to (through their stations)
            const { data: userGroups } = await supabase
                .from('station_group_members')
                .select(`
                    station_group_id,
                    station_group:station_groups(
                        id,
                        name,
                        members:station_group_members(
                            station:stations(id, name)
                        )
                    )
                `)
                .in('station_id', (userStations || []).map(us => us.station_id))

            // Deduplicate groups
            const uniqueGroups = userGroups?.reduce((acc: any[], curr) => {
                if (!acc.find(g => g.station_group?.id === curr.station_group?.id)) {
                    acc.push(curr)
                }
                return acc
            }, []) || []

            const totalOptions = (userStations?.length || 0) + uniqueGroups.length

            if (totalOptions === 0) {
                return NextResponse.json(
                    { error: 'No station or station group found for user' },
                    { status: 400 }
                )
            }

            // Auto-select if only one option
            if (totalOptions === 1) {
                if (userStations && userStations.length === 1 && uniqueGroups.length === 0) {
                    station_id = userStations[0].station_id
                } else if (uniqueGroups.length === 1 && uniqueGroups[0].station_group) {
                    station_group_id = uniqueGroups[0].station_group.id
                }
            } else {
                // Multiple options, need user to select
                return NextResponse.json(
                    {
                        requiresSelection: true,
                        options: {
                            stations: userStations?.map(us => us.station) || [],
                            stationGroups: uniqueGroups.map(ug => ug.station_group)
                        }
                    },
                    { status: 200 }
                )
            }
        }

        // Validate: must have exactly one (station_id OR station_group_id)
        if ((station_id && station_group_id) || (!station_id && !station_group_id)) {
            return NextResponse.json(
                { error: 'Must provide either station_id or station_group_id, not both' },
                { status: 400 }
            )
        }

        // If year/week not provided, use current week
        const currentWeek = getISOWeek(new Date())
        const finalYear = year || currentWeek.year
        const finalWeek = week_number || currentWeek.week

        // Check if newsletter already exists for this week
        let existingQuery = supabase
            .from('weekly_newsletters')
            .select('id')
            .eq('year', finalYear)
            .eq('week_number', finalWeek)

        if (station_id) {
            existingQuery = existingQuery.eq('station_id', station_id).is('station_group_id', null)
        } else if (station_group_id) {
            existingQuery = existingQuery.eq('station_group_id', station_group_id).is('station_id', null)
        }

        const { data: existing } = await existingQuery.maybeSingle()

        if (existing) {
            return NextResponse.json(
                { error: 'Newsletter already exists for this week', existingId: existing.id },
                { status: 409 }
            )
        }

        // Create newsletter
        const insertData: any = {
            year: finalYear,
            week_number: finalWeek,
            created_by: user.id,
            raw_bullets: initial_bullets || [],
            status: 'draft'
        }

        if (station_id) {
            insertData.station_id = station_id
        } else if (station_group_id) {
            insertData.station_group_id = station_group_id
        }

        const { data: newsletter, error: createError } = await supabase
            .from('weekly_newsletters')
            .insert(insertData)
            .select(`
                *,
                station:stations (
                    id,
                    name
                ),
                station_group:station_groups (
                    id,
                    name,
                    members:station_group_members (
                        station:stations (
                            id,
                            name
                        )
                    )
                )
            `)
            .single()

        if (createError) {
            console.error('Error creating newsletter:', createError)
            return NextResponse.json({ error: createError.message }, { status: 500 })
        }

        return NextResponse.json({ newsletter }, { status: 201 })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
