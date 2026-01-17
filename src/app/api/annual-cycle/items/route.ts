
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const supabase = await createClient()

    // Get current month if not specified? 
    // Or just return all? Or filter by query param?
    // Let's support filtering by month if provided, else all.

    // Actually, for the dashboard we might want just current month or a specific month.
    // The previous component logic wanted current month.

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
