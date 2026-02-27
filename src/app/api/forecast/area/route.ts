import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const year = searchParams.get('year')

        if (!year) {
            return NextResponse.json({ error: 'Missing year parameter' }, { status: 400 })
        }

        // Fetch user profile to get vo_id
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('vo_id, role')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        const voId = profile.vo_id;

        if (!voId) {
            return NextResponse.json({ error: 'User does not belong to a VO' }, { status: 403 })
        }

        // 1. Fetch stations for this VO
        const { data: stations, error: stationsError } = await supabase
            .from('stations')
            .select('id, name')
            .eq('vo_id', voId)
            .order('name')

        if (stationsError) {
            return NextResponse.json({ error: stationsError.message }, { status: 500 })
        }

        const stationIds = stations.map(s => s.id)

        if (stationIds.length === 0) {
            return NextResponse.json({ stations: [], employees: [], transfers: [] })
        }

        // 2. Fetch employees for these stations
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('*')
            .in('station_id', stationIds)

        if (empError) {
            return NextResponse.json({ error: empError.message }, { status: 500 })
        }

        const employeeIds = employees.map(emp => emp.id)

        // 3. Fetch exceptions for these employees
        let exceptions: any[] = []
        if (employeeIds.length > 0) {
            const { data: exceptionsData } = await supabase
                .from('forecast_exceptions')
                .select('*')
                .eq('year', parseInt(year))
                .in('employee_id', employeeIds)

            exceptions = exceptionsData || []
        }

        // Map exceptions to employees
        const employeesWithExceptions = employees.map(emp => ({
            ...emp,
            exceptions: exceptions.filter(exc => exc.employee_id === emp.id)
        }))

        // 4. Fetch resource transfers affecting these stations
        // Either FROM these stations or TO these stations
        const { data: transfers, error: transferError } = await supabase
            .from('forecast_resource_transfers')
            .select(`
                *,
                employee:employees(first_name, last_name, category)
            `)
            .eq('year', parseInt(year))
            .or(`from_station_id.in.(${stationIds.join(',')}),to_station_id.in.(${stationIds.join(',')})`)

        if (transferError) {
            return NextResponse.json({ error: transferError.message }, { status: 500 })
        }

        return NextResponse.json({
            stations,
            employees: employeesWithExceptions,
            transfers: transfers || []
        })

    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
