import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/chefstod/newsletters/[id] - Get single newsletter
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Unwrap params Promise
        const { id } = await params

        const { data: newsletter, error } = await supabase
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
                )
            `)
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching newsletter:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!newsletter) {
            return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
        }

        return NextResponse.json({ newsletter })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH /api/chefstod/newsletters/[id] - Update newsletter
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Unwrap params Promise
        const { id } = await params

        const body = await req.json()
        const { raw_bullets, generated_content, final_content, status, station_id, station_group_id } = body

        // Build update object
        const updates: any = {}
        if (raw_bullets !== undefined) updates.raw_bullets = raw_bullets
        if (generated_content !== undefined) updates.generated_content = generated_content
        if (final_content !== undefined) updates.final_content = final_content
        if (status !== undefined) {
            updates.status = status
            if (status === 'published') {
                updates.published_at = new Date().toISOString()
            }
        }

        // Allow changing station_id or station_group_id
        if (station_id !== undefined || station_group_id !== undefined) {
            updates.station_id = station_id
            updates.station_group_id = station_group_id
        }

        const { data: newsletter, error } = await supabase
            .from('weekly_newsletters')
            .update(updates)
            .eq('id', id)
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

        if (error) {
            console.error('Error updating newsletter:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ newsletter })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/chefstod/newsletters/[id] - Delete newsletter (drafts only)
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Unwrap params Promise
        const { id } = await params

        // Check if draft
        const { data: newsletter } = await supabase
            .from('weekly_newsletters')
            .select('status, created_by')
            .eq('id', id)
            .single()

        if (!newsletter) {
            return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
        }

        // Get user role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // Only allow deletion of drafts by creator, or any by admin
        if (newsletter.status !== 'draft' && profile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Can only delete draft newsletters' },
                { status: 403 }
            )
        }

        const { error } = await supabase
            .from('weekly_newsletters')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting newsletter:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
