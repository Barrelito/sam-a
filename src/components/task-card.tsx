"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Task, TaskStatus, TaskPriority, categoryLabels, statusLabels, statusColors, categoryColors, getDaysUntilDeadline } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2, Circle, MessageSquare, RefreshCw, MapPin, User, AlertCircle, ChevronDown, ChevronUp, Paperclip } from "lucide-react"
import { PriorityBadge } from "@/components/priority-badge"
import { PriorityQuickSelect } from "@/components/priority-quick-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface TaskCardProps {
    task: Task
    onStatusChange?: (taskId: string, status: TaskStatus) => void
    onPriorityChange?: (taskId: string, priority: TaskPriority) => Promise<void> | void
    showStation?: boolean
    onClick?: () => void
    selectionMode?: boolean
    isSelected?: boolean
    onToggleSelect?: (taskId: string) => void
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

export function TaskCard({ task, onStatusChange, onPriorityChange, showStation = true, onClick, selectionMode, isSelected, onToggleSelect }: TaskCardProps) {
    const router = useRouter()
    const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false)
    const [expanded, setExpanded] = useState(false)
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
        if (selectionMode && onToggleSelect) {
            onToggleSelect(task.id)
            return
        }
        if (expanded) return // Don't navigate when expanded
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

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation()
        setExpanded(!expanded)
    }

    const attachmentCount = task.attachments?.length || 0
    const hasDetails = task.description || task.notes || attachmentCount > 0

    return (
        <Card
            className={`group hover:shadow-md transition-shadow cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
            onClick={handleClick}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    {selectionMode && (
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelect?.(task.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                        />
                    )}
                    <div className="flex-1">
                        <div className="flex items-start gap-2">
                            <CardTitle className="text-base font-medium leading-tight flex-1">
                                {task.title}
                            </CardTitle>
                            <PriorityBadge
                                priority={task.priority as TaskPriority}
                                onClick={onPriorityChange && !selectionMode ? handlePriorityBadgeClick : undefined}
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

            <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                    <div
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md cursor-pointer hover:bg-secondary/80 transition-colors"
                        style={{ backgroundColor: statusColors[task.status] + '20' }}
                        onClick={cycleStatus}
                    >
                        <StatusIcon className="h-3 w-3" />
                        <span>{status.label}</span>
                    </div>

                    {task.assigned_to_profile?.full_name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{task.assigned_to_profile.full_name}</span>
                        </div>
                    )}

                    {showStation && task.station && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{task.station.name}</span>
                        </div>
                    )}

                    {task.notes && !expanded && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-xs">Anteckningar</span>
                        </div>
                    )}
                </div>

                {/* Description Preview (when collapsed) */}
                {!expanded && task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                    </p>
                )}

                {/* Expanded Content */}
                {expanded && hasDetails && (
                    <div className="space-y-2 border-t pt-3 mt-3">
                        {task.description && (
                            <div>
                                <p className="text-sm font-medium mb-1">Beskrivning:</p>
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                            </div>
                        )}
                        {attachmentCount > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Paperclip className="h-3 w-3" />
                                {attachmentCount} bilagor
                            </div>
                        )}
                        {task.notes && (
                            <div>
                                <p className="text-sm font-medium mb-1">Anteckningar:</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Expand/Collapse Button */}
                {hasDetails && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8"
                        onClick={toggleExpand}
                    >
                        {expanded ? (
                            <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Visa mindre
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Visa mer
                            </>
                        )}
                    </Button>
                )}

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
