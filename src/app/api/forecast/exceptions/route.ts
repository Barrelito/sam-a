import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/forecast/exceptions - Upsert or Delete an exception
export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { employee_id, year, week_number, hours } = body

        if (!employee_id || !year || !week_number) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (hours === null || hours === undefined) {
            // Delete the exception if hours is null (revert to standard)
            const { error: deleteError } = await supabase
                .from('forecast_exceptions')
                .delete()
                .eq('employee_id', employee_id)
                .eq('year', year)
                .eq('week_number', week_number)

            if (deleteError) {
                console.error('Error deleting exception:', deleteError)
                return NextResponse.json({ error: deleteError.message }, { status: 500 })
            }
            return NextResponse.json({ success: true, action: 'deleted' })
        }

        // Check if exists
        const { data: existing, error: checkError } = await supabase
            .from('forecast_exceptions')
            .select('id')
            .eq('employee_id', employee_id)
            .eq('year', year)
            .eq('week_number', week_number)
            .maybeSingle()

        if (checkError) {
            console.error('Error checking existing exception:', checkError)
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (existing) {
            // Update
            const { data: updated, error: updateError } = await supabase
                .from('forecast_exceptions')
                .update({ hours, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single()

            if (updateError) {
                console.error('Error updating exception:', updateError)
                return NextResponse.json({ error: updateError.message }, { status: 500 })
            }
            return NextResponse.json({ success: true, exception: updated, action: 'updated' })
        } else {
            // Insert
            const { data: inserted, error: insertError } = await supabase
                .from('forecast_exceptions')
                .insert({
                    employee_id,
                    year,
                    week_number,
                    hours
                })
                .select()
                .single()

            if (insertError) {
                console.error('Error inserting exception:', insertError)
                return NextResponse.json({ error: insertError.message }, { status: 500 })
            }
            return NextResponse.json({ success: true, exception: inserted, action: 'inserted' })
        }
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
