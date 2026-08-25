"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Task, TaskStatus } from "@/lib/types"
import { TaskDetailView } from "@/components/task-detail-view"
import { DistributeDialog } from "@/components/distribute-dialog"
import { EditTaskDialog } from "@/components/edit-task-dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, Loader2, Trash2, Share2, Edit, GitBranch, CheckCircle2, Clock, Circle, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function TaskDetailPage() {
    const { toast } = useToast()
    const params = useParams()
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()
    const [task, setTask] = useState<Task | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showDistributeDialog, setShowDistributeDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [childTasks, setChildTasks] = useState<any[]>([])

    // Ladda barnuppgifter (fördelade stationsuppgifter) när task är laddad
    useEffect(() => {
        if (!task) return
        const eligibleOwnerTypes = ['vo', 'station_group', 'station']
        const userCanDistribute = profile?.role === 'area_manager' || profile?.role === 'vo_chief' || profile?.role === 'admin'
        if (!userCanDistribute || !eligibleOwnerTypes.includes(task.owner_type)) return

        fetch(`/api/tasks/${task.id}/distribute`)
            .then(r => r.json())
            .then(d => setChildTasks(d.childTasks || []))
            .catch(e => console.error('Error loading child tasks:', e))
    }, [task?.id, profile?.role])

    const taskId = params.id as string

    const loadTask = async () => {
        try {
            const [taskRes, checklistRes] = await Promise.all([
                fetch(`/api/tasks/${taskId}`),
                fetch(`/api/tasks/${taskId}/checklist`)
            ])
            if (!taskRes.ok) throw new Error('Failed to load task')
            const taskData = await taskRes.json()
            const checklistData = checklistRes.ok ? await checklistRes.json() : { items: [] }

            setTask({
                ...taskData.task,
                checklist: checklistData.items || [],
            })
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
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.error || 'Kunde inte spara status')
            }

            await loadTask()
            router.refresh()
        } catch (err) {
            console.error('Error updating status:', err)
            toast({
                variant: 'destructive',
                title: 'Kunde inte spara status',
                description: err instanceof Error ? err.message : 'Ett oväntat fel uppstod',
            })
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
        // Only real tasks have attachments, so no check needed usually
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

    const handleUpdateTask = async (updates: Partial<Task>) => {
        if (!task) return

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

    // Check if this is a task that can be distributed
    const canDistribute = (
        // VO chief can distribute VO tasks
        (task.owner_type === 'vo' && (profile?.role === 'vo_chief' || profile?.role === 'admin')) ||
        // Area manager can distribute station_group, vo, or station tasks to their stations
        (profile?.role === 'area_manager' && (task.owner_type === 'station_group' || task.owner_type === 'vo' || task.owner_type === 'station'))
    )

    // Check if user can edit the task
    const canEdit = (
        profile?.id === task.created_by ||
        profile?.role === 'vo_chief' ||
        profile?.role === 'admin' ||
        (profile?.role === 'station_manager' && task.owner_type === 'station')
    )

    // Get user's stations for the edit dialog
    const userStations = profile?.user_stations?.map(us => us.station) || []

    return (
        <div className="space-y-6">
            {/* Back button and actions */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tillbaka
                </Button>

                <div className="flex items-center gap-2">
                    {/* Deep link to the tool for annual cycle tasks (e.g. /salary-review) */}
                    {task.action_link && (
                        <Button asChild variant="outline" size="sm">
                            <a
                                href={task.action_link}
                                target={task.action_link.startsWith('http') ? '_blank' : undefined}
                                rel={task.action_link.startsWith('http') ? 'noopener noreferrer' : undefined}
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Öppna verktyg
                            </a>
                        </Button>
                    )}

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

                    {/* Edit button */}
                    {canEdit && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowEditDialog(true)}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Redigera
                        </Button>
                    )}

                    {/* Delete button */}
                    {(profile?.id === task.created_by || profile?.role === 'vo_chief' || profile?.role === 'admin' || (profile?.role === 'station_manager' && task.owner_type === 'station')) && (
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

            {/* Barnuppgifter (fördelade stationsuppgifter) */}
            {childTasks.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-primary" />
                            Fördelade stationsuppgifter ({childTasks.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {childTasks.map((child: any) => {
                                const statusIcon = child.status === 'done' || child.status === 'reported'
                                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    : child.status === 'in_progress'
                                        ? <Clock className="h-4 w-4 text-blue-500" />
                                        : <Circle className="h-4 w-4 text-muted-foreground" />
                                const statusLabel = child.status === 'done' || child.status === 'reported' ? 'Klar'
                                    : child.status === 'in_progress' ? 'Pågående' : 'Ej påbörjad'
                                return (
                                    <div
                                        key={child.id}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-secondary/40 cursor-pointer transition-colors"
                                        onClick={() => router.push(`/tasks/${child.id}`)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {statusIcon}
                                            <div>
                                                <div className="font-medium text-sm">{child.station?.name || 'Okänd station'}</div>
                                                {child.assigned_to_profile && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {child.assigned_to_profile.full_name}
                                                    </div>
                                                )}
                                                {!child.assigned_to_profile && (
                                                    <div className="text-xs text-orange-500">Ej tilldelad</div>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

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
                        // Refresh child tasks after distribution
                        fetch(`/api/tasks/${task.id}/distribute`)
                            .then(r => r.json())
                            .then(d => setChildTasks(d.childTasks || []))
                    }}
                />
            )}

            {/* Edit Task Dialog */}
            {canEdit && (
                <EditTaskDialog
                    open={showEditDialog}
                    onOpenChange={setShowEditDialog}
                    task={task}
                    userRole={profile?.role || 'assistant_manager'}
                    userStations={userStations}
                    onSave={async (updates) => {
                        await handleUpdateTask(updates)
                        await loadTask()
                    }}
                />
            )}
        </div>
    )
}
