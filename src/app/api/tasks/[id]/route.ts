import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fromCompletionStatus, mapAnnualCategory, parseVirtualAnnualId } from '@/lib/annual-cycle'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get task with related data
    const { data: task, error } = await supabase
        .from('tasks')
        .select(`
            *,
            verksamhetsomraden:vo_id(id, name),
            station:station_id(id, name, vo_id),
            station_group:station_group_id(
                id, name, description,
                station_group_members(station_id)
            ),
            created_by_profile:created_by(id, full_name, email),
            assigned_to_profile:assigned_to(id, full_name, email)
        `)
        .eq('id', id)
        .single()

    // 2. FETCH VIRTUAL ANNUAL TASK if not found as real task
    if (error && id.startsWith('annual-')) {
        // Composite virtual ID: 'annual-{itemUUID}' or 'annual-{itemUUID}-{stationUUID}'
        const { itemId: itemUuid, stationId: embeddedStationId } = parseVirtualAnnualId(id)

        // Fetch the cycle item
        const { data: item } = await supabase
            .from('annual_cycle_items')
            .select('*')
            .eq('id', itemUuid)
            .single()

        if (item) {
            // Get user profile for role check
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, role, vo_id')
                .eq('id', user.id)
                .single()

            // Determine station context
            let virtualStation = null
            let virtualOwnerType: 'annual_cycle' | 'station' = 'annual_cycle'
            let virtualStationId: string | null = embeddedStationId

            if (virtualStationId) {
                // Fetch the specific station embedded in the virtual ID
                const { data: stationData } = await supabase
                    .from('stations')
                    .select('id, name, vo_id')
                    .eq('id', virtualStationId)
                    .single()
                if (stationData) {
                    virtualStation = stationData
                    virtualOwnerType = 'station'
                }
            } else if (profile && (profile.role === 'station_manager' || profile.role === 'assistant_manager')) {
                // Fallback for old IDs: use user's default station
                const { data: userStation } = await supabase
                    .from('user_stations')
                    .select('station:stations(id, name, vo_id)')
                    .eq('user_id', user.id)
                    .limit(1)
                    .single()

                if (userStation?.station) {
                    const station = Array.isArray(userStation.station) ? userStation.station[0] : userStation.station
                    if (station) {
                        virtualStation = station
                        virtualStationId = station.id
                        virtualOwnerType = 'station'
                    }
                }
            }

            // Check completion status for this station (or user)
            const completionQueryBase = supabase
                .from('annual_task_completions')
                .select('*')
                .eq('year', new Date().getFullYear())
                .eq('annual_cycle_item_id', itemUuid)

            const { data: completions } = virtualStationId
                ? await completionQueryBase.eq('station_id', virtualStationId)
                : await completionQueryBase.eq('user_id', user.id)

            const completion = completions && completions.length > 0 ? completions[0] : null

            const virtualTask = {
                id: id, // Keep the original composite ID intact
                original_id: item.id,
                annual_cycle_item_id: item.id,
                title: item.title,
                description: item.description,
                status: fromCompletionStatus(completion?.status),
                category: mapAnnualCategory(item.category),
                owner_type: virtualOwnerType,
                station_id: virtualStationId,
                station: virtualStation,
                assigned_to: completion?.assigned_to ?? null,
                year: new Date().getFullYear(),
                start_month: item.month,
                end_month: item.month,
                deadline_day: 25,
                is_recurring_monthly: false,
                is_annual_cycle: true,
                action_link: item.action_link,
                created_by_profile: { full_name: 'Årshjulet', email: 'system@aisab.se' },
                assigned_to_profile: null,
                comments: [],
                attachments: []
            }

            return NextResponse.json({ task: virtualTask })
        }
    }

    if (error) {
        console.error('Error fetching task:', error)
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get comments
    const { data: comments } = await supabase
        .from('task_comments')
        .select(`
            *,
            user:user_id(id, full_name, email, role)
        `)
        .eq('task_id', id)
        .order('created_at', { ascending: true })

    // Get attachments
    const { data: attachments } = await supabase
        .from('task_attachments')
        .select(`
            *,
            uploaded_by_profile:uploaded_by(id, full_name, email)
        `)
        .eq('task_id', id)
        .order('created_at', { ascending: false })

    return NextResponse.json({
        task: {
            ...task,
            comments: comments || [],
            attachments: attachments || [],
        }
    })
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, vo_id')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get current task
    const { data: currentTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single()

    if (!currentTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, any> = {}

    // Allow updates based on what's provided
    const allowedFields = [
        'title', 'description', 'category', 'start_month', 'end_month',
        'is_recurring_monthly', 'deadline_day', 'status', 'assigned_to', 'notes',
        'station_id', 'station_group_id', 'priority'
    ]

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updates[field] = body[field]
        }
    }

    console.log('Task PUT - Body received:', JSON.stringify(body))
    console.log('Task PUT - Updates to apply:', JSON.stringify(updates))

    // Handle status change
    if (body.status && body.status !== currentTask.status) {
        if (body.status === 'done') {
            updates.completed_at = new Date().toISOString()
            updates.completed_by = user.id
        } else if (currentTask.status === 'done') {
            // Reopening task
            updates.completed_at = null
            updates.completed_by = null
        }
    }

    // Handle VO review (only VO chiefs or admins)
    if (body.vo_reviewed !== undefined && (profile.role === 'vo_chief' || profile.role === 'admin')) {
        updates.vo_reviewed = body.vo_reviewed
        if (body.vo_reviewed) {
            updates.vo_reviewed_at = new Date().toISOString()
            updates.vo_reviewed_by = user.id
        } else {
            updates.vo_reviewed_at = null
            updates.vo_reviewed_by = null
        }
    }

    if (body.vo_comment !== undefined && (profile.role === 'vo_chief' || profile.role === 'admin')) {
        updates.vo_comment = body.vo_comment
    }

    // Update task
    const { data: task, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select(`
            *,
            verksamhetsomraden:vo_id(id, name),
            station:station_id(id, name, vo_id),
            station_group:station_group_id(id, name, description),
            created_by_profile:created_by(id, full_name, email),
            assigned_to_profile:assigned_to(id, full_name, email)
        `)
        .single()

    if (error) {
        console.error('Error updating task:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ task })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete task (RLS will handle permissions)
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting task:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
