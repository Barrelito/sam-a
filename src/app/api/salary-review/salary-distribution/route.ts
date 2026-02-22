// API Route: Salary Distribution (Updated for Union separation)
// Beräknar lönefördelning baserat på avtalsområde (Vårdförbundet vs Kommunal)

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/salary-review/salary-distribution?station_id=xxx&cycle_id=xxx
// OR /api/salary-review/salary-distribution?station_group_id=xxx&cycle_id=xxx
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('station_id')
        const stationGroupId = searchParams.get('station_group_id')
        const cycleId = searchParams.get('cycle_id')

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!stationId && !stationGroupId) {
            return NextResponse.json({ error: 'station_id or station_group_id required' }, { status: 400 })
        }

        if (stationId && stationGroupId) {
            return NextResponse.json({ error: 'Provide either station_id or station_group_id, not both' }, { status: 400 })
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

        // Determine which stations to query
        let stationIds: string[] = []
        let voId: string | null = null

        if (stationGroupId) {
            // Get all stations in the group
            const { data: groupMembers } = await supabase
                .from('station_group_members')
                .select('station_id')
                .eq('station_group_id', stationGroupId)

            if (!groupMembers || groupMembers.length === 0) {
                return NextResponse.json({ error: 'Station group not found or empty' }, { status: 404 })
            }

            stationIds = groupMembers.map(m => m.station_id)

            // Get VO from first station
            const { data: firstStation } = await supabase
                .from('stations')
                .select('vo_id')
                .eq('id', stationIds[0])
                .single()

            if (!firstStation) {
                return NextResponse.json({ error: 'Station not found' }, { status: 404 })
            }
            voId = firstStation.vo_id
        } else {
            // Single station mode
            stationIds = [stationId!]

            const { data: station } = await supabase
                .from('stations')
                .select('vo_id')
                .eq('id', stationId!)
                .single()

            if (!station) return NextResponse.json({ error: 'Station not found' }, { status: 404 })
            voId = station.vo_id
        }

        // 2. Get Allocations for ALL stations (will aggregate if multiple)
        const { data: allocationsData } = await supabase
            .from('station_union_allocations')
            .select(`
                allocated_amount,
                station_id,
                vo_union_budget:vo_union_budgets (
                    union_type,
                    extra_skilled_amount,
                    guaranteed_per_employee
                )
            `)
            .in('station_id', stationIds)

        const allocations = allocationsData || []

        // Aggregate budgets across all stations
        // VF settings (extra_skilled_amount) are VO-level, so same for all stations
        const vfAllocations = allocations.filter((a: any) => a.vo_union_budget?.union_type === 'vardförbundet')
        const vfBudget = {
            allocated_amount: vfAllocations.reduce((sum, a: any) => sum + (a.allocated_amount || 0), 0),
            // @ts-ignore
            extra_skilled_amount: vfAllocations[0]?.vo_union_budget?.extra_skilled_amount || 0
        }

        // Kommunal settings (guaranteed_per_employee) are VO-level, so same for all stations
        const komAllocations = allocations.filter((a: any) => a.vo_union_budget?.union_type === 'kommunal')
        const komBudget = {
            allocated_amount: komAllocations.reduce((sum, a: any) => sum + (a.allocated_amount || 0), 0),
            // @ts-ignore
            guaranteed_per_employee: komAllocations[0]?.vo_union_budget?.guaranteed_per_employee || 0
        }

        // 3. Get Employees from ALL stations
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select(`
                id,
                first_name,
                last_name,
                current_salary,
                category,
                salary_reviews(
                    id,
                    cycle_id,
                    proposed_increase,
                    final_increase,
                    is_particularly_skilled,
                    skilled_amount,
                    salary_criteria_assessments(rating)
                )
            `)
            .in('station_id', stationIds)

        if (empError) {
            console.error('Error fetching employees:', empError)
            return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
        }

        // Helper to calculate rating score
        // Using linear scale (0-3) summed across all criteria
        // Max possible: 42 points (14 criteria × 3 points each)
        const calculateTotalRating = (assessments: any[]) => {
            if (!assessments || assessments.length === 0) return 0
            const ratingMap: Record<string, number> = {
                'behover_utvecklas': 0, 'needs_improvement': 0,
                'bra': 1, 'good': 1,
                'mycket_bra': 2, 'very_good': 2,
                'utmarkt': 3, 'excellent': 3
            }
            // Sum all ratings (instead of average)
            const totalPoints = assessments.reduce((sum, a) => {
                return sum + (ratingMap[a.rating] || 0)
            }, 0)
            return totalPoints
        }

        // Process employees
        const employeeData = employees?.map(emp => {
            const reviews = emp.salary_reviews as any[] | undefined
            const currentReview = reviews?.find((r: any) => r.cycle_id === targetCycleId)
            const assessments = currentReview?.salary_criteria_assessments as any[] | undefined

            const totalRating = calculateTotalRating(assessments || [])

            // Map categories
            // VUB/SSK -> Vårdförbundet
            // AMB -> Kommunal
            const unionGroup = ['VUB', 'SSK'].includes(emp.category) ? 'vardforbundet' : 'kommunal'

            return {
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                category: emp.category,
                unionGroup,
                current_salary: emp.current_salary || 0,
                average_rating: totalRating, // Now contains total points (0-42)
                review_id: currentReview?.id || null,
                is_particularly_skilled: currentReview?.is_particularly_skilled || false,
                existing_final: currentReview?.final_increase !== undefined && currentReview?.final_increase !== null ? currentReview.final_increase : null,
                skilled_amount: currentReview?.skilled_amount !== undefined && currentReview?.skilled_amount !== null ? currentReview.skilled_amount : null
            }
        }) || []

        // ==========================================
        // CALCULATION LOGIC
        // ==========================================

        // --- Vårdförbundet Calculation ---
        const vfEmployees = employeeData.filter(e => e.unionGroup === 'vardforbundet')
        const vfTotalPoints = vfEmployees.reduce((sum, e) => sum + e.average_rating, 0)

        // Value per point (from allocated variable pot)
        const vfPerPoint = vfTotalPoints > 0 ? vfBudget.allocated_amount / vfTotalPoints : 0

        // Calculate proposed for VF
        vfEmployees.forEach(emp => {
            const pointsPart = emp.average_rating * vfPerPoint

            // @ts-ignore
            emp.proposed_increase = Math.round(pointsPart)
            // @ts-ignore
            emp.points_part = Math.round(pointsPart)
            // @ts-ignore
            emp.skilled_amount = emp.skilled_amount || 0

            // Final defaults to proposed if not set
            // @ts-ignore
            emp.final_increase = emp.existing_final ?? Math.round(pointsPart)
            // @ts-ignore
            emp.new_salary = emp.current_salary + emp.final_increase + emp.skilled_amount
        })

        // --- Kommunal Calculation ---
        const komEmployees = employeeData.filter(e => e.unionGroup === 'kommunal')
        const komTotalPoints = komEmployees.reduce((sum, e) => sum + e.average_rating, 0)

        // Value per point (from allocated variable pot)
        const komPerPoint = komTotalPoints > 0 ? komBudget.allocated_amount / komTotalPoints : 0

        // Calculate proposed for Kommunal
        komEmployees.forEach(emp => {
            const guaranteedPart = komBudget.guaranteed_per_employee
            const variablePart = emp.average_rating * komPerPoint

            // @ts-ignore
            emp.proposed_increase = Math.round(guaranteedPart + variablePart)
            // @ts-ignore
            emp.guaranteed_part = guaranteedPart
            // @ts-ignore
            emp.variable_part = Math.round(variablePart)
            // @ts-ignore
            emp.skilled_amount = emp.skilled_amount || 0

            // Final defaults to proposed
            // @ts-ignore
            emp.final_increase = emp.existing_final ?? Math.round(guaranteedPart + variablePart)
            // @ts-ignore
            emp.new_salary = emp.current_salary + emp.final_increase + emp.skilled_amount
        })

        return NextResponse.json({
            station_id: stationId,
            cycle_id: targetCycleId,
            budgets: {
                vardforbundet: {
                    ...vfBudget,
                    // Only count variable points-based increases, NOT skilled bonus (separate budget)
                    total_proposed: vfEmployees.reduce((sum, e: any) => sum + (e.points_part || 0), 0)
                },
                kommunal: {
                    ...komBudget,
                    // Only count variable points-based increases, NOT guaranteed (separate/fixed)
                    total_proposed: komEmployees.reduce((sum, e: any) => sum + (e.variable_part || 0), 0)
                }
            },
            employees: employeeData
        })

    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/salary-review/salary-distribution
// Spara manuella justeringar - Oförändrad logik, bara sparar final_increase
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { allocations } = body // [{ review_id, final_increase, proposed_increase, skilled_amount }]

        if (!allocations || !Array.isArray(allocations)) {
            return NextResponse.json({ error: 'allocations array required' }, { status: 400 })
        }

        // Update each review
        for (const alloc of allocations) {
            const { error } = await supabase
                .from('salary_reviews')
                .update({
                    final_increase: alloc.final_increase,
                    proposed_increase: alloc.proposed_increase, // Optional update of proposed
                    skilled_amount: alloc.skilled_amount
                })
                .eq('id', alloc.review_id)

            if (error) {
                console.error('Error updating review:', error)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
