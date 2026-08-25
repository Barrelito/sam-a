import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAssignableStations } from '@/lib/employees/access'
import { applyEmployeeFilters, parseEmployeeFilters } from '@/lib/employees/query'
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

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

// GET /api/employees - Hämtar medarbetare som inloggad chef får se.
// Stödjer ?search=&station_id=&category=&page=&page_size=
// Svar: { employees, total, page, page_size }
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const filters = parseEmployeeFilters(searchParams)

        const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
        const requestedSize = Number.parseInt(
            searchParams.get('page_size') || String(DEFAULT_PAGE_SIZE),
            10
        )
        const pageSize = Math.min(
            MAX_PAGE_SIZE,
            Math.max(1, Number.isFinite(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE)
        )

        // RLS-policyerna på 'employees' filtrerar automatiskt vad som är synligt.
        // Filtreringen delas med PDF-exporten (se lib/employees/query.ts) så att
        // exporten alltid innehåller samma urval som listan visar.
        const baseQuery = supabase
            .from('employees')
            .select(EMPLOYEE_SELECT, { count: 'exact' })
            .order('last_name', { ascending: true })
            .order('first_name', { ascending: true })

        const { query } = await applyEmployeeFilters(supabase, baseQuery, filters)

        const from = (page - 1) * pageSize
        const { data: employees, error, count } = await query.range(from, from + pageSize - 1)

        if (error) {
            console.error('Error fetching employees:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            employees,
            total: count ?? 0,
            page,
            page_size: pageSize,
        })
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
