import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

interface DistributionTarget {
    station_id: string
    assigned_to?: string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id: taskId } = await params
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

    // Only VO chiefs and admins can distribute tasks
    if (profile.role !== 'vo_chief' && profile.role !== 'admin') {
        return NextResponse.json({ error: 'Only VO chiefs can distribute tasks' }, { status: 403 })
    }

    // Get the parent task
    const { data: parentTask, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

    if (taskError || !parentTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify it's a VO task
    if (parentTask.owner_type !== 'vo') {
        return NextResponse.json({ error: 'Only VO tasks can be distributed' }, { status: 400 })
    }

    // VO chiefs can only distribute tasks in their own VO
    if (profile.role === 'vo_chief' && parentTask.vo_id !== profile.vo_id) {
        return NextResponse.json({ error: 'You can only distribute tasks in your own VO' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { targets } = body as { targets: DistributionTarget[] }

    if (!targets || !Array.isArray(targets) || targets.length === 0) {
        return NextResponse.json({ error: 'No distribution targets provided' }, { status: 400 })
    }

    // Verify all stations belong to the same VO
    const stationIds = targets.map(t => t.station_id)
    const { data: stations } = await supabase
        .from('stations')
        .select('id, vo_id')
        .in('id', stationIds)

    if (!stations || stations.length !== stationIds.length) {
        return NextResponse.json({ error: 'Some stations not found' }, { status: 400 })
    }

    const invalidStations = stations.filter(s => s.vo_id !== parentTask.vo_id)
    if (invalidStations.length > 0) {
        return NextResponse.json({ error: 'All stations must belong to the same VO as the task' }, { status: 400 })
    }

    // Check for existing distributions to avoid duplicates
    const { data: existingTasks } = await supabase
        .from('tasks')
        .select('station_id')
        .eq('parent_task_id', taskId)
        .in('station_id', stationIds)

    const existingStationIds = new Set(existingTasks?.map(t => t.station_id) || [])
    const newTargets = targets.filter(t => !existingStationIds.has(t.station_id))

    if (newTargets.length === 0) {
        return NextResponse.json({
            error: 'All selected stations already have this task distributed'
        }, { status: 400 })
    }

    // Create station tasks
    const stationTasks = newTargets.map(target => ({
        title: parentTask.title,
        description: parentTask.description,
        category: parentTask.category,
        owner_type: 'station',
        vo_id: parentTask.vo_id,
        station_id: target.station_id,
        created_by: user.id,
        year: parentTask.year,
        start_month: parentTask.start_month,
        end_month: parentTask.end_month,
        is_recurring_monthly: parentTask.is_recurring_monthly,
        deadline_day: parentTask.deadline_day,
        assigned_to: target.assigned_to || null,
        parent_task_id: taskId,
        status: 'not_started',
    }))

    const { data: createdTasks, error: createError } = await supabase
        .from('tasks')
        .insert(stationTasks)
        .select(`
            *,
            station:station_id(id, name)
        `)

    if (createError) {
        console.error('Error creating station tasks:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Return the created tasks and info about skipped ones
    return NextResponse.json({
        created: createdTasks,
        skipped: targets.length - newTargets.length,
        message: `Fördelade till ${createdTasks?.length || 0} stationer`
    }, { status: 201 })
}

// GET: Get distribution status for a task
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { id: taskId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the parent task
    const { data: parentTask } = await supabase
        .from('tasks')
        .select('id, owner_type, vo_id')
        .eq('id', taskId)
        .single()

    if (!parentTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get all child tasks (distributed to stations)
    const { data: childTasks, error } = await supabase
        .from('tasks')
        .select(`
            *,
            station:station_id(id, name),
            assigned_to_profile:assigned_to(id, full_name, email)
        `)
        .eq('parent_task_id', taskId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching child tasks:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get all stations in this VO for comparison
    const { data: voStations } = await supabase
        .from('stations')
        .select('id, name')
        .eq('vo_id', parentTask.vo_id)

    // Calculate distribution stats
    const distributedStationIds = new Set(childTasks?.map(t => t.station_id) || [])
    const notDistributed = voStations?.filter(s => !distributedStationIds.has(s.id)) || []

    // Calculate completion stats
    const total = childTasks?.length || 0
    const completed = childTasks?.filter(t => t.status === 'done' || t.status === 'reported').length || 0
    const inProgress = childTasks?.filter(t => t.status === 'in_progress').length || 0

    return NextResponse.json({
        parentTask,
        childTasks: childTasks || [],
        notDistributed,
        stats: {
            total,
            completed,
            inProgress,
            notStarted: total - completed - inProgress,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        }
    })
}
