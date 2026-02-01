"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Task, TaskStatus, TaskPriority, categoryLabels, statusLabels, statusColors, categoryColors, getDaysUntilDeadline } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2, Circle, MessageSquare, RefreshCw, MapPin, User, AlertCircle } from "lucide-react"
import { PriorityBadge } from "@/components/priority-badge"
import { PriorityQuickSelect } from "@/components/priority-quick-select"

interface TaskCardProps {
    task: Task
    onStatusChange?: (taskId: string, status: TaskStatus) => void
    onPriorityChange?: (taskId: string, priority: TaskPriority) => Promise<void> | void
    showStation?: boolean
    onClick?: () => void
}

const statusConfig: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
    not_started: {
        label: "Ej Påbörjad",
        icon: Circle,
    },
    in_progress: {
        label: "Pågående",
        icon: Clock,
    },
    done: {
        label: "Klar",
        icon: CheckCircle2,
    },
    reported: {
        label: "Rapporterad",
        icon: CheckCircle2,
    },
}

export function TaskCard({ task, onStatusChange, onPriorityChange, showStation = true, onClick }: TaskCardProps) {
    const router = useRouter()
    const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false)
    const status = statusConfig[task.status] || statusConfig.not_started
    const StatusIcon = status.icon

    const cycleStatus = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!onStatusChange) return
        const statusOrder: TaskStatus[] = ['not_started', 'in_progress', 'done']
        const currentIndex = statusOrder.indexOf(task.status)
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
        onStatusChange(task.id, nextStatus)
    }

    const handleClick = () => {
        if (onClick) {
            onClick()
            return
        }

        if (task.is_annual_cycle && task.action_link) {
            router.push(task.action_link)
        } else {
            router.push(`/tasks/${task.id}`)
        }
    }

    const handlePriorityBadgeClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setPriorityDropdownOpen(true)
    }

    return (
        <Card
            className="group hover:shadow-md transition-shadow cursor-pointer"
            onClick={handleClick}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <div className="flex items-start gap-2">
                            <CardTitle className="text-base font-medium leading-tight flex-1">
                                {task.title}
                            </CardTitle>
                            <PriorityBadge
                                priority={task.priority as TaskPriority}
                                onClick={onPriorityChange ? handlePriorityBadgeClick : undefined}
                            />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {task.is_recurring_monthly && (
                                <CardDescription className="flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3" />
                                    Månadsvis
                                </CardDescription>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {onPriorityChange && (
                            <PriorityQuickSelect
                                taskId={task.id}
                                currentPriority={task.priority as TaskPriority}
                                onPriorityChange={onPriorityChange}
                                open={priorityDropdownOpen}
                                onOpenChange={setPriorityDropdownOpen}
                            />
                        )}
                        <Badge variant="outline" className={categoryColors[task.category]}>
                            {categoryLabels[task.category]}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
                {/* Station & Assigned Info */}
                <div className="flex flex-wrap gap-2 text-xs">
                    {showStation && task.station?.name && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {task.station.name}
                        </span>
                    )}
                    {task.assigned_to_profile?.full_name && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {task.assigned_to_profile.full_name}
                        </span>
                    )}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={cycleStatus}
                        className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-secondary transition-colors"
                    >
                        <StatusIcon className="h-4 w-4" />
                        <Badge className={statusColors[task.status]}>
                            {statusLabels[task.status]}
                        </Badge>
                    </button>
                    {task.notes && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-xs">Anteckningar</span>
                        </div>
                    )}
                </div>

                {/* Smart Deadline Display */}
                {task.deadline_day && (
                    (() => {
                        const deadline = getDaysUntilDeadline(task.deadline_day)
                        return (
                            <div className={`flex items-center gap-1 text-xs ${deadline.urgent ? 'font-semibold' : ''}`}>
                                {deadline.urgent && <AlertCircle className="h-3 w-3" />}
                                <span className={deadline.color}>{deadline.text}</span>
                            </div>
                        )
                    })()
                )}
            </CardContent>
        </Card>
    )
}
