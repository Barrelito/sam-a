
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/admin/audit-logs
export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // Auth & Admin check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Fetch logs with user details
        const { data: logs, error } = await supabase
            .from('audit_logs')
            .select(`
                *,
                user:profiles(full_name, email)
            `)
            .order('timestamp', { ascending: false })
            .limit(100) // Limit for performance

        if (error) {
            console.error('Error fetching audit logs:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ logs })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
