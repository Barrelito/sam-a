// API Route: /api/salary-review/employees/[id]
// Handles GET, PATCH, DELETE for individual employees

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
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

// GET /api/salary-review/employees/[id]
// Fetch a single employee with managers and station details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id } = await params

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Fetch employee with managers and station
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
            return NextResponse.json(
                { error: 'Medarbetaren hittades inte' },
                { status: 404 }
            )
        }

        // Create Audit Log (Best effort)
        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'VIEW_EMPLOYEE',
                resource_id: id,
                resource_type: 'employee',
                details: { via: 'api/salary-review/employees/[id]' }
            })
        } catch (e) {
            console.warn('Audit log failed', e)
        }

        return NextResponse.json({ employee })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH /api/salary-review/employees/[id]
// Update employee information and managers
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id } = await params

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        let body: Record<string, unknown>
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Ogiltig data' }, { status: 400 })
        }

        // Array of manager IDs: [{ id: string, role: 'primary' | 'secondary' }]
        const manager_ids = body.manager_ids

        const { payload, error: validationError } = normalizeEmployeeInput(body, { requireAll: false })
        if (validationError) {
            return NextResponse.json({ error: validationError }, { status: 400 })
        }

        if (Object.keys(payload).length === 0 && !Array.isArray(manager_ids)) {
            return NextResponse.json({ error: 'Inga fält att uppdatera' }, { status: 400 })
        }

        // Byte av station: verifiera behörighet till den nya stationen
        if (payload.station_id) {
            const { stations } = await getAssignableStations(supabase, user.id)
            if (!stations.some((s) => s.id === payload.station_id)) {
                return NextResponse.json(
                    { error: 'Du har inte behörighet till den valda stationen' },
                    { status: 403 }
                )
            }
        }

        // Update employee basic info
        if (Object.keys(payload).length > 0) {
            const { data: updatedRow, error: updateError } = await writeWithOptionalColumns(
                payload,
                (values) =>
                    supabase.from('employees').update(values).eq('id', id).select('id').maybeSingle()
            )

            if (updateError) {
                console.error('Error updating employee:', updateError)
                const { message, status } = describeEmployeeError(updateError)
                return NextResponse.json({ error: message }, { status })
            }

            // Update utan fel men utan träffad rad = RLS blockerade skrivningen
            if (!updatedRow) {
                return NextResponse.json(
                    { error: 'Medarbetaren hittades inte eller så saknar du behörighet att ändra den' },
                    { status: 403 }
                )
            }
        }

        // Update managers if provided
        if (manager_ids && Array.isArray(manager_ids)) {
            // Delete existing manager relationships
            await supabase
                .from('employee_managers')
                .delete()
                .eq('employee_id', id)

            // Insert new manager relationships
            if (manager_ids.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const managerRecords = manager_ids.map((m: any) => ({
                    employee_id: id,
                    manager_id: m.id,
                    role: m.role || 'primary'
                }))

                const { error: managersError } = await supabase
                    .from('employee_managers')
                    .insert(managerRecords)

                if (managersError) {
                    console.error('Error updating managers:', managersError)
                    // Don't fail the whole request, just log the error
                }
            }
        }

        // Fetch updated employee with managers
        const { data: updatedEmployee } = await supabase
            .from('employees')
            .select(EMPLOYEE_SELECT)
            .eq('id', id)
            .maybeSingle()

        // Tom rad efter lyckad update = RLS blockerade skrivningen
        if (!updatedEmployee) {
            return NextResponse.json(
                { error: 'Medarbetaren hittades inte eller så saknar du behörighet' },
                { status: 404 }
            )
        }

        // Create Audit Log (Best effort) - loggar vilka fält som ändrats, inte värdena
        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'UPDATE_EMPLOYEE',
                resource_id: id,
                resource_type: 'employee',
                details: {
                    fields: Object.keys(payload),
                    managers_changed: Array.isArray(manager_ids),
                    via: 'api/salary-review/employees/[id]'
                }
            })
        } catch (e) {
            console.warn('Audit log failed', e)
        }

        return NextResponse.json({ employee: updatedEmployee })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE /api/salary-review/employees/[id]
// Delete employee (cascade deletes all related data)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id } = await params

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check if employee has active salary reviews (for warning purposes)
        const { data: activeCycle } = await supabase
            .from('salary_review_cycles')
            .select('id')
            .eq('status', 'active')
            .maybeSingle()

        let hasActiveReview = false

        if (activeCycle) {
            const { count } = await supabase
                .from('salary_reviews')
                .select('id', { count: 'exact', head: true })
                .eq('employee_id', id)
                .eq('cycle_id', activeCycle.id)

            hasActiveReview = (count || 0) > 0
        }

        // Get total review count for all time
        const { count: totalReviews } = await supabase
            .from('salary_reviews')
            .select('id', { count: 'exact', head: true })
            .eq('employee_id', id)

        // Delete employee (CASCADE will handle related tables)
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

        // Create Audit Log (Best effort)
        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'DELETE_EMPLOYEE',
                resource_id: id,
                resource_type: 'employee',
                details: {
                    had_active_review: hasActiveReview,
                    total_reviews_deleted: totalReviews || 0
                }
            })
        } catch (e) {
            console.warn('Audit log failed', e)
        }

        return NextResponse.json({
            success: true,
            message: 'Employee deleted successfully',
            cascade_info: {
                had_active_review: hasActiveReview,
                total_reviews_deleted: totalReviews || 0
            }
        })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
