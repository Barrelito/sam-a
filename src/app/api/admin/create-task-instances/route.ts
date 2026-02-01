import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Create monthly task instances for current month
export async function POST() {
    const supabase = await createClient()

    // Check admin auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    try {
        // Call the instance creation function
        const { data, error } = await supabase.rpc('create_monthly_task_instances')

        if (error) {
            console.error('Instance creation error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            created_count: data?.[0] || 0,
            message: `Successfully created ${data?.[0] || 0} task instances for current month`
        })
    } catch (err: any) {
        console.error('Instance creation error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
