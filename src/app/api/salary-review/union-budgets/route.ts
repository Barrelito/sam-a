// API: Union Budgets (per avtalsområde)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const cycleId = searchParams.get('cycle_id')

    if (!cycleId) {
        return NextResponse.json({ error: 'cycle_id is required' }, { status: 400 })
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's VO
    const { data: profile } = await supabase
        .from('profiles')
        .select('vo_id, role')
        .eq('id', user.id)
        .single()

    if (!profile?.vo_id) {
        return NextResponse.json({ error: 'No VO assigned' }, { status: 403 })
    }

    // Get budgets for both union types
    const { data: budgets, error } = await supabase
        .from('vo_union_budgets')
        .select(`
            *,
            allocations:station_union_allocations (
                id,
                station_id,
                allocated_amount,
                notes,
                station:stations (id, name)
            )
        `)
        .eq('cycle_id', cycleId)
        .eq('vo_id', profile.vo_id)

    if (error) {
        console.error('Error fetching union budgets:', error)
        return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
    }

    // Organize by union type
    const vardförbundet = budgets?.find(b => b.union_type === 'vardförbundet') || null
    const kommunal = budgets?.find(b => b.union_type === 'kommunal') || null

    return NextResponse.json({
        vardförbundet,
        kommunal
    })
}

export async function POST(request: Request) {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role
    const { data: profile } = await supabase
        .from('profiles')
        .select('vo_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'vo_chief') {
        return NextResponse.json({ error: 'Only VO chiefs can set budgets' }, { status: 403 })
    }

    const body = await request.json()
    const {
        cycle_id,
        union_type,
        // Vårdförbundet fields
        total_budget,
        extra_skilled_amount,
        // Kommunal fields
        guaranteed_per_employee,
        variable_budget
    } = body

    if (!cycle_id || !union_type) {
        return NextResponse.json({ error: 'cycle_id and union_type are required' }, { status: 400 })
    }

    if (!['vardförbundet', 'kommunal'].includes(union_type)) {
        return NextResponse.json({ error: 'Invalid union_type' }, { status: 400 })
    }

    // Upsert budget
    const { data: budget, error } = await supabase
        .from('vo_union_budgets')
        .upsert({
            cycle_id,
            vo_id: profile.vo_id,
            union_type,
            total_budget: union_type === 'vardförbundet' ? total_budget : null,
            extra_skilled_amount: union_type === 'vardförbundet' ? extra_skilled_amount : null,
            guaranteed_per_employee: union_type === 'kommunal' ? guaranteed_per_employee : null,
            variable_budget: union_type === 'kommunal' ? variable_budget : null
        }, {
            onConflict: 'cycle_id,vo_id,union_type'
        })
        .select()
        .single()

    if (error) {
        console.error('Error saving union budget:', error)
        return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 })
    }

    return NextResponse.json({ budget })
}
