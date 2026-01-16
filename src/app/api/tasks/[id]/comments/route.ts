import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const { id: taskId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get comments for task
    const { data: comments, error } = await supabase
        .from('task_comments')
        .select(`
            *,
            user:user_id(id, full_name, email)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching comments:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comments })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id: taskId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Create comment
    const { data: comment, error } = await supabase
        .from('task_comments')
        .insert({
            task_id: taskId,
            user_id: user.id,
            content: content.trim(),
        })
        .select(`
            *,
            user:user_id(id, full_name, email)
        `)
        .single()

    if (error) {
        console.error('Error creating comment:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comment }, { status: 201 })
}
