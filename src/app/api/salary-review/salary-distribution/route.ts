// API Route: Salary Distribution
// Beräknar lönefördelning baserat på betyg och budget

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/salary-review/salary-distribution?station_id=xxx&cycle_id=xxx
// Räknar ut förslag på löneökning per medarbetare
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('station_id')
        const cycleId = searchParams.get('cycle_id')

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!stationId) {
            return NextResponse.json({ error: 'station_id required' }, { status: 400 })
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

        // Get station's allocated budget
        const { data: allocation } = await supabase
            .from('station_budget_allocations')
            .select(`
                allocated_amount,
                vo_cycle_budget:vo_cycle_budgets(cycle_id)
            `)
            .eq('station_id', stationId)
            .single()

        const stationBudget = allocation?.allocated_amount || 0

        // Get all employees on this station with their reviews and ratings
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select(`
                id,
                first_name,
                last_name,
                current_salary,
                salary_reviews(
                    id,
                    cycle_id,
                    proposed_increase,
                    final_increase,
                    salary_criteria_assessments(rating)
                )
            `)
            .eq('station_id', stationId)

        if (empError) {
            console.error('Error fetching employees:', empError)
            return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
        }

        // Calculate average rating for each employee (for current cycle)
        const employeeData = employees?.map(emp => {
            const reviews = emp.salary_reviews as any[] | undefined
            const currentReview = reviews?.find((r: any) => r.cycle_id === targetCycleId)

            console.log(`Processing ${emp.first_name}: Review found?`, !!currentReview)

            // Calculate average rating from assessments
            let averageRating = 0
            const assessments = currentReview?.salary_criteria_assessments as any[] | undefined

            console.log(`Assessments for ${emp.first_name}:`, assessments?.length)

            if (assessments && assessments.length > 0) {
                const ratings = assessments
                    .map((a: any) => {
                        // Convert rating string to number
                        const ratingMap: Record<string, number> = {
                            // Swedish (från databasen)
                            'behover_utvecklas': 1,
                            'acceptabel': 2,
                            'bra': 3,
                            'mycket_bra': 4,
                            'utmarkt': 5,

                            // English (fallback)
                            'needs_improvement': 1,
                            'acceptable': 2,
                            'good': 3,
                            'very_good': 4,
                            'excellent': 5
                        }
                        return ratingMap[a.rating] || 0
                    })
                    .filter((r: number) => r > 0)

                console.log(`Ratings for ${emp.first_name}:`, ratings)

                if (ratings.length > 0) {
                    averageRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
                }
            }

            return {
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                current_salary: emp.current_salary || 0,
                average_rating: Math.round(averageRating * 100) / 100, // 2 decimaler
                review_id: currentReview?.id || null,
                existing_proposed: currentReview?.proposed_increase || null,
                existing_final: currentReview?.final_increase || null
            }
        }) || []

        // Calculate weighted distribution
        const totalRating = employeeData.reduce((sum, emp) => sum + emp.average_rating, 0)
        const perRatingUnit = totalRating > 0 ? parseFloat(stationBudget) / totalRating : 0

        const distribution = employeeData.map(emp => {
            const proposedIncrease = emp.average_rating * perRatingUnit
            const newSalary = parseFloat(emp.current_salary) + proposedIncrease

            return {
                ...emp,
                proposed_increase: Math.round(proposedIncrease),
                new_salary: Math.round(newSalary),
                // Use existing final if set, otherwise proposed
                final_increase: emp.existing_final || Math.round(proposedIncrease)
            }
        })

        return NextResponse.json({
            station_id: stationId,
            cycle_id: targetCycleId,
            station_budget: parseFloat(stationBudget),
            total_rating: totalRating,
            per_rating_unit: Math.round(perRatingUnit),
            employees: distribution,
            total_proposed: distribution.reduce((sum, e) => sum + e.proposed_increase, 0),
            total_final: distribution.reduce((sum, e) => sum + e.final_increase, 0)
        })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/salary-review/salary-distribution
// Spara manuella justeringar
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { allocations } = body // [{ review_id, final_increase }]

        if (!allocations || !Array.isArray(allocations)) {
            return NextResponse.json({ error: 'allocations array required' }, { status: 400 })
        }

        // Update each review with final_increase
        for (const alloc of allocations) {
            const { error } = await supabase
                .from('salary_reviews')
                .update({
                    final_increase: alloc.final_increase,
                    proposed_increase: alloc.proposed_increase || alloc.final_increase
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
