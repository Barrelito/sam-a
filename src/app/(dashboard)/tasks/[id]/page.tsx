"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Task, TaskStatus } from "@/lib/types"
import { TaskDetailView } from "@/components/task-detail-view"
import { DistributeDialog } from "@/components/distribute-dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, Loader2, Trash2, Share2 } from "lucide-react"

export default function TaskDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()
    const [task, setTask] = useState<Task | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showDistributeDialog, setShowDistributeDialog] = useState(false)

    const taskId = params.id as string

    const loadTask = async () => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`)
            if (!res.ok) throw new Error('Failed to load task')
            const data = await res.json()
            setTask(data.task)
        } catch (err) {
            setError('Kunde inte ladda uppgiften')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadTask()
    }, [taskId])

    const handleStatusChange = async (status: TaskStatus) => {
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        })
        if (res.ok) {
            await loadTask()
        }
    }

    const handleAddComment = async (content: string) => {
        const res = await fetch(`/api/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        })
        if (res.ok) {
            await loadTask()
        }
    }

    const handleUploadFile = async (file: File) => {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`/api/tasks/${taskId}/attachments`, {
            method: 'POST',
            body: formData,
        })
        if (res.ok) {
            await loadTask()
        }
    }

    const handleDeleteAttachment = async (attachmentId: string) => {
        const res = await fetch(`/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`, {
            method: 'DELETE',
        })
        if (res.ok) {
            await loadTask()
        }
    }

    const handleUpdateNotes = async (notes: string) => {
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes }),
        })
        if (res.ok) {
            await loadTask()
        }
    }

    const handleUpdateTask = async (updates: Partial<typeof task>) => {
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        })
        if (res.ok) {
            await loadTask()
        }
    }

    const handleVOReview = async (reviewed: boolean, comment?: string) => {
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vo_reviewed: reviewed,
                vo_comment: comment
            }),
        })
        if (res.ok) {
            await loadTask()
        }
    }

    const handleDelete = async () => {
        if (!confirm('Är du säker på att du vill ta bort denna uppgift?')) return

        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
        })
        if (res.ok) {
            router.push('/tasks')
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !task) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tillbaka
                </Button>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{error || 'Uppgiften hittades inte'}</p>
                </div>
            </div>
        )
    }

    // Check if this is a VO task that can be distributed
    const canDistribute = task.owner_type === 'vo' &&
        (profile?.role === 'vo_chief' || profile?.role === 'admin')

    return (
        <div className="space-y-6">
            {/* Back button and actions */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tillbaka
                </Button>

                <div className="flex items-center gap-2">
                    {/* Distribute button for VO tasks */}
                    {canDistribute && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setShowDistributeDialog(true)}
                        >
                            <Share2 className="h-4 w-4 mr-2" />
                            Fördela till stationer
                        </Button>
                    )}

                    {/* Delete button */}
                    {(profile?.id === task.created_by || profile?.role === 'vo_chief' || profile?.role === 'admin') && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDelete}
                            className="text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Ta bort
                        </Button>
                    )}
                </div>
            </div>

            <TaskDetailView
                task={task}
                userRole={profile?.role || 'assistant_manager'}
                userId={profile?.id}
                onStatusChange={handleStatusChange}
                onAddComment={handleAddComment}
                onUploadFile={handleUploadFile}
                onDeleteAttachment={handleDeleteAttachment}
                onUpdateNotes={handleUpdateNotes}
                onUpdateTask={handleUpdateTask}
                onVOReview={profile?.role === 'vo_chief' || profile?.role === 'admin' ? handleVOReview : undefined}
            />

            {/* Distribute Dialog */}
            {canDistribute && task.vo_id && (
                <DistributeDialog
                    open={showDistributeDialog}
                    onOpenChange={setShowDistributeDialog}
                    task={{
                        id: task.id,
                        title: task.title,
                        vo_id: task.vo_id
                    }}
                    onSuccess={() => {
                        setShowDistributeDialog(false)
                        loadTask()
                    }}
                />
            )}
        </div>
    )
}
