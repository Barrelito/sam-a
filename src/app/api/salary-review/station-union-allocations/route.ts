// API: Station Union Allocations (per avtalsområde per station)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
        return NextResponse.json({ error: 'Only VO chiefs can allocate budgets' }, { status: 403 })
    }

    const body = await request.json()
    const { vo_union_budget_id, allocations } = body

    if (!vo_union_budget_id || !allocations || !Array.isArray(allocations)) {
        return NextResponse.json({ error: 'vo_union_budget_id and allocations array required' }, { status: 400 })
    }

    // Verify budget belongs to user's VO
    const { data: budget } = await supabase
        .from('vo_union_budgets')
        .select('vo_id')
        .eq('id', vo_union_budget_id)
        .single()

    if (!budget || budget.vo_id !== profile.vo_id) {
        return NextResponse.json({ error: 'Budget not found or not authorized' }, { status: 403 })
    }

    // Delete existing allocations for this budget
    await supabase
        .from('station_union_allocations')
        .delete()
        .eq('vo_union_budget_id', vo_union_budget_id)

    // Insert new allocations
    const allocationsToInsert = allocations
        .filter((a: any) => a.allocated_amount && parseFloat(a.allocated_amount) > 0)
        .map((a: any) => ({
            vo_union_budget_id,
            station_id: a.station_id,
            allocated_amount: parseFloat(a.allocated_amount),
            notes: a.notes || null
        }))

    if (allocationsToInsert.length > 0) {
        const { error } = await supabase
            .from('station_union_allocations')
            .insert(allocationsToInsert)

        if (error) {
            console.error('Error saving allocations:', error)
            return NextResponse.json({ error: 'Failed to save allocations' }, { status: 500 })
        }
    }

    return NextResponse.json({
        success: true,
        count: allocationsToInsert.length
    })
}
