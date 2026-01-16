"use client"

import { useState } from "react"
import { Task, TaskComment, TaskAttachment, TaskStatus, UserRole, statusLabels, statusColors, categoryLabels, categoryColors, ownerTypeLabels } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Calendar,
    User,
    MapPin,
    Building2,
    MessageSquare,
    Paperclip,
    Upload,
    Loader2,
    Check,
    Clock,
    FileText,
    Trash2,
    Download,
    Circle,
    AlertCircle,
    Edit,
    Save,
    X
} from "lucide-react"

interface TaskDetailViewProps {
    task: Task
    userRole: UserRole
    userId?: string
    onStatusChange: (status: TaskStatus) => Promise<void>
    onAddComment: (content: string) => Promise<void>
    onUploadFile: (file: File) => Promise<void>
    onDeleteAttachment?: (attachmentId: string) => Promise<void>
    onUpdateNotes?: (notes: string) => Promise<void>
    onUpdateTask?: (updates: Partial<Task>) => Promise<void>
    onVOReview?: (reviewed: boolean, comment?: string) => Promise<void>
}

const monthNames: Record<number, string> = {
    1: 'Januari', 2: 'Februari', 3: 'Mars', 4: 'April',
    5: 'Maj', 6: 'Juni', 7: 'Juli', 8: 'Augusti',
    9: 'September', 10: 'Oktober', 11: 'November', 12: 'December'
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export function TaskDetailView({
    task,
    userRole,
    userId,
    onStatusChange,
    onAddComment,
    onUploadFile,
    onDeleteAttachment,
    onUpdateNotes,
    onUpdateTask,
    onVOReview,
}: TaskDetailViewProps) {
    const [commentText, setCommentText] = useState('')
    const [notes, setNotes] = useState(task.notes || '')
    const [loading, setLoading] = useState(false)
    const [commentLoading, setCommentLoading] = useState(false)
    const [uploadLoading, setUploadLoading] = useState(false)

    // Editing states
    const [editingDeadline, setEditingDeadline] = useState(false)
    const [deadlineDay, setDeadlineDay] = useState(task.deadline_day)

    // Assignment states
    const [editingAssignment, setEditingAssignment] = useState(false)
    const [selectedAssignee, setSelectedAssignee] = useState(task.assigned_to || '')
    const [stationUsers, setStationUsers] = useState<{ id: string; full_name: string; role: string }[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)

    const handleStatusChange = async (status: TaskStatus) => {
        setLoading(true)
        try {
            await onStatusChange(status)
        } finally {
            setLoading(false)
        }
    }

    const handleAddComment = async () => {
        if (!commentText.trim()) return
        setCommentLoading(true)
        try {
            await onAddComment(commentText)
            setCommentText('')
        } finally {
            setCommentLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadLoading(true)
        try {
            await onUploadFile(file)
        } finally {
            setUploadLoading(false)
            e.target.value = ''
        }
    }

    const handleSaveNotes = async () => {
        if (onUpdateNotes) {
            setLoading(true)
            try {
                await onUpdateNotes(notes)
            } finally {
                setLoading(false)
            }
        }
    }

    const handleSaveDeadline = async () => {
        if (onUpdateTask && deadlineDay !== task.deadline_day) {
            setLoading(true)
            try {
                await onUpdateTask({ deadline_day: deadlineDay })
                setEditingDeadline(false)
            } finally {
                setLoading(false)
            }
        } else {
            setEditingDeadline(false)
        }
    }

    // Load users on the same station for assignment
    const loadStationUsers = async () => {
        if (!task.station_id) return
        setLoadingUsers(true)
        try {
            const res = await fetch('/api/admin/users')
            if (res.ok) {
                const data = await res.json()
                // Filter users who are on the same station
                const users = data.profiles?.filter((u: any) =>
                    (u.role === 'station_manager' || u.role === 'assistant_manager') &&
                    u.user_stations?.some((us: any) => us.station?.id === task.station_id)
                ).map((u: any) => ({
                    id: u.id,
                    full_name: u.full_name,
                    role: u.role
                })) || []
                setStationUsers(users)
            }
        } catch (err) {
            console.error('Error loading users:', err)
        } finally {
            setLoadingUsers(false)
        }
    }

    const handleSaveAssignment = async () => {
        if (onUpdateTask && selectedAssignee !== (task.assigned_to || '')) {
            setLoading(true)
            try {
                await onUpdateTask({ assigned_to: selectedAssignee || null })
                setEditingAssignment(false)
            } finally {
                setLoading(false)
            }
        } else {
            setEditingAssignment(false)
        }
    }

    // Get period display
    let periodDisplay = 'Återkommande varje månad'
    if (!task.is_recurring_monthly && task.start_month) {
        if (task.end_month && task.end_month !== task.start_month) {
            periodDisplay = `${monthNames[task.start_month]} - ${monthNames[task.end_month]}`
        } else {
            periodDisplay = monthNames[task.start_month]
        }
    }

    const isVOChief = userRole === 'vo_chief' || userRole === 'admin'
    const isStationManager = userRole === 'station_manager'
    const canEditDeadline = isVOChief
    // Station managers and VO chiefs can assign tasks on station tasks
    const canAssign = (isVOChief || isStationManager) && task.owner_type === 'station' && task.station_id

    // Status options with visual design
    const statusOptions: { status: TaskStatus; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
        {
            status: 'not_started',
            label: 'Ej påbörjad',
            icon: <Circle className="h-5 w-5" />,
            color: 'text-gray-600',
            bgColor: 'bg-gray-100 hover:bg-gray-200 border-gray-300'
        },
        {
            status: 'in_progress',
            label: 'Pågående',
            icon: <Clock className="h-5 w-5" />,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-300'
        },
        {
            status: 'done',
            label: 'Klar',
            icon: <Check className="h-5 w-5" />,
            color: 'text-green-600',
            bgColor: 'bg-green-50 hover:bg-green-100 border-green-300'
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">{task.title}</h1>
                        {task.description && (
                            <p className="text-muted-foreground">{task.description}</p>
                        )}
                    </div>
                    <Badge className={statusColors[task.status]}>
                        {statusLabels[task.status]}
                    </Badge>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-3">
                    <Badge variant="outline" className={categoryColors[task.category]}>
                        {categoryLabels[task.category]}
                    </Badge>
                    <Badge variant="secondary">
                        {ownerTypeLabels[task.owner_type]}
                    </Badge>
                    {task.station?.name && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {task.station.name}
                        </div>
                    )}
                    {task.verksamhetsomraden?.name && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            {task.verksamhetsomraden.name}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Info Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Period & Deadline Card */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                Period & Deadline
                            </div>
                            {canEditDeadline && !editingDeadline && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => setEditingDeadline(true)}
                                >
                                    <Edit className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                        <p className="font-medium">{periodDisplay}</p>

                        {editingDeadline ? (
                            <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs">Deadline dag:</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={31}
                                        value={deadlineDay}
                                        onChange={(e) => setDeadlineDay(parseInt(e.target.value) || 25)}
                                        className="w-20 h-8"
                                    />
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        className="h-7"
                                        onClick={handleSaveDeadline}
                                        disabled={loading}
                                    >
                                        <Save className="h-3 w-3 mr-1" />
                                        Spara
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7"
                                        onClick={() => {
                                            setDeadlineDay(task.deadline_day)
                                            setEditingDeadline(false)
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Deadline: <span className="font-medium text-foreground">Dag {task.deadline_day}</span>
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                Tilldelad
                            </div>
                            {canAssign && !editingAssignment && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => {
                                        setEditingAssignment(true)
                                        loadStationUsers()
                                    }}
                                >
                                    <Edit className="h-3 w-3" />
                                </Button>
                            )}
                        </div>

                        {editingAssignment ? (
                            <div className="space-y-2">
                                <select
                                    value={selectedAssignee}
                                    onChange={(e) => setSelectedAssignee(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                                    disabled={loadingUsers}
                                >
                                    <option value="">Ingen tilldelad</option>
                                    {stationUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.full_name} ({user.role === 'station_manager' ? 'Stationschef' : 'Biträdande'})
                                        </option>
                                    ))}
                                </select>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        className="h-7"
                                        onClick={handleSaveAssignment}
                                        disabled={loading}
                                    >
                                        <Save className="h-3 w-3 mr-1" />
                                        Spara
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7"
                                        onClick={() => {
                                            setSelectedAssignee(task.assigned_to || '')
                                            setEditingAssignment(false)
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="font-medium">
                                    {task.assigned_to_profile?.full_name || 'Ej tilldelad'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Skapad av {task.created_by_profile?.full_name}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Clock className="h-4 w-4" />
                            Status
                        </div>
                        {task.completed_at ? (
                            <>
                                <p className="font-medium text-green-600">Avslutad</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDate(task.completed_at)}
                                </p>
                            </>
                        ) : (
                            <p className="font-medium">{statusLabels[task.status]}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Status Actions - Improved Visual Design */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Ändra status</CardTitle>
                    <CardDescription>Klicka på en status för att uppdatera uppgiften</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                        {statusOptions.map((option) => {
                            const isActive = task.status === option.status
                            return (
                                <button
                                    key={option.status}
                                    onClick={() => !isActive && handleStatusChange(option.status)}
                                    disabled={loading || isActive}
                                    className={`
                                        flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                                        ${isActive
                                            ? `${option.bgColor} border-2 ring-2 ring-offset-2 ring-primary/20`
                                            : `${option.bgColor} border-transparent opacity-70 hover:opacity-100`
                                        }
                                        ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                >
                                    <span className={option.color}>{option.icon}</span>
                                    <span className={`text-sm font-medium mt-2 ${option.color}`}>
                                        {option.label}
                                    </span>
                                    {isActive && (
                                        <span className="text-xs text-muted-foreground mt-1">Nuvarande</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* VO Review (only for VO chiefs viewing station tasks) */}
            {isVOChief && task.owner_type === 'station' && onVOReview && (
                <Card className={task.vo_reviewed ? "border-green-200 bg-green-50" : ""}>
                    <CardHeader>
                        <CardTitle className="text-lg">VO-granskning</CardTitle>
                        <CardDescription>
                            {task.vo_reviewed
                                ? `Granskad ${task.vo_reviewed_at ? formatDate(task.vo_reviewed_at) : ''}`
                                : 'Denna stationsuppgift har inte granskats än'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant={task.vo_reviewed ? "outline" : "default"}
                            onClick={() => onVOReview(!task.vo_reviewed)}
                        >
                            {task.vo_reviewed ? 'Ta bort granskning' : 'Markera som granskad'}
                        </Button>
                        {task.vo_comment && (
                            <p className="mt-2 text-sm text-muted-foreground italic">
                                "{task.vo_comment}"
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* VO Instructions (shown to station managers on station tasks) */}
            {!isVOChief && task.owner_type === 'station' && task.vo_comment && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                            <AlertCircle className="h-5 w-5" />
                            Instruktion från VO-chef
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-blue-800">{task.vo_comment}</p>
                    </CardContent>
                </Card>
            )}

            {/* Notes */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Anteckningar
                    </CardTitle>
                    <CardDescription>
                        {isVOChief ? 'Anteckningar syns för alla på uppgiften' : 'Lägg till egna anteckningar'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Lägg till anteckningar..."
                        rows={4}
                    />
                    {notes !== (task.notes || '') && (
                        <Button
                            size="sm"
                            onClick={handleSaveNotes}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Spara anteckningar
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Comments - with role context */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Kommentarer ({task.comments?.length || 0})
                    </CardTitle>
                    <CardDescription>
                        Kommunikation kring uppgiften
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Comment List */}
                    {task.comments && task.comments.length > 0 && (
                        <div className="space-y-3">
                            {task.comments.map((comment: TaskComment) => {
                                // Check if this comment is from a VO chief (instruction)
                                const isVOComment = comment.user?.role === 'vo_chief' || comment.user?.role === 'admin'

                                return (
                                    <div
                                        key={comment.id}
                                        className={`p-3 rounded-lg ${isVOComment
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'bg-secondary/30'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">
                                                    {comment.user?.full_name || 'Okänd'}
                                                </span>
                                                {isVOComment && (
                                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                                        VO-chef
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(comment.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm">{comment.content}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Add Comment */}
                    <div className="space-y-2">
                        <Label className="text-sm">
                            {isVOChief ? 'Lägg till instruktion/kommentar' : 'Lägg till kommentar'}
                        </Label>
                        <Textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={isVOChief
                                ? "Skriv instruktion till stationschefen..."
                                : "Skriv en kommentar..."
                            }
                            rows={2}
                        />
                        <Button
                            size="sm"
                            onClick={handleAddComment}
                            disabled={commentLoading || !commentText.trim()}
                        >
                            {commentLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {isVOChief ? 'Lägg till instruktion' : 'Lägg till kommentar'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Attachments */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Paperclip className="h-5 w-5" />
                        Bilagor ({task.attachments?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Attachment List */}
                    {task.attachments && task.attachments.length > 0 && (
                        <div className="space-y-2">
                            {task.attachments.map((attachment: TaskAttachment) => (
                                <div
                                    key={attachment.id}
                                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium text-sm">{attachment.filename}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {attachment.file_size
                                                    ? `${(attachment.file_size / 1024).toFixed(1)} KB`
                                                    : 'Okänd storlek'
                                                }
                                                {' • '}
                                                {attachment.uploaded_by_profile?.full_name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm">
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        {onDeleteAttachment && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDeleteAttachment(attachment.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upload */}
                    <div>
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <label htmlFor="file-upload">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={uploadLoading}
                                asChild
                            >
                                <span className="cursor-pointer">
                                    {uploadLoading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    Ladda upp fil
                                </span>
                            </Button>
                        </label>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
