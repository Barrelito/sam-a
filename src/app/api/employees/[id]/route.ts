import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAssignableStations } from '@/lib/employees/access'
import {
    describeEmployeeError,
    normalizeEmployeeInput,
    writeWithOptionalColumns,
} from '@/lib/employees/validation'

interface RouteParams {
    params: Promise<{ id: string }>
}

const EMPLOYEE_SELECT = `
    *,
    station:stations (
        id,
        name,
        vo_id
    ),
    managers:employee_managers (
        role,
        manager:profiles (
            id,
            full_name,
            email
        )
    )
`

// GET /api/employees/[id] - Hämtar en medarbetares personakt.
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = await createClient()
        const { id } = await params

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: employee, error } = await supabase
            .from('employees')
            .select(EMPLOYEE_SELECT)
            .eq('id', id)
            .maybeSingle()

        if (error) {
            console.error('Error fetching employee:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!employee) {
            // RLS döljer medarbetare man inte har behörighet till - därav 404
            return NextResponse.json({ error: 'Medarbetaren hittades inte' }, { status: 404 })
        }

        // Audit log (bästa försök) - personakter är känsliga personuppgifter
        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'VIEW_EMPLOYEE',
                resource_id: id,
                resource_type: 'employee',
                details: { via: 'api/employees/[id]' },
            })
        } catch (e) {
            console.warn('Audit log failed', e)
        }

        return NextResponse.json({ employee })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH /api/employees/[id] - Uppdaterar en medarbetares uppgifter.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = await createClient()
        const { id } = await params

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

        const { payload, error: validationError } = normalizeEmployeeInput(body, { requireAll: false })
        if (validationError) {
            return NextResponse.json({ error: validationError }, { status: 400 })
        }

        if (Object.keys(payload).length === 0) {
            return NextResponse.json({ error: 'Inga fält att uppdatera' }, { status: 400 })
        }

        // Byte av station: verifiera att användaren får placera på den nya stationen,
        // annars kan man av misstag flytta bort en medarbetare ur sin egen behörighet.
        if (payload.station_id) {
            const { stations } = await getAssignableStations(supabase, user.id)
            if (!stations.some((s) => s.id === payload.station_id)) {
                return NextResponse.json(
                    { error: 'Du har inte behörighet till den valda stationen' },
                    { status: 403 }
                )
            }
        }

        const { data: updatedRow, error, skippedColumns } = await writeWithOptionalColumns(
            payload,
            (values) =>
                supabase.from('employees').update(values).eq('id', id).select('id').maybeSingle()
        )

        if (error) {
            console.error('Error updating employee:', error)
            const { message, status } = describeEmployeeError(error)
            return NextResponse.json({ error: message }, { status })
        }

        // Update utan fel men utan träffad rad = RLS blockerade skrivningen.
        // Utan denna koll skulle vi svara 200 OK på en sparning som inte skedde.
        if (!updatedRow) {
            return NextResponse.json(
                { error: 'Medarbetaren hittades inte eller så saknar du behörighet att ändra den' },
                { status: 403 }
            )
        }

        const { data: updatedEmployee } = await supabase
            .from('employees')
            .select(EMPLOYEE_SELECT)
            .eq('id', id)
            .maybeSingle()

        if (!updatedEmployee) {
            return NextResponse.json(
                { error: 'Medarbetaren hittades inte eller så saknar du behörighet' },
                { status: 404 }
            )
        }

        // Audit log (bästa försök) - loggar vilka fält som ändrats, inte värdena
        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'UPDATE_EMPLOYEE',
                resource_id: id,
                resource_type: 'employee',
                details: { fields: Object.keys(payload), via: 'api/employees/[id]' },
            })
        } catch (e) {
            console.warn('Audit log failed', e)
        }

        return NextResponse.json({
            employee: updatedEmployee,
            skipped_columns: skippedColumns.length ? skippedColumns : undefined,
        })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/employees/[id] - Tar bort en medarbetare (kaskad på relaterad data).
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = await createClient()
        const { id } = await params

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Hur mycket data följer med? (används i svaret och audit-loggen)
        const { count: totalReviews } = await supabase
            .from('salary_reviews')
            .select('id', { count: 'exact', head: true })
            .eq('employee_id', id)

        const { count: totalNotes } = await supabase
            .from('employee_notes')
            .select('id', { count: 'exact', head: true })
            .eq('employee_id', id)

        const { data: deleted, error: deleteError } = await supabase
            .from('employees')
            .delete()
            .eq('id', id)
            .select('id')

        if (deleteError) {
            console.error('Error deleting employee:', deleteError)
            const { message, status } = describeEmployeeError(deleteError)
            return NextResponse.json({ error: message }, { status })
        }

        // RLS returnerar tomt resultat istället för fel när raden inte får raderas
        if (!deleted || deleted.length === 0) {
            return NextResponse.json(
                { error: 'Medarbetaren hittades inte eller så saknar du behörighet' },
                { status: 404 }
            )
        }

        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'DELETE_EMPLOYEE',
                resource_id: id,
                resource_type: 'employee',
                details: {
                    total_reviews_deleted: totalReviews || 0,
                    total_notes_deleted: totalNotes || 0,
                    via: 'api/employees/[id]',
                },
            })
        } catch (e) {
            console.warn('Audit log failed', e)
        }

        return NextResponse.json({
            success: true,
            cascade_info: {
                total_reviews_deleted: totalReviews || 0,
                total_notes_deleted: totalNotes || 0,
            },
        })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
