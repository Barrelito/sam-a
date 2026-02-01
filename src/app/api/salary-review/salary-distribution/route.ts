// API Route: Salary Distribution (Updated for Union separation)
// Beräknar lönefördelning baserat på avtalsområde (Vårdförbundet vs Kommunal)

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/salary-review/salary-distribution?station_id=xxx&cycle_id=xxx
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

        // 1. Get Station to find VO
        const { data: station } = await supabase
            .from('stations')
            .select('id, vo_id')
            .eq('id', stationId)
            .single()

        if (!station) return NextResponse.json({ error: 'Station not found' }, { status: 404 })

        // 2. Get Allocations AND global settings from VO Budget via join
        const { data: allocationsData } = await supabase
            .from('station_union_allocations')
            .select(`
                allocated_amount,
                vo_union_budget:vo_union_budgets (
                    union_type,
                    extra_skilled_amount,
                    guaranteed_per_employee
                )
            `)
            .eq('station_id', stationId)

        const allocations = allocationsData || []

        // Extract budgets per union
        // Vårdförbundet
        const vfAlloc = allocations.find((a: any) => a.vo_union_budget?.union_type === 'vardförbundet')
        const vfBudget = {
            allocated_amount: vfAlloc?.allocated_amount || 0, // Poängbaserad pott
            // @ts-ignore
            extra_skilled_amount: vfAlloc?.vo_union_budget?.extra_skilled_amount || 0 // Fast belopp
        }

        // Kommunal
        const komAlloc = allocations.find((a: any) => a.vo_union_budget?.union_type === 'kommunal')
        const komBudget = {
            allocated_amount: komAlloc?.allocated_amount || 0, // Rörlig pott
            // @ts-ignore
            guaranteed_per_employee: komAlloc?.vo_union_budget?.guaranteed_per_employee || 0 // Fast belopp
        }

        // 3. Get Employees with category and review data
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
                    salary_criteria_assessments(rating)
                )
            `)
            .eq('station_id', stationId)

        if (empError) {
            console.error('Error fetching employees:', empError)
            return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
        }

        // Helper to calculate rating score
        // Using differentiated scale for better salary differentiation
        const calculateAverageRating = (assessments: any[]) => {
            if (!assessments || assessments.length === 0) return 0
            const ratingMap: Record<string, number> = {
                'behover_utvecklas': 1, 'needs_improvement': 1,
                'bra': 5, 'good': 5,
                'mycket_bra': 12, 'very_good': 12,
                'utmarkt': 25, 'excellent': 25
            }
            // Filter out 0/undefined
            const ratings = assessments.map(a => ratingMap[a.rating] || 0).filter(r => r > 0)
            if (ratings.length === 0) return 0
            return ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        }

        // Process employees
        const employeeData = employees?.map(emp => {
            const reviews = emp.salary_reviews as any[] | undefined
            const currentReview = reviews?.find((r: any) => r.cycle_id === targetCycleId)
            const assessments = currentReview?.salary_criteria_assessments as any[] | undefined

            const averageRating = calculateAverageRating(assessments || [])

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
                average_rating: Math.round(averageRating * 100) / 100,
                review_id: currentReview?.id || null,
                is_particularly_skilled: currentReview?.is_particularly_skilled || false,
                existing_final: currentReview?.final_increase || null
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
            const skilledPart = emp.is_particularly_skilled ? vfBudget.extra_skilled_amount : 0

            // @ts-ignore
            emp.proposed_increase = Math.round(pointsPart + skilledPart)
            // @ts-ignore
            emp.points_part = Math.round(pointsPart)
            // @ts-ignore
            emp.skilled_part = skilledPart

            // Final defaults to proposed if not set
            // @ts-ignore
            emp.final_increase = emp.existing_final ?? Math.round(pointsPart + skilledPart)
            // @ts-ignore
            emp.new_salary = emp.current_salary + emp.final_increase
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

            // Final defaults to proposed
            // @ts-ignore
            emp.final_increase = emp.existing_final ?? Math.round(guaranteedPart + variablePart)
            // @ts-ignore
            emp.new_salary = emp.current_salary + emp.final_increase
        })

        return NextResponse.json({
            station_id: stationId,
            cycle_id: targetCycleId,
            budgets: {
                vardforbundet: {
                    ...vfBudget,
                    total_proposed: vfEmployees.reduce((sum, e: any) => sum + e.proposed_increase, 0)
                },
                kommunal: {
                    ...komBudget,
                    total_proposed: komEmployees.reduce((sum, e: any) => sum + e.proposed_increase, 0)
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
        const { allocations } = body // [{ review_id, final_increase, proposed_increase }]

        if (!allocations || !Array.isArray(allocations)) {
            return NextResponse.json({ error: 'allocations array required' }, { status: 400 })
        }

        // Update each review
        for (const alloc of allocations) {
            const { error } = await supabase
                .from('salary_reviews')
                .update({
                    final_increase: alloc.final_increase,
                    proposed_increase: alloc.proposed_increase // Optional update of proposed
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
