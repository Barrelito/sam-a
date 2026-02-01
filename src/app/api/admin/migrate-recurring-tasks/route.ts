import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Migrate existing recurring_monthly tasks to new master/instance system
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
        // Call the migration function
        const { data, error } = await supabase.rpc('migrate_recurring_monthly_to_instances')

        if (error) {
            console.error('Migration error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            migrated_count: data?.[0]?.migrated_count || 0,
            instance_count: data?.[0]?.instance_count || 0,
            message: 'Successfully migrated recurring tasks to master/instance system'
        })
    } catch (err: any) {
        console.error('Migration error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
