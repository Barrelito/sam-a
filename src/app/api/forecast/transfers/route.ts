import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/forecast/transfers - Create or update a transfer
export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { employee_id, from_station_id, to_station_id, year, week_number, hours } = body

        if (!employee_id || !from_station_id || !to_station_id || !year || !week_number || hours === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (from_station_id === to_station_id) {
            return NextResponse.json({ error: 'Cannot transfer to the same station' }, { status: 400 })
        }

        // Update or Insert logic using upsert isn't as straightforward when there's no unique constaint
        // Let's check if an exact transfer exists (same employee, from, to, week)
        const { data: existing } = await supabase
            .from('forecast_resource_transfers')
            .select('id')
            .eq('employee_id', employee_id)
            .eq('from_station_id', from_station_id)
            .eq('to_station_id', to_station_id)
            .eq('year', year)
            .eq('week_number', week_number)
            .maybeSingle()

        if (existing) {
            // Update
            const { data: updated, error: updateError } = await supabase
                .from('forecast_resource_transfers')
                .update({ hours, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single()

            if (updateError) throw updateError
            return NextResponse.json({ success: true, transfer: updated, action: 'updated' })
        } else {
            // Insert
            const { data: inserted, error: insertError } = await supabase
                .from('forecast_resource_transfers')
                .insert({
                    employee_id,
                    from_station_id,
                    to_station_id,
                    year,
                    week_number,
                    hours,
                    created_by: user.id
                })
                .select()
                .single()

            if (insertError) throw insertError
            return NextResponse.json({ success: true, transfer: inserted, action: 'inserted' })
        }

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/forecast/transfers - Delete a transfer
export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing transfer id' }, { status: 400 })
        }

        const { error } = await supabase
            .from('forecast_resource_transfers')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
