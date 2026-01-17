// API Route: Station Budget Allocations
// POST: Uppdatera fördelning av budget till stationer

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/salary-review/station-allocations
// Batch update av stationsfördelningar
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { vo_cycle_budget_id, allocations } = body

        if (!vo_cycle_budget_id || !allocations || !Array.isArray(allocations)) {
            return NextResponse.json(
                { error: 'Missing required fields: vo_cycle_budget_id, allocations' },
                { status: 400 }
            )
        }

        // Verify user has access to this VO budget
        const { data: budget } = await supabase
            .from('vo_cycle_budgets')
            .select('id, total_budget, vo_id')
            .eq('id', vo_cycle_budget_id)
            .single()

        if (!budget) {
            return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
        }

        // Verify user is VO chief for this VO
        const { data: profile } = await supabase
            .from('profiles')
            .select('vo_id, role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.vo_id !== budget.vo_id || profile.role !== 'vo_chief') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Validate total allocation doesn't exceed budget
        const totalAllocated = allocations.reduce((sum: number, alloc: any) =>
            sum + parseFloat(alloc.allocated_amount || 0), 0)

        if (totalAllocated > parseFloat(budget.total_budget)) {
            return NextResponse.json(
                {
                    error: 'Total allocation exceeds budget',
                    total_allocated: totalAllocated,
                    total_budget: budget.total_budget
                },
                { status: 400 }
            )
        }

        // Upsert all allocations
        const allocationRecords = allocations.map((alloc: any) => ({
            vo_cycle_budget_id,
            station_id: alloc.station_id,
            allocated_amount: alloc.allocated_amount,
            notes: alloc.notes || null
        }))

        const { data: savedAllocations, error } = await supabase
            .from('station_budget_allocations')
            .upsert(allocationRecords, {
                onConflict: 'vo_cycle_budget_id,station_id'
            })
            .select()

        if (error) {
            console.error('Error saving allocations:', error)
            return NextResponse.json(
                { error: 'Failed to save allocations' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            allocations: savedAllocations,
            total_allocated: totalAllocated
        }, { status: 200 })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
