// API Route: VO Progress Tracking
// GET: Hämta förloppsstatistik för VO-chefens VO

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/salary-review/vo-progress
// Hämta förloppsstatistik för hela VO
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

        // Get all stations in VO with their progress
        const { data: stations, error: stationsError } = await supabase
            .from('stations')
            .select(`
                id,
                name,
                employees:employees(count)
            `)
            .eq('vo_id', profile.vo_id)

        if (stationsError) {
            console.error('Error fetching stations:', stationsError)
            return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 })
        }

        // Get review progress for each station
        const stationProgress = await Promise.all(
            stations.map(async (station: any) => {
                // Count employees
                const { count: employeeCount } = await supabase
                    .from('employees')
                    .select('*', { count: 'exact', head: true })
                    .eq('station_id', station.id)

                // Count reviews with criteria assessed
                const { data: reviewsWithCriteria } = await supabase
                    .from('salary_reviews')
                    .select(`
                        id,
                        employee:employees!inner(station_id),
                        criteria:salary_criteria_assessments(count)
                    `)
                    .eq('employee.station_id', station.id)
                    .eq('cycle_id', targetCycleId)

                const assessedCount = reviewsWithCriteria?.filter((r: any) =>
                    r.criteria && r.criteria.length > 0
                ).length || 0

                // Count completed reviews
                const { count: completedCount } = await supabase
                    .from('salary_reviews')
                    .select('*, employee:employees!inner(station_id)', { count: 'exact', head: true })
                    .eq('employee.station_id', station.id)
                    .eq('cycle_id', targetCycleId)
                    .eq('status', 'completed')

                return {
                    station_id: station.id,
                    station_name: station.name,
                    employee_count: employeeCount || 0,
                    assessed_count: assessedCount,
                    completed_count: completedCount || 0
                }
            })
        )

        // Calculate totals
        const totals = stationProgress.reduce((acc, station) => ({
            total_employees: acc.total_employees + station.employee_count,
            employees_assessed: acc.employees_assessed + station.assessed_count,
            employees_completed: acc.employees_completed + station.completed_count
        }), {
            total_employees: 0,
            employees_assessed: 0,
            employees_completed: 0
        })

        return NextResponse.json({
            ...totals,
            stations: stationProgress
        })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
