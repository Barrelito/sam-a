import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { normalizeTaskStatus } from '@/lib/annual-cycle'
import { ensureAnnualTasksForStations } from '@/lib/annual-cycle-server'

export async function GET(request: NextRequest) {
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const ownerType = searchParams.get('owner_type')
    const stationId = searchParams.get('station_id')
    const voId = searchParams.get('vo_id')

    // --- 1. Fetch Regular Tasks ---
    let query = supabase
        .from('tasks')
        .select(`
            *,
            verksamhetsomraden:vo_id(id, name),
            station:station_id(id, name, vo_id),
            created_by_profile:created_by(id, full_name, email),
            assigned_to_profile:assigned_to(id, full_name, email),
            annual_cycle_item:annual_cycle_item_id(action_link)
        `)
        .eq('year', year)
        .order('start_month', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true })

    // Filter by month (including recurring tasks)
    if (month) {
        query = query.or(`start_month.lte.${month},is_recurring_monthly.eq.true`)
        query = query.or(`end_month.gte.${month},end_month.is.null,is_recurring_monthly.eq.true`)
    }

    // Apply filters
    if (status) {
        query = query.eq('status', status)
    }
    if (category) {
        query = query.eq('category', category)
    }
    if (ownerType) {
        query = query.eq('owner_type', ownerType)
    }
    if (stationId) {
        query = query.eq('station_id', stationId)
    }
    if (voId) {
        query = query.eq('vo_id', voId)
    }

    // Role-based filtering for Tasks
    let userStationIds: string[] = []
    if (profile.role === 'station_manager' || profile.role === 'assistant_manager') {
        const { data: userStations } = await supabase
            .from('user_stations')
            .select('station_id')
            .eq('user_id', user.id)

        userStationIds = userStations?.map(us => us.station_id) || []

        if (userStationIds.length > 0) {
            query = query.or(`station_id.in.(${userStationIds.join(',')}),vo_id.eq.${profile.vo_id}`)
        } else if (profile.vo_id) {
            query = query.eq('vo_id', profile.vo_id)
        }
    } else if (profile.role === 'vo_chief') {
        if (profile.vo_id) {
            query = query.or(`vo_id.eq.${profile.vo_id},created_by.eq.${user.id}`)
        }
    }

    // Make sure the annual cycle is materialized as real tasks rows for the
    // user's stations before fetching (idempotent, no-op when rows exist)
    await ensureAnnualTasksForStations(supabase, user.id, userStationIds, year)

    const { data: regularTasks, error } = await query

    if (error) {
        console.error('Error fetching tasks:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Annual cycle tasks are ordinary rows now; expose their template's
    // action_link and a convenience flag for the UI
    const allTasks = (regularTasks || []).map(({ annual_cycle_item, ...task }) => ({
        ...task,
        is_annual_cycle: !!task.annual_cycle_item_id,
        action_link: annual_cycle_item?.action_link ?? null,
    }))

    allTasks.sort((a, b) => {
        if (a.start_month !== b.start_month) return (a.start_month || 0) - (b.start_month || 0)
        return a.title.localeCompare(b.title)
    })

    return NextResponse.json({ tasks: allTasks })
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
        title,
        description,
        category,
        owner_type,
        vo_id,
        station_id,
        station_group_id,
        year,
        start_month,
        end_month,
        is_recurring_monthly,
        deadline_day,
        assigned_to,
        annual_cycle_item_id,
        status,
    } = body

    // Validate required fields
    if (!title || !category || !owner_type) {
        return NextResponse.json({
            error: 'Missing required fields: title, category, owner_type'
        }, { status: 400 })
    }

    // Normalize status if provided ('todo'/'completed' legacy values are mapped);
    // fall back to 'not_started' so materialized annual cycle tasks keep their state
    const initialStatus = normalizeTaskStatus(status) || 'not_started'

    // Permission checks
    if (owner_type === 'station') {
        if (profile.role === 'station_manager' || profile.role === 'assistant_manager') {
            // Check they have access to this station
            const { data: userStation } = await supabase
                .from('user_stations')
                .select('id')
                .eq('user_id', user.id)
                .eq('station_id', station_id)
                .single()

            if (!userStation) {
                return NextResponse.json({
                    error: 'You do not have access to this station'
                }, { status: 403 })
            }
        }
    } else if (owner_type === 'vo') {
        if (profile.role !== 'vo_chief' && profile.role !== 'admin') {
            return NextResponse.json({
                error: 'Only VO chiefs can create VO tasks'
            }, { status: 403 })
        }
        if (profile.role === 'vo_chief' && vo_id !== profile.vo_id) {
            return NextResponse.json({
                error: 'You can only create tasks for your own VO'
            }, { status: 403 })
        }
    } else if (owner_type === 'personal') {
        if (profile.role !== 'vo_chief' && profile.role !== 'admin') {
            return NextResponse.json({
                error: 'Only VO chiefs can create personal tasks'
            }, { status: 403 })
        }
    }

    // If creating a recurring monthly task, create master + current month instance
    if (is_recurring_monthly) {
        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()

        // Create master task
        const { data: masterTask, error: masterError } = await supabase
            .from('tasks')
            .insert({
                title,
                description,
                category,
                owner_type,
                vo_id: vo_id || profile.vo_id,
                station_id,
                station_group_id,
                created_by: user.id,
                year: year || currentYear,
                deadline_day: deadline_day || 25,
                is_recurring_master: true, // This is the master template
                is_recurring_monthly: false, // Masters don't use the old field
                start_month: null, // Masters don't have months
                end_month: null,
                status: 'not_started', // Masters don't really have status
            })
            .select()
            .single()

        if (masterError) {
            console.error('Error creating master task:', masterError)
            return NextResponse.json({ error: masterError.message }, { status: 500 })
        }

        // Create instance for current month
        const { data: instance, error: instanceError } = await supabase
            .from('tasks')
            .insert({
                title,
                description,
                category,
                owner_type,
                vo_id: vo_id || profile.vo_id,
                station_id,
                station_group_id,
                created_by: user.id,
                year: currentYear,
                deadline_day: deadline_day || 25,
                assigned_to,
                is_recurring_master: false,
                is_recurring_monthly: false,
                recurring_master_id: masterTask.id,
                instance_month: currentMonth,
                instance_year: currentYear,
                start_month: null, // Instances don't use these
                end_month: null,
                status: 'not_started',
            })
            .select()
            .single()

        if (instanceError) {
            console.error('Error creating task instance:', instanceError)
            return NextResponse.json({ error: instanceError.message }, { status: 500 })
        }

        return NextResponse.json({
            task: instance, // Return the instance as the "task"
            master: masterTask, // Include master for reference
            message: 'Created recurring master and current month instance'
        }, { status: 201 })
    }

    // Create regular task (non-recurring)
    const taskYear = year || new Date().getFullYear()
    const { data: task, error } = await supabase
        .from('tasks')
        .insert({
            title,
            description,
            category,
            owner_type,
            vo_id: vo_id || profile.vo_id,
            station_id,
            station_group_id,
            created_by: user.id,
            year: taskYear,
            start_month,
            end_month,
            is_recurring_monthly: false,
            is_recurring_master: false,
            deadline_day: deadline_day || 25,
            assigned_to,
            status: initialStatus,
            completed_at: initialStatus === 'done' ? new Date().toISOString() : null,
            completed_by: initialStatus === 'done' ? user.id : null,
            // Link to annual cycle template if provided (enables deduplication)
            annual_cycle_item_id: annual_cycle_item_id || null,
        })
        .select()
        .single()

    if (error) {
        // A materialized annual cycle task already exists for this (item, station, year) —
        // return the existing row instead of failing, so concurrent clients converge on it
        if (error.code === '23505' && annual_cycle_item_id && station_id) {
            const { data: existing } = await supabase
                .from('tasks')
                .select('*')
                .eq('annual_cycle_item_id', annual_cycle_item_id)
                .eq('station_id', station_id)
                .eq('year', taskYear)
                .single()

            if (existing) {
                return NextResponse.json({ task: existing }, { status: 200 })
            }
        }
        console.error('Error creating task:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ task }, { status: 201 })
}
