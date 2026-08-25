
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

const NOTE_TYPES = ['general', 'performance', 'check_in', 'incident', 'development'] as const

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

    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Ogiltig data' }, { status: 400 })
    }

    const content = typeof body.content === 'string' ? body.content.trim() : ''
    const noteType = typeof body.note_type === 'string' ? body.note_type : 'general'
    const eventDate = typeof body.event_date === 'string' && body.event_date ? body.event_date : null

    if (!content) {
        return NextResponse.json({ error: 'Anteckningen får inte vara tom' }, { status: 400 })
    }

    if (content.length > 10000) {
        return NextResponse.json({ error: 'Anteckningen är för lång (max 10 000 tecken)' }, { status: 400 })
    }

    if (!(NOTE_TYPES as readonly string[]).includes(noteType)) {
        return NextResponse.json({ error: 'Ogiltig anteckningstyp' }, { status: 400 })
    }

    if (eventDate && Number.isNaN(Date.parse(eventDate))) {
        return NextResponse.json({ error: 'Ogiltigt datum' }, { status: 400 })
    }

    const { data: note, error } = await supabase
        .from('employee_notes')
        .insert({
            employee_id: employeeId,
            content,
            note_type: noteType,
            event_date: eventDate || new Date().toISOString().split('T')[0],
            created_by: user.id
        })
        .select(`
            *,
            author:created_by(id, full_name, role)
        `)
        .single()

    if (error) {
        console.error('Error creating note:', error)

        // RLS-avslag ska inte se ut som ett serverfel
        if (error.code === '42501' || error.code === 'PGRST301') {
            return NextResponse.json(
                { error: 'Du saknar behörighet att skriva i den här personakten' },
                { status: 403 }
            )
        }
        if (error.code === '23503') {
            return NextResponse.json({ error: 'Medarbetaren hittades inte' }, { status: 404 })
        }

        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log (bästa försök) - loggboken innehåller känsliga personuppgifter
    try {
        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'CREATE_EMPLOYEE_NOTE',
            resource_id: employeeId,
            resource_type: 'employee_note',
            details: { note_type: noteType }
        })
    } catch (e) {
        console.warn('Audit log failed', e)
    }

    return NextResponse.json({ note }, { status: 201 })
}
