import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch checklist items for a task
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: taskId } = await params

    const { data, error } = await supabase
        .from('task_checklist_items')
        .select('*, completed_by_profile:completed_by(full_name)')
        .eq('task_id', taskId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data || [] })
}

// POST: Create a new checklist item
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: taskId } = await params
    const body = await request.json()
    const { title, sort_order } = body

    if (!title?.trim()) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('task_checklist_items')
        .insert({
            task_id: taskId,
            title: title.trim(),
            sort_order: sort_order ?? 0,
            created_by: user.id,
        })
        .select('*, completed_by_profile:completed_by(full_name)')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data }, { status: 201 })
}

// PATCH: Update a checklist item (toggle or rename)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: taskId } = await params
    const body = await request.json()
    const { item_id, is_completed, title, sort_order } = body

    if (!item_id) {
        return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title.trim()
    if (sort_order !== undefined) updates.sort_order = sort_order
    if (is_completed !== undefined) {
        updates.is_completed = is_completed
        updates.completed_at = is_completed ? new Date().toISOString() : null
        updates.completed_by = is_completed ? user.id : null
    }

    const { data, error } = await supabase
        .from('task_checklist_items')
        .update(updates)
        .eq('id', item_id)
        .eq('task_id', taskId)
        .select('*, completed_by_profile:completed_by(full_name)')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
}

// DELETE: Remove a checklist item
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: taskId } = await params
    const { searchParams } = request.nextUrl
    const itemId = searchParams.get('item_id')

    if (!itemId) {
        return NextResponse.json({ error: 'item_id query param is required' }, { status: 400 })
    }

    const { error } = await supabase
        .from('task_checklist_items')
        .delete()
        .eq('id', itemId)
        .eq('task_id', taskId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
