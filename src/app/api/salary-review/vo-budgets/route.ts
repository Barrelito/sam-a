// API Route: VO Budget Management
// GET: Hämta budget för VO
// POST: Skapa eller uppdatera budget
// PUT: Uppdatera befintlig budget

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/salary-review/vo-budgets
// Hämta budget för VO-chefens VO
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const cycleId = searchParams.get('cycle_id')

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's VO from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('vo_id')
            .eq('id', user.id)
            .single()

        if (!profile || !profile.vo_id) {
            return NextResponse.json({ error: 'No VO found for user' }, { status: 404 })
        }

        // Get active cycle if not specified
        let targetCycleId = cycleId
        if (!targetCycleId) {
            const { data: activeCycle } = await supabase
                .from('salary_review_cycles')
                .select('id')
                .eq('status', 'active')
                .single()

            if (!activeCycle) {
                return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
            }
            targetCycleId = activeCycle.id
        }

        // Get VO budget with allocations
        const { data: budget, error } = await supabase
            .from('vo_cycle_budgets')
            .select(`
                *,
                allocations:station_budget_allocations(
                    id,
                    station_id,
                    allocated_amount,
                    notes,
                    station:stations(id, name)
                )
            `)
            .eq('cycle_id', targetCycleId)
            .eq('vo_id', profile.vo_id)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching budget:', error)
            return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 })
        }

        // Calculate totals
        const allocatedBudget = budget?.allocations?.reduce((sum: number, alloc: any) =>
            sum + parseFloat(alloc.allocated_amount || 0), 0) || 0

        const remainingBudget = budget ? parseFloat(budget.total_budget) - allocatedBudget : 0

        return NextResponse.json({
            budget: budget || null,
            allocated_budget: allocatedBudget,
            remaining_budget: remainingBudget
        })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/salary-review/vo-budgets
// Skapa eller uppdatera total budget för VO
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { cycle_id, total_budget } = body

        if (!cycle_id || total_budget === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: cycle_id, total_budget' },
                { status: 400 }
            )
        }

        if (total_budget < 0) {
            return NextResponse.json(
                { error: 'Budget cannot be negative' },
                { status: 400 }
            )
        }

        // Get user's VO from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('vo_id')
            .eq('id', user.id)
            .single()

        if (!profile || !profile.vo_id) {
            return NextResponse.json({ error: 'No VO found for user' }, { status: 403 })
        }

        // Upsert budget
        const { data: budget, error } = await supabase
            .from('vo_cycle_budgets')
            .upsert({
                cycle_id,
                vo_id: profile.vo_id,
                total_budget,
                created_by: user.id
            }, {
                onConflict: 'cycle_id,vo_id'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating/updating budget:', error)
            return NextResponse.json(
                { error: 'Failed to save budget' },
                { status: 500 }
            )
        }

        return NextResponse.json({ budget }, { status: 200 })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
