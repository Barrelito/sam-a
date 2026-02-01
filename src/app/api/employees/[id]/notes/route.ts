
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/employees/[id]/notes - Get all notes for an employee
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { id: employeeId } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: notes, error } = await supabase
        .from('employee_notes')
        .select(`
            *,
            author:created_by(id, full_name, role)
        `)
        .eq('employee_id', employeeId)
        .order('event_date', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching notes:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notes })
}

// POST /api/employees/[id]/notes - Create a new note
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id: employeeId } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { content, note_type, event_date } = body

    if (!content) {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { data: note, error } = await supabase
        .from('employee_notes')
        .insert({
            employee_id: employeeId,
            content,
            note_type: note_type || 'general',
            event_date: event_date || new Date().toISOString().split('T')[0],
            created_by: user.id
        })
        .select(`
            *,
            author:created_by(id, full_name, role)
        `)
        .single()

    if (error) {
        console.error('Error creating note:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ note }, { status: 201 })
}
