import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/guard'

function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase admin credentials')
    }

    return createClient(url, serviceKey)
}

// GET - List all verksamhetsområden
export async function GET() {
    try {
        const guard = await requireRole(['admin'])
        if (!guard.ok) return guard.response

        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('verksamhetsomraden')
            .select('*')
            .order('name')

        if (error) throw error

        return NextResponse.json({ verksamhetsomraden: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
