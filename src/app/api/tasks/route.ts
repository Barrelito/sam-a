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

    // Build query
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

    // Role-based filtering
    if (profile.role === 'station_manager' || profile.role === 'assistant_manager') {
        // Get user's stations
        const { data: userStations } = await supabase
            .from('user_stations')
            .select('station_id')
            .eq('user_id', user.id)

        const stationIds = userStations?.map(us => us.station_id) || []

        // Show tasks for their stations + VO tasks for their VO
        if (stationIds.length > 0) {
            query = query.or(`station_id.in.(${stationIds.join(',')}),vo_id.eq.${profile.vo_id}`)
        } else if (profile.vo_id) {
            query = query.eq('vo_id', profile.vo_id)
        }
    } else if (profile.role === 'vo_chief') {
        // VO chiefs see all tasks in their VO + their personal tasks
        if (profile.vo_id) {
            query = query.or(`vo_id.eq.${profile.vo_id},created_by.eq.${user.id}`)
        }
    }
    // Admins see all tasks (no additional filter)

    const { data: tasks, error } = await query

    if (error) {
        console.error('Error fetching tasks:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks })
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
