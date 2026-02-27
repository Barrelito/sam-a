import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/forecast/employees - List employees for a station with their exceptions
export async function GET(req: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const stationId = searchParams.get('station_id')
        const year = searchParams.get('year')

        if (!stationId || !year) {
            return NextResponse.json({ error: 'Missing station_id or year' }, { status: 400 })
        }

        // 1. Fetch employees
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('station_id', stationId)
            .order('first_name', { ascending: true })

        if (empError) {
            console.error('Error fetching employees:', empError)
            return NextResponse.json({ error: empError.message }, { status: 500 })
        }

        // 2. Fetch exceptions for these employees for this year
        const employeeIds = employees.map(emp => emp.id)

        let exceptions: any[] = []
        if (employeeIds.length > 0) {
            const { data: exceptionsData, error: excError } = await supabase
                .from('forecast_exceptions')
                .select('*')
                .eq('year', parseInt(year))
                .in('employee_id', employeeIds)

            if (excError) {
                console.error('Error fetching exceptions:', excError)
                // Proceed without exceptions rather than failing completely
            } else {
                exceptions = exceptionsData || []
            }
        }

        // 3. Stitch together
        const employeesWithExceptions = employees.map(emp => ({
            ...emp,
            exceptions: exceptions.filter(exc => exc.employee_id === emp.id)
        }))

        return NextResponse.json({ employees: employeesWithExceptions })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH /api/forecast/employees - Update employment_rate or night_share for an employee
export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { employee_id, employment_rate, night_share } = body

        if (!employee_id) {
            return NextResponse.json({ error: 'Missing employee_id' }, { status: 400 })
        }

        // Only update provided fields
        const updateData: any = {}
        if (employment_rate !== undefined) updateData.employment_rate = employment_rate
        if (night_share !== undefined) updateData.night_share = night_share

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
        }

        const { data: updatedEmployee, error: updateError } = await supabase
            .from('employees')
            .update(updateData)
            .eq('id', employee_id)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating employee:', updateError)
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ employee: updatedEmployee })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
