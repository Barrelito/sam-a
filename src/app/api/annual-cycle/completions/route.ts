import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/annual-cycle/completions?year=YYYY
 * Returns the annual cycle completions visible to the caller for a year.
 * RLS scopes the rows: station managers see their stations' completions,
 * VO chiefs see their VO's, everyone sees their own personal rows.
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const yearParam = request.nextUrl.searchParams.get('year')
    const parsedYear = yearParam ? parseInt(yearParam, 10) : NaN
    const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear()

    const { data, error } = await supabase
        .from('annual_task_completions')
        .select('id, annual_cycle_item_id, station_id, user_id, status, year')
        .eq('year', year)

    if (error) {
        console.error('Error fetching completions:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ year, completions: data || [] })
}
