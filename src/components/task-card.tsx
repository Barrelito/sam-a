"use client"

import { RecurringTask, TaskStatus } from "@/lib/types"
import { getStationName, getUserName } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2, Circle, MessageSquare, RefreshCw, MapPin, User } from "lucide-react"

interface TaskCardProps {
    task: RecurringTask
    onStatusChange?: (taskId: string, status: TaskStatus) => void
}

const statusConfig = {
    not_started: {
        label: "Ej Påbörjad",
        icon: Circle,
        color: "not_started" as const,
    },
    in_progress: {
        label: "Pågående",
        icon: Clock,
        color: "in_progress" as const,
    },
    done: {
        label: "Klar",
        icon: CheckCircle2,
        color: "done" as const,
    },
}

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
    const status = statusConfig[task.status]
    const StatusIcon = status.icon
    const stationName = getStationName(task.station_id)
    const assignedName = getUserName(task.assigned_to)

    const cycleStatus = () => {
        if (!onStatusChange) return
        const statusOrder: TaskStatus[] = ['not_started', 'in_progress', 'done']
        const currentIndex = statusOrder.indexOf(task.status)
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
        onStatusChange(task.id, nextStatus)
    }

    return (
        <Card className="group hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <CardTitle className="text-base font-medium leading-tight">
                            {task.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {task.is_recurring_monthly && (
                                <CardDescription className="flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3" />
                                    Månadsvis
                                </CardDescription>
                            )}
                        </div>
                    </div>
                    <Badge variant={task.category}>{task.category}</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
                {/* Station & Assigned Info */}
                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {stationName}
                    </span>
                    {task.assigned_to && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {assignedName}
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
                        <Badge variant={status.color}>{status.label}</Badge>
                    </button>
                    {task.notes && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-xs">Anteckningar</span>
                        </div>
                    )}
                </div>
                {task.notes && (
                    <p className="text-sm text-muted-foreground bg-secondary/50 rounded-md p-2">
                        {task.notes}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

