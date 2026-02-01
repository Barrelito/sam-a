// API Route: /api/salary-review/employees/[id]
// Handles GET, PATCH, DELETE for individual employees

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching employee:', error)
            return NextResponse.json(
                { error: 'Employee not found' },
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

        const body = await request.json()
        const {
            employee_number,
            first_name,
            last_name,
            email,
            category,
            station_id,
            experience_level,
            current_salary,
            manager_ids // Array of manager IDs: [{ id: string, role: 'primary' | 'secondary' }]
        } = body

        // Validate required fields
        if (!first_name || !last_name || !category || !station_id) {
            return NextResponse.json(
                { error: 'Missing required fields: first_name, last_name, category, station_id' },
                { status: 400 }
            )
        }

        // Validate category
        if (!['VUB', 'SSK', 'AMB'].includes(category)) {
            return NextResponse.json(
                { error: 'Invalid category. Must be VUB, SSK, or AMB' },
                { status: 400 }
            )
        }

        // Update employee basic info
        const { data: employee, error: updateError } = await supabase
            .from('employees')
            .update({
                employee_number,
                first_name,
                last_name,
                email,
                category,
                station_id,
                experience_level,
                current_salary
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating employee:', updateError)
            return NextResponse.json(
                { error: `Failed to update employee: ${updateError.message}` },
                { status: 500 }
            )
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
                const managerRecords = manager_ids.map(m => ({
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
            .eq('id', id)
            .single()

        // Create Audit Log (Best effort)
        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'UPDATE_EMPLOYEE',
                resource_id: id,
                resource_type: 'employee',
                details: body
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
            .single()

        let hasActiveReview = false
        let reviewCount = 0

        if (activeCycle) {
            const { data: reviews, count } = await supabase
                .from('salary_reviews')
                .select('id', { count: 'exact' })
                .eq('employee_id', id)
                .eq('cycle_id', activeCycle.id)

            hasActiveReview = (count || 0) > 0
            reviewCount = count || 0
        }

        // Get total review count for all time
        const { count: totalReviews } = await supabase
            .from('salary_reviews')
            .select('id', { count: 'exact' })
            .eq('employee_id', id)

        // Delete employee (CASCADE will handle related tables)
        const { error: deleteError } = await supabase
            .from('employees')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Error deleting employee:', deleteError)
            return NextResponse.json(
                { error: `Failed to delete employee: ${deleteError.message}` },
                { status: 500 }
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
