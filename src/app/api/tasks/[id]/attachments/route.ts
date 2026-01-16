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

    // Get attachments for task
    const { data: attachments, error } = await supabase
        .from('task_attachments')
        .select(`
            *,
            uploaded_by_profile:uploaded_by(id, full_name, email)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching attachments:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ attachments })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id: taskId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `tasks/${taskId}/${timestamp}_${safeName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file)

    if (uploadError) {
        console.error('Error uploading file:', uploadError)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Create attachment record
    const { data: attachment, error } = await supabase
        .from('task_attachments')
        .insert({
            task_id: taskId,
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            content_type: file.type,
            uploaded_by: user.id,
        })
        .select(`
            *,
            uploaded_by_profile:uploaded_by(id, full_name, email)
        `)
        .single()

    if (error) {
        console.error('Error creating attachment record:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ attachment }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { id: taskId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get attachment ID from query params
    const searchParams = request.nextUrl.searchParams
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
        return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 })
    }

    // Get attachment to get file path
    const { data: attachment } = await supabase
        .from('task_attachments')
        .select('file_path')
        .eq('id', attachmentId)
        .eq('task_id', taskId)
        .single()

    if (!attachment) {
        return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Delete from storage
    await supabase.storage
        .from('attachments')
        .remove([attachment.file_path])

    // Delete record
    const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId)

    if (error) {
        console.error('Error deleting attachment:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
