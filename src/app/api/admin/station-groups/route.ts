import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase admin credentials')
    }

    return createClient(url, serviceKey)
}

// GET - List all station groups with their stations
export async function GET() {
    try {
        const supabase = createAdminClient()

        // Get station groups
        const { data: groups, error: groupsError } = await supabase
            .from('station_groups')
            .select(`
                *,
                verksamhetsomraden:vo_id (id, name)
            `)
            .order('name')

        if (groupsError) throw groupsError

        // Get members for all groups
        const { data: members, error: membersError } = await supabase
            .from('station_group_members')
            .select(`
                *,
                station:station_id (id, name, vo_id)
            `)

        if (membersError) throw membersError

        // Combine groups with their stations
        const groupsWithStations = groups?.map(group => ({
            ...group,
            stations: members
                ?.filter(m => m.station_group_id === group.id)
                .map(m => m.station) || []
        })) || []

        return NextResponse.json({ station_groups: groupsWithStations })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Create a new station group
export async function POST(request: NextRequest) {
    try {
        const supabase = createAdminClient()
        const body = await request.json()

        const { name, description, vo_id, station_ids, created_by } = body

        if (!name || !vo_id) {
            return NextResponse.json(
                { error: 'Missing required fields: name, vo_id' },
                { status: 400 }
            )
        }

        if (!station_ids || station_ids.length < 2) {
            return NextResponse.json(
                { error: 'A station group must have at least 2 stations' },
                { status: 400 }
            )
        }

        // Create the station group
        const { data: group, error: groupError } = await supabase
            .from('station_groups')
            .insert({
                name,
                description: description || null,
                vo_id,
                created_by: created_by || null
            })
            .select()
            .single()

        if (groupError) throw groupError

        // Add stations to the group
        const memberInserts = station_ids.map((station_id: string) => ({
            station_group_id: group.id,
            station_id
        }))

        const { error: membersError } = await supabase
            .from('station_group_members')
            .insert(memberInserts)

        if (membersError) {
            // Rollback: delete the group if members couldn't be added
            await supabase.from('station_groups').delete().eq('id', group.id)
            throw membersError
        }

        // Fetch the complete group with stations
        const { data: completeGroup, error: fetchError } = await supabase
            .from('station_groups')
            .select(`
                *,
                verksamhetsomraden:vo_id (id, name)
            `)
            .eq('id', group.id)
            .single()

        if (fetchError) throw fetchError

        // Get stations
        const { data: members } = await supabase
            .from('station_group_members')
            .select(`
                *,
                station:station_id (id, name, vo_id)
            `)
            .eq('station_group_id', group.id)

        return NextResponse.json({
            station_group: {
                ...completeGroup,
                stations: members?.map(m => m.station) || []
            }
        }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
