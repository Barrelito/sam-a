import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/overtime/reports — List all overtime reports
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: reports, error } = await supabase
      .from('overtime_reports')
      .select(`
        *,
        uploader:profiles!uploaded_by(full_name, email)
      `)
      .order('period_end', { ascending: false })

    if (error) {
      console.error('Error fetching overtime reports:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reports: reports ?? [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
