
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/employees - Get all employees visible to the current manager
export async function GET() {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch employees
        // RLS policies on 'employees' table will automatically filter visibility
        // based on station management or VO role
        const { data: employees, error } = await supabase
            .from('employees')
            .select(`
                *,
                station:stations (
                    id,
                    name,
                    vo_id
                )
            `)
            .order('last_name', { ascending: true })

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
