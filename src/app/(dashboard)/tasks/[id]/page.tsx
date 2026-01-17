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
        // HANDLE ANNUAL CYCLE TASKS
        if (task?.id.startsWith('annual-') && task.is_annual_cycle) {
            const targetId = await ensureRealTask({ status })
            if (targetId) {
                // Redirect is handled in ensureRealTask usually, but if we want to be safe:
                // router.push is called there.
                // We might want to reload or just let the redirect happen.
            }
            return
        }

        // REGULAR TASKS
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        })
        if (res.ok) {
            await loadTask()
            router.refresh()
        }
    }

    // Helper to materialize task if needed
    const ensureRealTask = async (overrides: Partial<Task> = {}): Promise<string | null> => {
        if (!task) return null
        if (!task.id.startsWith('annual-')) return task.id

        // Materialize logic
        const stationId = profile?.user_stations?.[0]?.station?.id
        if (!stationId && profile?.role !== 'admin' && profile?.role !== 'vo_chief') {
            setError("Du måste ha en station för att spara denna uppgift.")
            return null
        }

        // Map categories (Annual cycle uses lowercase, Task table uses Capitalized)
        let mappedCategory = task.category
        if (task.category.toLowerCase() === 'hr') mappedCategory = 'HR'
        else if (task.category.toLowerCase() === 'finance') mappedCategory = 'Finance'
        else if (task.category.toLowerCase() === 'safety') mappedCategory = 'Safety'
        else if (task.category.toLowerCase() === 'operations' || task.category.toLowerCase() === 'drift') mappedCategory = 'Operations'

        const payload = {
            title: task.title,
            description: task.description,
            category: mappedCategory,
            owner_type: 'station',
            station_id: stationId,
            // annual_cycle_item_id: REMOVED per user request to decouple from SQL fix
            year: task.year || new Date().getFullYear(),
            start_month: task.start_month,
            deadline_day: task.deadline_day,
            status: task.status === 'not_started' ? 'todo' : task.status === 'in_progress' ? 'in_progress' : 'completed',
            ...overrides
        }

        // Map overrides for status specifically if passed (TaskStatus vs API string)
        if (overrides.status) {
            // Explicitly cast to API compatible string if needed needed, but API usually handles matching strings
            // Our API expects 'todo', 'in_progress', 'completed' usually? 
            // Wait, our TaskStatus type is 'not_started' | 'in_progress' | 'done' | 'reported'
            // DB enum in tasks table? Let's check api/tasks/route.ts
            // POST route just takes the string. 
            // tasks table constraint usually "tasks_status_check" CHECK (status = ANY (ARRAY['todo'::text, 'not_started'::text, 'in_progress'::text, 'done'::text, 'completed'::text, 'reported'::text])) 
            // Actually let's just pass it as is, or map it if it's 'not_started' -> 'todo' if we want to be safe.
        }

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                const data = await res.json()
                const newId = data.task.id
                // Updates URL silently so we can continue working
                window.history.replaceState(null, '', `/tasks/${newId}`)
                // Also force a reload of the task data or router push to be sure
                // Using router.push to ensure full state refresh
                router.push(`/tasks/${newId}`)
                return newId
            } else {
                const err = await res.json()
                setError("Kunde inte spara uppgiften: " + err.error)
            }
        } catch (e) {
            console.error(e)
            setError("Ett fel uppstod vid sparande.")
        }
        return null
    }

    const handleAddComment = async (content: string) => {
        const targetId = await ensureRealTask()
        if (!targetId) return

        const res = await fetch(`/api/tasks/${targetId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        })
        if (res.ok) {
            router.push(`/tasks/${targetId}`) // Force full reload to get fresh state
        }
    }

    const handleUploadFile = async (file: File) => {
        const targetId = await ensureRealTask()
        if (!targetId) return

        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`/api/tasks/${targetId}/attachments`, {
            method: 'POST',
            body: formData,
        })
        if (res.ok) {
            router.push(`/tasks/${targetId}`)
        }
    }

    const handleDeleteAttachment = async (attachmentId: string) => {
        // Only real tasks have attachments, so no check needed usually
        const res = await fetch(`/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`, {
            method: 'DELETE',
        })
        if (res.ok) {
            await loadTask()
        }
    }

    const handleUpdateNotes = async (notes: string) => {
        const targetId = await ensureRealTask()
        if (!targetId) return

        const res = await fetch(`/api/tasks/${targetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes }),
        })
        if (res.ok) {
            router.push(`/tasks/${targetId}`)
        }
    }

    const handleUpdateTask = async (updates: Partial<typeof task>) => {
        if (!task) return

        // HANDLE VIRTUAL TASKS: "Materialize" them into real tasks on first edit
        if (task.id.startsWith('annual-') && task.is_annual_cycle) {
            // We need to create a new task based on the virtual one + updates
            const stationId = profile?.user_stations?.[0]?.station?.id // Default to user's first station

            if (!stationId && profile?.role !== 'admin' && profile?.role !== 'vo_chief') {
                setError("Du måste ha en station för att spara denna uppgift.")
                return
            }

            // Map categories (Annual cycle uses lowercase, Task table uses Capitalized)
            let mappedCategory = task.category
            if (task.category.toLowerCase() === 'hr') mappedCategory = 'HR'
            else if (task.category.toLowerCase() === 'finance') mappedCategory = 'Finance'
            else if (task.category.toLowerCase() === 'safety') mappedCategory = 'Safety'
            else if (task.category.toLowerCase() === 'operations' || task.category.toLowerCase() === 'drift') mappedCategory = 'Operations'

            const payload = {
                title: task.title,
                description: task.description,
                category: mappedCategory,
                owner_type: 'station', // Defaulting to station task for managers
                station_id: stationId,
                station_id: stationId,
                // annual_cycle_item_id: REMOVED per user request to decouple from SQL fix
                year: task.year || new Date().getFullYear(),
                start_month: task.start_month,
                deadline_day: task.deadline_day,
                // Overwrite with updates
                ...updates
            }

            try {
                const res = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })

                if (res.ok) {
                    const data = await res.json()
                    // Redirect to the NEW real task ID
                    router.push(`/tasks/${data.task.id}`)
                } else {
                    const err = await res.json()
                    console.error("Failed to materialize task:", err)
                    setError("Kunde inte skapa uppgiften: " + err.error)
                }
            } catch (e) {
                console.error(e)
                setError("Ett fel uppstod.")
            }
            return
        }

        // STANDARD UPDATE for existing real tasks
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        })
        if (res.ok) {
            await loadTask()
            router.refresh()
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
