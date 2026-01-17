import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
            assigned_to_profile:assigned_to(id, full_name, email)
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

    const { data: regularTasks, error } = await query

    if (error) {
        console.error('Error fetching tasks:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // --- 2. Fetch Annual Cycle "Virtual" Tasks ---
    // Only if not filtering by non-matching ownerType (cycle items are 'annual_cycle' conceptually)
    let virtualTasks: any[] = []
    if (!ownerType || ownerType === 'annual_cycle') {

        // Fetch items matching filters
        let itemsQuery = supabase
            .from('annual_cycle_items')
            .select('*')

        if (month) {
            itemsQuery = itemsQuery.eq('month', month)
        }
        if (category) {
            itemsQuery = itemsQuery.eq('category', category)
        }

        const { data: cycleItems } = await itemsQuery

        if (cycleItems && cycleItems.length > 0) {
            // Fetch completions
            let completionsQuery = supabase
                .from('annual_task_completions')
                .select('*')
                .eq('year', year)
                .in('annual_cycle_item_id', cycleItems.map(i => i.id))

            if (userStationIds.length > 0) {
                completionsQuery = completionsQuery.or(`station_id.in.(${userStationIds.join(',')}),user_id.eq.${user.id}`)
            } else {
                completionsQuery = completionsQuery.eq('user_id', user.id)
            }

            const { data: completions } = await completionsQuery

            // Map to Task format
            virtualTasks = cycleItems.map(item => {
                // Check if a real task already exists for this cycle item
                // This prevents duplication in the UI
                const existingRealTask = regularTasks?.find(t =>
                    t.annual_cycle_item_id === item.id ||
                    (t.title === item.title && t.start_month === item.month) // Legacy support for older manual tasks
                )

                if (existingRealTask) return null

                const completion = completions?.find(c => c.annual_cycle_item_id === item.id)
                const isCompleted = !!completion

                // If filtering by status, skip if mismatch
                if (status && status === 'completed' && !isCompleted) return null
                if (status && status !== 'completed' && isCompleted) return null

                return {
                    id: `annual-${item.id}`, // Custom ID prefix
                    original_id: item.id,
                    title: item.title,
                    description: item.description,
                    status: isCompleted ? 'completed' : 'todo',
                    category: item.category,
                    owner_type: 'annual_cycle', // Virtual owner type
                    year: year,
                    start_month: item.month,
                    end_month: item.month,
                    deadline_day: 25, // Default deadlind
                    is_recurring_monthly: false,
                    is_annual_cycle: true,
                    action_link: item.action_link,

                    // Add mock Profile/Station data structure to avoid frontend crashes if it expects objects
                    created_by_profile: { full_name: 'Årshjulet', email: 'system@aisab.se' },
                    station: null, // Global item usually
                    verksamhetsomraden: null
                }
            }).filter(Boolean)
        }
    }

    // Combine and Sort
    const allTasks = [...(regularTasks || []), ...virtualTasks]

    // Sort logic (Deadline ASC, Title ASC)
    // Here simplifying to Title for now, or maybe month/deadline
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
        year,
        start_month,
        end_month,
        is_recurring_monthly,
        deadline_day,
        assigned_to,
    } = body

    // Validate required fields
    if (!title || !category || !owner_type) {
        return NextResponse.json({
            error: 'Missing required fields: title, category, owner_type'
        }, { status: 400 })
    }

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

    // Create task
    const { data: task, error } = await supabase
        .from('tasks')
        .insert({
            title,
            description,
            category,
            owner_type,
            vo_id: vo_id || profile.vo_id,
            station_id,
            created_by: user.id,
            year: year || new Date().getFullYear(),
            start_month,
            end_month,
            is_recurring_monthly: is_recurring_monthly || false,
            deadline_day: deadline_day || 25,
            assigned_to,
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating task:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ task }, { status: 201 })
}
