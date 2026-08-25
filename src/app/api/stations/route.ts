import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAssignableStations } from '@/lib/employees/access'

// GET /api/stations
// Returnerar de stationer som inloggad användare får placera medarbetare på.
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { stations, role } = await getAssignableStations(supabase, user.id)

        return NextResponse.json({ stations, role })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
