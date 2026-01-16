"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Task, statusLabels, statusColors, categoryLabels, categoryColors } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import {
    ArrowLeft,
    MapPin,
    Loader2,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    Calendar
} from "lucide-react"
import { getMonthName, getCurrentMonth } from "@/lib/utils"

interface Station {
    id: string
    name: string
    vo_id: string
    verksamhetsomraden?: { id: string; name: string }
}

const monthNames: Record<number, string> = {
    1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
    5: 'Maj', 6: 'Jun', 7: 'Jul', 8: 'Aug',
    9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Dec'
}

export default function StationDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()
    const [station, setStation] = useState<Station | null>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

    const stationId = params.id as string
    const currentMonth = getCurrentMonth()

    useEffect(() => {
        async function loadData() {
            try {
                const [stationsRes, tasksRes] = await Promise.all([
                    fetch('/api/admin/stations'),
                    fetch(`/api/tasks?station_id=${stationId}&year=${new Date().getFullYear()}`)
                ])

                if (stationsRes.ok) {
                    const data = await stationsRes.json()
                    const foundStation = data.stations?.find((s: Station) => s.id === stationId)
                    setStation(foundStation || null)
                }

                if (tasksRes.ok) {
                    const data = await tasksRes.json()
                    setTasks(data.tasks || [])
                }
            } catch (err) {
                console.error('Failed to load data:', err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [stationId])

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!station) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tillbaka
                </Button>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Stationen hittades inte</p>
                </div>
            </div>
        )
    }

    // Filter tasks by selected month
    const getTasksForMonth = (month: number) => {
        return tasks.filter(t => {
            if (t.is_recurring_monthly) return true
            if (!t.start_month) return false
            const end = t.end_month || t.start_month
            return month >= t.start_month && month <= end
        })
    }

    const displayTasks = selectedMonth
        ? getTasksForMonth(selectedMonth)
        : tasks

    // Calculate overall stats
    const done = tasks.filter(t => t.status === 'done' || t.status === 'reported').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    const notStarted = tasks.filter(t => t.status === 'not_started').length
    const reviewed = tasks.filter(t => t.vo_reviewed).length
    const percentage = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

    // Group tasks by status
    const groupedTasks = {
        not_started: displayTasks.filter(t => t.status === 'not_started'),
        in_progress: displayTasks.filter(t => t.status === 'in_progress'),
        done: displayTasks.filter(t => t.status === 'done'),
        reported: displayTasks.filter(t => t.status === 'reported'),
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button variant="ghost" onClick={() => router.push('/vo')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tillbaka
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-primary" />
                        {station.name}
                    </h1>
                    <p className="text-muted-foreground">
                        {station.verksamhetsomraden?.name} - Uppgiftsöversikt
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Progress</p>
                                <p className="text-2xl font-bold">{percentage}%</p>
                            </div>
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <Progress value={percentage} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Klara</p>
                            <p className="text-2xl font-bold text-green-600">{done}</p>
                        </div>
                        <CheckCircle2 className="h-6 w-6 text-green-600 opacity-50" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Pågående</p>
                            <p className="text-2xl font-bold text-yellow-600">{inProgress}</p>
                        </div>
                        <Clock className="h-6 w-6 text-yellow-600 opacity-50" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Granskade</p>
                            <p className="text-2xl font-bold">{reviewed}</p>
                        </div>
                        <AlertCircle className="h-6 w-6 text-primary opacity-50" />
                    </CardContent>
                </Card>
            </div>

            {/* Month Filter */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Filtrera på månad
                </div>
                <div className="flex flex-wrap gap-1">
                    <Button
                        variant={selectedMonth === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedMonth(null)}
                    >
                        Alla
                    </Button>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                        <Button
                            key={month}
                            variant={selectedMonth === month ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedMonth(month)}
                            className={month === currentMonth ? "ring-2 ring-primary ring-offset-2" : ""}
                        >
                            {monthNames[month]}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Task Lists by Status */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Not Started */}
                <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        Ej påbörjade ({groupedTasks.not_started.length})
                    </h3>
                    {groupedTasks.not_started.map(task => (
                        <TaskCard key={task.id} task={task} onClick={() => router.push(`/tasks/${task.id}`)} />
                    ))}
                    {groupedTasks.not_started.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">Inga uppgifter</p>
                    )}
                </div>

                {/* In Progress */}
                <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        Pågående ({groupedTasks.in_progress.length})
                    </h3>
                    {groupedTasks.in_progress.map(task => (
                        <TaskCard key={task.id} task={task} onClick={() => router.push(`/tasks/${task.id}`)} />
                    ))}
                    {groupedTasks.in_progress.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">Inga uppgifter</p>
                    )}
                </div>

                {/* Done */}
                <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        Klara ({groupedTasks.done.length + groupedTasks.reported.length})
                    </h3>
                    {[...groupedTasks.done, ...groupedTasks.reported].map(task => (
                        <TaskCard key={task.id} task={task} onClick={() => router.push(`/tasks/${task.id}`)} />
                    ))}
                    {groupedTasks.done.length + groupedTasks.reported.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">Inga uppgifter</p>
                    )}
                </div>
            </div>
        </div>
    )
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
    return (
        <Card
            className="cursor-pointer hover:shadow-sm transition-shadow"
            onClick={onClick}
        >
            <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2">
                        <p className="font-medium text-sm">{task.title}</p>
                        <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className={`text-xs ${categoryColors[task.category]}`}>
                                {categoryLabels[task.category]}
                            </Badge>
                            {task.vo_reviewed && (
                                <Badge variant="secondary" className="text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Granskad
                                </Badge>
                            )}
                        </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
            </CardContent>
        </Card>
    )
}
