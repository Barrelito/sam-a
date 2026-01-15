import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase admin credentials')
    }

    return createClient(url, serviceKey)
}

// GET - List all stations
export async function GET() {
    try {
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('stations')
            .select(`
                *,
                verksamhetsomraden:vo_id (id, name)
            `)
            .order('name')

        if (error) throw error

        return NextResponse.json({ stations: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
