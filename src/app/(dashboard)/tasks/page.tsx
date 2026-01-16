"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMonthName } from "@/lib/utils"
import { Task, TaskStatus, TaskCategory, statusLabels, statusColors, categoryLabels, categoryColors } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { ListFilter, Plus, Loader2, ChevronRight, MapPin } from "lucide-react"

const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const categories: TaskCategory[] = ['HR', 'Finance', 'Safety', 'Operations']
const statuses: TaskStatus[] = ['not_started', 'in_progress', 'done']

export default function TasksPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null)
    const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null)

    useEffect(() => {
        async function loadTasks() {
            if (authLoading || !profile) return

            try {
                const res = await fetch(`/api/tasks?year=${new Date().getFullYear()}`)
                if (res.ok) {
                    const data = await res.json()
                    let loadedTasks = data.tasks || []

                    // Filter tasks based on user role
                    if (profile.role === 'station_manager' || profile.role === 'assistant_manager') {
                        const userStationIds = profile.user_stations?.map(us => us.station.id) || []
                        loadedTasks = loadedTasks.filter((task: Task) => {
                            // Station tasks for their station(s)
                            if (task.owner_type === 'station' && task.station_id && userStationIds.includes(task.station_id)) {
                                return true
                            }
                            // Tasks assigned to them
                            if (task.assigned_to === profile.id) {
                                return true
                            }
                            // Personal tasks they created
                            if (task.owner_type === 'personal' && task.created_by === profile.id) {
                                return true
                            }
                            return false
                        })
                    }
                    // VO chiefs see all tasks for their VO (already filtered by API)
                    // Admins see all tasks

                    setTasks(loadedTasks)
                }
            } catch (err) {
                console.error('Failed to load tasks:', err)
            } finally {
                setLoading(false)
            }
        }
        loadTasks()
    }, [authLoading, profile])

    // Client-side filtering for month/category/status
    const filteredTasks = tasks.filter(task => {
        if (selectedMonth !== null) {
            if (task.is_recurring_monthly) {
                // Recurring tasks appear in all months
            } else if (!task.start_month) {
                return false
            } else {
                const end = task.end_month || task.start_month
                if (selectedMonth < task.start_month || selectedMonth > end) {
                    return false
                }
            }
        }
        if (selectedCategory && task.category !== selectedCategory) {
            return false
        }
        if (selectedStatus && task.status !== selectedStatus) {
            return false
        }
        return true
    })


    const clearFilters = () => {
        setSelectedMonth(null)
        setSelectedCategory(null)
        setSelectedStatus(null)
    }

    // Group tasks by start month
    const tasksByMonth = filteredTasks.reduce((acc, task) => {
        const key = task.is_recurring_monthly ? 'recurring' : String(task.start_month || 0)
        if (!acc[key]) acc[key] = []
        acc[key].push(task)
        return acc
    }, {} as Record<string, Task[]>)

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Alla Uppgifter</h1>
                    <p className="text-muted-foreground mt-1">
                        Komplett översikt av årshjulets uppgifter
                    </p>
                </div>
                <Button onClick={() => router.push('/tasks/new')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ny uppgift
                </Button>
            </div>

            {/* Filters */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <ListFilter className="h-4 w-4" />
                    Filtrera
                </div>

                {/* Month Filter */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Månad</label>
                    <div className="flex flex-wrap gap-1">
                        {months.map(month => (
                            <Button
                                key={month}
                                variant={selectedMonth === month ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedMonth(selectedMonth === month ? null : month)}
                                className="h-7 px-2 text-xs"
                            >
                                {getMonthName(month).slice(0, 3)}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Kategori</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(category => (
                            <Badge
                                key={category}
                                variant={selectedCategory === category ? "default" : "outline"}
                                className={`cursor-pointer ${selectedCategory === category ? categoryColors[category] : ''}`}
                                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                            >
                                {categoryLabels[category]}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Status</label>
                    <div className="flex flex-wrap gap-2">
                        {statuses.map(status => (
                            <Badge
                                key={status}
                                variant={selectedStatus === status ? "default" : "outline"}
                                className={`cursor-pointer ${selectedStatus === status ? statusColors[status] : ''}`}
                                onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                            >
                                {statusLabels[status]}
                            </Badge>
                        ))}
                    </div>
                </div>

                {(selectedMonth || selectedCategory || selectedStatus) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Rensa filter
                    </Button>
                )}
            </div>

            {/* Task List */}
            <div className="space-y-8">
                {Object.entries(tasksByMonth)
                    .sort((a, b) => {
                        if (a[0] === 'recurring') return 1
                        if (b[0] === 'recurring') return -1
                        return Number(a[0]) - Number(b[0])
                    })
                    .map(([key, monthTasks]) => (
                        <section key={key} className="space-y-4">
                            <h2 className="text-lg font-semibold border-b pb-2">
                                {key === 'recurring'
                                    ? 'Månatligt Återkommande'
                                    : key === '0'
                                        ? 'Utan månad'
                                        : getMonthName(Number(key))
                                }
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    ({monthTasks.length} uppgifter)
                                </span>
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {monthTasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onClick={() => router.push(`/tasks/${task.id}`)}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}

                {filteredTasks.length === 0 && (
                    <div className="text-center py-12 bg-secondary/30 rounded-lg">
                        <p className="text-muted-foreground">
                            {tasks.length === 0
                                ? 'Inga uppgifter har skapats ännu'
                                : 'Inga uppgifter matchar dina filter'
                            }
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => router.push('/tasks/new')}
                        >
                            Skapa första uppgiften
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
        >
            <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2 flex-1">
                        <p className="font-medium">{task.title}</p>
                        <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className={`text-xs ${categoryColors[task.category]}`}>
                                {categoryLabels[task.category]}
                            </Badge>
                            <Badge className={`text-xs ${statusColors[task.status]}`}>
                                {statusLabels[task.status]}
                            </Badge>
                        </div>
                        {task.station?.name && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {task.station.name}
                            </div>
                        )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
            </CardContent>
        </Card>
    )
}
