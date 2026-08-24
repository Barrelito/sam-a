
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Returns all annual cycle templates, optionally filtered by month
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    let query = supabase.from('annual_cycle_items').select('*')

    if (month) {
        query = query.eq('month', parseInt(month))
    }

    query = query.order('month', { ascending: true })

    const { data, error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data })
}
