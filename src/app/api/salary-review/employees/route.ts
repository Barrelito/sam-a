// API Route: GET /api/salary-review/employees
// Hämtar medarbetare för inloggad chef

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAssignableStations } from '@/lib/employees/access'
import {
    describeEmployeeError,
    normalizeEmployeeInput,
    writeWithOptionalColumns,
} from '@/lib/employees/validation'

export async function GET() {
    try {
        const supabase = await createClient()

        // Verifiera att användaren är autentiserad
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Hämta medarbetare (RLS hanterar behörigheter)
        // Station managers ser sina egna, VO chiefs ser alla i sina VO
        const { data: employees, error } = await supabase
            .from('employees')
            .select(`
        *,
        station:stations (
          id,
          name,
          vo_id
        ),
        managers:employee_managers (
          manager:profiles (
            id,
            full_name,
            email
          ),
          role
        )
      `)
            .order('last_name', { ascending: true })

        if (error) {
            console.error('Error fetching employees:', error)
            return NextResponse.json(
                { error: 'Failed to fetch employees' },
                { status: 500 }
            )
        }

        return NextResponse.json({ employees })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// API Route: POST /api/salary-review/employees
// Registrerar ny medarbetare

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Verifiera att användaren är autentiserad
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        let body: unknown
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Ogiltig data' }, { status: 400 })
        }

        const { payload, error: validationError } = normalizeEmployeeInput(body, { requireAll: true })
        if (validationError) {
            return NextResponse.json({ error: validationError }, { status: 400 })
        }

        // Verifiera att användaren har tillgång till stationen.
        // Speglar RLS och fungerar även för områdeschefer (stationsområden),
        // VO-chefer och admin - inte bara direkta user_stations-kopplingar.
        const { stations } = await getAssignableStations(supabase, user.id)
        if (!stations.some((s) => s.id === payload.station_id)) {
            return NextResponse.json(
                { error: 'Du har inte behörighet att lägga till medarbetare på den stationen' },
                { status: 403 }
            )
        }

        // Skapa medarbetare
        const { data: employee, error } = await writeWithOptionalColumns(payload, (values) =>
            supabase
                .from('employees')
                .insert({
                    ...values,
                    manager_id: user.id, // Keep for backwards compatibility
                })
                .select(`
        *,
        station:stations (
          id,
          name,
          vo_id
        )
      `)
                .single()
        )

        if (error) {
            console.error('Error creating employee:', error)
            const { message, status } = describeEmployeeError(error)
            return NextResponse.json({ error: message }, { status })
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createdId = (employee as any)?.id

        // Create entry in employee_managers junction table
        if (createdId) {
            const { error: managerError } = await supabase
                .from('employee_managers')
                .insert({
                    employee_id: createdId,
                    manager_id: user.id,
                    role: 'primary'
                })

            if (managerError && managerError.code !== '23505') {
                console.error('Error creating employee manager relationship:', managerError)
                // Don't fail the whole request, employee is already created
            }
        }

        // Audit log (bästa försök)
        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'CREATE_EMPLOYEE',
                resource_id: createdId,
                resource_type: 'employee',
                details: { fields: Object.keys(payload), via: 'api/salary-review/employees' }
            })
        } catch (e) {
            console.warn('Audit log failed', e)
        }

        return NextResponse.json({ employee }, { status: 201 })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
