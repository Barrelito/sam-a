import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Helper to get week range
function getWeekDateRange(year: number, week: number) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dow = simple.getDay()
    const ISOweekStart = simple
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())

    const weekEnd = new Date(ISOweekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    return { start: ISOweekStart, end: weekEnd }
}

// GET /api/chefstod/newsletters/[id]/suggestions - Get AI suggestions
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Unwrap params Promise
        const { id } = await params

        // Get newsletter
        const { data: newsletter, error: nlError } = await supabase
            .from('weekly_newsletters')
            .select('*, station:stations(id, name)')
            .eq('id', id)
            .single()

        if (nlError || !newsletter) {
            return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
        }

        const { year, week_number, station_id } = newsletter
        const weekRange = getWeekDateRange(year, week_number)

        // 1. Get birthdays this week
        const { data: employees } = await supabase
            .from('employees')
            .select('id, first_name, last_name, birthdate')
            .eq('station_id', station_id)
            .not('birthdate', 'is', null)

        const birthdays = employees?.filter(emp => {
            if (!emp.birthdate) return false
            const birthDate = new Date(emp.birthdate)
            const thisYearBirthday = new Date(year, birthDate.getMonth(), birthDate.getDate())
            return thisYearBirthday >= weekRange.start && thisYearBirthday <= weekRange.end
        }).map(emp => ({
            name: `${emp.first_name} ${emp.last_name}`,
            date: emp.birthdate
        })) || []

        // 2. Get upcoming tasks for this week
        const { data: tasks } = await supabase
            .from('tasks')
            .select('id, title, due_date, category, status')
            .eq('station_id', station_id)
            .gte('due_date', weekRange.start.toISOString().split('T')[0])
            .lte('due_date', weekRange.end.toISOString().split('T')[0])
            .neq('status', 'completed')
            .order('due_date', { ascending: true })
            .limit(10)

        const upcomingTasks = tasks?.map(task => ({
            title: task.title,
            due_date: task.due_date,
            category: task.category
        })) || []

        // 3. Get task completion stats for last week
        const lastWeekStart = new Date(weekRange.start)
        lastWeekStart.setDate(lastWeekStart.getDate() - 7)
        const lastWeekEnd = new Date(weekRange.start)
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)

        const { data: completedTasks, count: completedCount } = await supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('station_id', station_id)
            .eq('status', 'completed')
            .gte('updated_at', lastWeekStart.toISOString())
            .lte('updated_at', lastWeekEnd.toISOString())

        const { data: allTasks, count: totalPending } = await supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('station_id', station_id)
            .neq('status', 'completed')

        // 4. Seasonal reminders based on month
        const month = weekRange.start.getMonth() + 1
        const seasonalReminders: string[] = []

        if (month === 1) seasonalReminders.push('Nyår - tid för mål och planering')
        if (month === 2) seasonalReminders.push('Februari - förbered utvecklingssamtal')
        if (month === 3) seasonalReminders.push('Mars - brandövning och säkerhetskontroll')
        if (month === 4) seasonalReminders.push('April - vårstädning och inventering')
        if (month === 5) seasonalReminders.push('Maj - sommarschema och semesterplanering')
        if (month === 6) seasonalReminders.push('Juni - avslut inför sommaren')
        if (month === 9) seasonalReminders.push('September - höststart och planering')
        if (month === 10) seasonalReminders.push('Oktober - höstens utbildningar')
        if (month === 11) seasonalReminders.push('November - förbered lönesamtal')
        if (month === 12) seasonalReminders.push('December - julplanering och årsavslut')

        const suggestions = {
            birthdays,
            upcomingTasks,
            seasonalReminders,
            stats: {
                completedLastWeek: completedCount || 0,
                pendingTasks: totalPending || 0
            }
        }

        // Save suggestions to newsletter
        await supabase
            .from('weekly_newsletters')
            .update({ ai_suggestions: suggestions })
            .eq('id', id)

        return NextResponse.json({ suggestions })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
