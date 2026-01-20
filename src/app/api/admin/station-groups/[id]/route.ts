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

// GET - Get a single station group
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = createAdminClient()

        const { data: group, error: groupError } = await supabase
            .from('station_groups')
            .select(`
                *,
                verksamhetsomraden:vo_id (id, name)
            `)
            .eq('id', id)
            .single()

        if (groupError) throw groupError

        // Get members
        const { data: members, error: membersError } = await supabase
            .from('station_group_members')
            .select(`
                *,
                station:station_id (id, name, vo_id)
            `)
            .eq('station_group_id', id)

        if (membersError) throw membersError

        return NextResponse.json({
            station_group: {
                ...group,
                stations: members?.map(m => m.station) || []
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT - Update a station group
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = createAdminClient()
        const body = await request.json()

        const { name, description, station_ids } = body

        if (!name) {
            return NextResponse.json(
                { error: 'Missing required field: name' },
                { status: 400 }
            )
        }

        if (station_ids && station_ids.length < 2) {
            return NextResponse.json(
                { error: 'A station group must have at least 2 stations' },
                { status: 400 }
            )
        }

        // Update the group
        const { error: updateError } = await supabase
            .from('station_groups')
            .update({
                name,
                description: description || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) throw updateError

        // Update stations if provided
        if (station_ids && station_ids.length > 0) {
            // Remove existing members
            const { error: deleteError } = await supabase
                .from('station_group_members')
                .delete()
                .eq('station_group_id', id)

            if (deleteError) throw deleteError

            // Add new members
            const memberInserts = station_ids.map((station_id: string) => ({
                station_group_id: id,
                station_id
            }))

            const { error: insertError } = await supabase
                .from('station_group_members')
                .insert(memberInserts)

            if (insertError) throw insertError
        }

        // Fetch updated group
        const { data: group, error: fetchError } = await supabase
            .from('station_groups')
            .select(`
                *,
                verksamhetsomraden:vo_id (id, name)
            `)
            .eq('id', id)
            .single()

        if (fetchError) throw fetchError

        // Get updated members
        const { data: members } = await supabase
            .from('station_group_members')
            .select(`
                *,
                station:station_id (id, name, vo_id)
            `)
            .eq('station_group_id', id)

        return NextResponse.json({
            station_group: {
                ...group,
                stations: members?.map(m => m.station) || []
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE - Delete a station group
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('station_groups')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
