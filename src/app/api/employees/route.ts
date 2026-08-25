import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAssignableStations } from '@/lib/employees/access'
import {
    describeEmployeeError,
    normalizeEmployeeInput,
    writeWithOptionalColumns,
} from '@/lib/employees/validation'

const EMPLOYEE_SELECT = `
    *,
    station:stations (
        id,
        name,
        vo_id
    )
`

// GET /api/employees - Hämtar alla medarbetare som inloggad chef får se.
// Stödjer valfria filter: ?station_id=<uuid>&category=<VUB|SSK|AMB>
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('station_id')
        const category = searchParams.get('category')

        // RLS-policyerna på 'employees' filtrerar automatiskt vad som är synligt
        let query = supabase
            .from('employees')
            .select(EMPLOYEE_SELECT)
            .order('last_name', { ascending: true })

        if (stationId) query = query.eq('station_id', stationId)
        if (category) query = query.eq('category', category)

        const { data: employees, error } = await query

        if (error) {
            console.error('Error fetching employees:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ employees })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/employees - Skapar en ny medarbetare direkt från medarbetarvyn.
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

        // Behörighet: användaren måste få placera medarbetare på vald station.
        // Speglar RLS och stödjer stationschef, områdeschef, VO-chef och admin.
        const { stations } = await getAssignableStations(supabase, user.id)
        if (!stations.some((s) => s.id === payload.station_id)) {
            return NextResponse.json(
                { error: 'Du har inte behörighet att lägga till medarbetare på den stationen' },
                { status: 403 }
            )
        }

        const { data: employee, error, skippedColumns } = await writeWithOptionalColumns(
            payload,
            (values) =>
                supabase
                    .from('employees')
                    .insert({
                        ...values,
                        manager_id: user.id, // NOT NULL i schemat, bakåtkompatibilitet
                    })
                    .select(EMPLOYEE_SELECT)
                    .single()
        )

        if (error) {
            console.error('Error creating employee:', error)
            const { message, status } = describeEmployeeError(error)
            return NextResponse.json({ error: message }, { status })
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createdId = (employee as any)?.id

        // Koppla skaparen som huvudchef (bästa försök - medarbetaren finns redan)
        if (createdId) {
            const { error: managerError } = await supabase
                .from('employee_managers')
                .insert({ employee_id: createdId, manager_id: user.id, role: 'primary' })

            if (managerError && managerError.code !== '23505') {
                console.error('Error creating employee manager relationship:', managerError)
            }
        }

        // Audit log (bästa försök)
        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'CREATE_EMPLOYEE',
                resource_id: createdId,
                resource_type: 'employee',
                details: { fields: Object.keys(payload), via: 'api/employees' },
            })
        } catch (e) {
            console.warn('Audit log failed', e)
        }

        return NextResponse.json(
            { employee, skipped_columns: skippedColumns.length ? skippedColumns : undefined },
            { status: 201 }
        )
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
