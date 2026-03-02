"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getMonthName } from "@/lib/utils"
import { Task, TaskStatus, TaskCategory, TaskPriority, statusLabels, statusColors, categoryLabels, categoryColors, getDaysUntilDeadline } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { StationFilter } from "@/components/station-filter"
import { TaskCard } from "@/components/task-card"
import { useToast } from "@/hooks/use-toast"
import {
    ListFilter, Plus, Loader2, ChevronRight, MapPin, LayoutGrid, List,
    UserX, AlertTriangle, Clock, User, CheckSquare2
} from "lucide-react"

const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const categories: TaskCategory[] = ['HR', 'Finance', 'Safety', 'Operations']
const statuses: TaskStatus[] = ['not_started', 'in_progress', 'done']

type AssignmentFilter = 'all' | 'unassigned' | 'mine'
type ViewMode = 'card' | 'list'

function getRiskBadges(task: Task) {
    const badges: { label: string; color: string }[] = []

    if (!task.assigned_to && task.owner_type === 'station') {
        badges.push({ label: 'Ej tilldelad', color: 'border-orange-300 text-orange-600 bg-orange-50' })
    }

    if (task.deadline_day && task.status !== 'done') {
        const dl = getDaysUntilDeadline(task.deadline_day)
        if (dl.text.includes('sen')) {
            badges.push({ label: 'Försenad', color: 'border-red-300 text-red-600 bg-red-50' })
        } else if (dl.urgent) {
            badges.push({ label: 'Nära deadline', color: 'border-yellow-400 text-yellow-700 bg-yellow-50' })
        }
    }

    return badges
}

interface TaskRowProps {
    task: Task
    onStatusChange: (taskId: string, newStatus: TaskStatus) => void
    onClick: () => void
    userId?: string
}

function TaskRow({ task, onStatusChange, onClick, userId }: TaskRowProps) {
    const riskBadges = getRiskBadges(task)

    const cycleStatus = (e: React.MouseEvent) => {
        e.stopPropagation()
        const statusOrder: TaskStatus[] = ['not_started', 'in_progress', 'done']
        const currentIndex = statusOrder.indexOf(task.status)
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
        onStatusChange(task.id, nextStatus)
    }

    return (
        <div
            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 cursor-pointer transition-colors group"
            onClick={onClick}
        >
            {/* Status dot */}
            <button
                className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 hover:opacity-80 transition-opacity ${statusColors[task.status]}`}
                onClick={cycleStatus}
                title={statusLabels[task.status]}
            >
                {task.status === 'done' ? '✓' : task.status === 'in_progress' ? '⏸' : '○'}
            </button>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="outline" className={`text-xs h-4 px-1 ${categoryColors[task.category]}`}>
                        {categoryLabels[task.category]}
                    </Badge>
                    {riskBadges.map((b, i) => (
                        <Badge key={i} variant="outline" className={`text-xs h-4 px-1 ${b.color}`}>
                            {b.label}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Assignee */}
            <div className="hidden sm:flex items-center gap-1 w-32 text-xs text-muted-foreground flex-shrink-0">
                {task.assigned_to_profile?.full_name ? (
                    <>
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{task.assigned_to_profile.full_name}</span>
                    </>
                ) : task.owner_type === 'station' ? (
                    <span className="text-orange-500 flex items-center gap-1">
                        <UserX className="h-3 w-3" />
                        Ej tilldelad
                    </span>
                ) : null}
            </div>

            {/* Deadline */}
            <div className="hidden md:block w-24 text-xs flex-shrink-0 text-right">
                {task.deadline_day && task.status !== 'done' && (() => {
                    const dl = getDaysUntilDeadline(task.deadline_day)
                    return <span className={dl.color}>{dl.text}</span>
                })()}
            </div>

            {/* Priority */}
            <div className="flex-shrink-0">
                {task.priority && (
                    <span className="text-xs font-medium">
                        {task.priority === 1 ? '🔴' : task.priority === 2 ? '🟡' : task.priority === 3 ? '🔵' : '⚪'} P{task.priority}
                    </span>
                )}
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
    )
}

export default function TasksPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { profile, loading: authLoading } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null)
    const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null)
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
    const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all')
    const [viewMode, setViewMode] = useState<ViewMode>('card')
    const [stationGroups, setStationGroups] = useState<{ id: string; name: string; stations?: { id: string }[] }[]>([])

    const fetchTasks = useCallback(async () => {
        if (!profile) return
        try {
            const res = await fetch(`/api/tasks?year=${new Date().getFullYear()}`)
            if (res.ok) {
                const data = await res.json()
                let loadedTasks = data.tasks || []
                if (profile.role === 'station_manager' || profile.role === 'assistant_manager') {
                    const userStationIds = profile.user_stations?.map(us => us.station.id) || []
                    loadedTasks = loadedTasks.filter((task: Task) => {
                        if (task.owner_type === 'station' && task.station_id && userStationIds.includes(task.station_id)) return true
                        if (task.assigned_to === profile.id) return true
                        if (task.owner_type === 'personal' && task.created_by === profile.id) return true
                        if (task.is_annual_cycle) return true
                        return false
                    })
                }
                setTasks(loadedTasks)
            }
        } catch (err) {
            console.error('Failed to load tasks:', err)
        } finally {
            setLoading(false)
        }
    }, [profile])

    useEffect(() => {
        if (!authLoading && profile) {
            fetchTasks()
            fetch('/api/admin/station-groups')
                .then(res => res.json())
                .then(data => {
                    const userStationIds = profile.user_stations?.map(us => us.station.id) || []
                    const relevantGroups = (data.station_groups || []).filter((group: any) =>
                        group.stations?.some((s: any) => userStationIds.includes(s.id))
                    )
                    setStationGroups(relevantGroups)
                })
                .catch(err => console.error('Failed to load station groups:', err))
        }
    }, [authLoading, profile, fetchTasks])

    const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        const task = tasks.find(t => t.id === taskId)
        if (!task) return
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))

        if (task.is_annual_cycle) {
            try {
                const originalId = task.id.replace('annual-', '')
                let apiStatus = 'completed'
                if (newStatus === 'in_progress') apiStatus = 'in_progress'
                if (newStatus === 'not_started') apiStatus = 'todo'
                const res = await fetch('/api/annual-cycle/complete', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: originalId, year: task.year, status: apiStatus })
                })
                if (!res.ok) throw new Error('Failed')
                toast({ title: "Status uppdaterad", description: `"${task.title}" är nu ${statusLabels[newStatus]?.toLowerCase()}.` })
            } catch {
                toast({ variant: "destructive", title: "Fel", description: "Kunde inte spara status." })
                fetchTasks()
            }
        } else {
            try {
                await fetch(`/api/tasks/${taskId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                })
            } catch {
                fetchTasks()
            }
        }
    }

    const handleTaskClick = (task: Task) => {
        if (task.is_annual_cycle && task.action_link) {
            router.push(task.action_link)
        } else {
            router.push(`/tasks/${task.id}`)
        }
    }

    // Filters
    const userStations = profile?.user_stations?.map(us => us.station) || []
    const showStationFilter = userStations.length > 1 || stationGroups.length > 0
    const selectedGroupStationIds = selectedGroupId
        ? stationGroups.find(g => g.id === selectedGroupId)?.stations?.map(s => s.id) || []
        : []

    const filteredTasks = tasks.filter(task => {
        if (selectedGroupId) {
            if (!task.station_id || !selectedGroupStationIds.includes(task.station_id)) return false
        } else if (selectedStationId && task.station_id !== selectedStationId) {
            return false
        }
        if (selectedMonth !== null) {
            if (task.is_recurring_monthly) { /* include */ }
            else if (!task.start_month) return false
            else {
                const end = task.end_month || task.start_month
                if (selectedMonth < task.start_month || selectedMonth > end) return false
            }
        }
        if (selectedCategory && task.category !== selectedCategory) return false
        if (selectedStatus && task.status !== selectedStatus) return false
        if (assignmentFilter === 'unassigned') {
            if (task.assigned_to || task.owner_type !== 'station') return false
        }
        if (assignmentFilter === 'mine') {
            if (task.assigned_to !== profile?.id) return false
        }
        return true
    })

    const clearFilters = () => {
        setSelectedMonth(null)
        setSelectedCategory(null)
        setSelectedStatus(null)
        setSelectedStationId(null)
        setSelectedGroupId(null)
        setAssignmentFilter('all')
    }

    const tasksByMonth = filteredTasks.reduce((acc, task) => {
        const key = task.is_recurring_monthly ? 'recurring' : String(task.start_month || 0)
        if (!acc[key]) acc[key] = []
        acc[key].push(task)
        return acc
    }, {} as Record<string, Task[]>)

    // Unassigned count for indicator
    const unassignedCount = tasks.filter(t => !t.assigned_to && t.owner_type === 'station').length

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Alla Uppgifter</h1>
                    <p className="text-muted-foreground mt-1">
                        Komplett översikt av årshjulets uppgifter
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {showStationFilter && (
                        <StationFilter
                            stations={userStations}
                            stationGroups={stationGroups}
                            selectedStationId={selectedStationId}
                            selectedGroupId={selectedGroupId}
                            onStationChange={setSelectedStationId}
                            onGroupChange={setSelectedGroupId}
                        />
                    )}
                    {/* View toggle */}
                    <div className="flex items-center border rounded-md overflow-hidden">
                        <Button
                            variant={viewMode === 'card' ? 'default' : 'ghost'}
                            size="sm"
                            className="rounded-none h-9 px-3"
                            onClick={() => setViewMode('card')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            size="sm"
                            className="rounded-none h-9 px-3 border-l"
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={() => router.push('/tasks/new')} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Ny uppgift
                    </Button>
                </div>
            </div>

            {/* Unassigned alert banner */}
            {unassignedCount > 0 && (
                <div
                    className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => setAssignmentFilter(assignmentFilter === 'unassigned' ? 'all' : 'unassigned')}
                >
                    <div className="flex items-center gap-2 text-orange-700">
                        <UserX className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            {unassignedCount} uppgift{unassignedCount !== 1 ? 'er' : ''} saknar ansvarig
                        </span>
                    </div>
                    <Badge variant="outline" className="border-orange-300 text-orange-600 bg-white text-xs">
                        {assignmentFilter === 'unassigned' ? 'Visa alla' : 'Visa dessa'}
                    </Badge>
                </div>
            )}

            {/* Filters */}
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <ListFilter className="h-4 w-4" />
                    Filtrera
                </div>

                {/* Month filter */}
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

                {/* Category filter */}
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

                {/* Status filter */}
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

                {/* Assignment filter */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Tilldelning</label>
                    <div className="flex flex-wrap gap-2">
                        {([
                            { value: 'all', label: 'Alla', icon: null },
                            { value: 'unassigned', label: 'Ej tilldelade', icon: <UserX className="h-3 w-3" /> },
                            { value: 'mine', label: 'Mina', icon: <User className="h-3 w-3" /> },
                        ] as { value: AssignmentFilter; label: string; icon: React.ReactNode }[]).map(opt => (
                            <Button
                                key={opt.value}
                                variant={assignmentFilter === opt.value ? "default" : "outline"}
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={() => setAssignmentFilter(opt.value)}
                            >
                                {opt.icon}
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {(selectedMonth || selectedCategory || selectedStatus || selectedStationId || selectedGroupId || assignmentFilter !== 'all') && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Rensa filter
                    </Button>
                )}
            </div>

            {/* Task List */}
            <div className="space-y-8">
                {/* List view header */}
                {viewMode === 'list' && filteredTasks.length > 0 && (
                    <div className="hidden sm:flex items-center gap-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <div className="h-7 w-7 flex-shrink-0" />
                        <div className="flex-1">Uppgift</div>
                        <div className="w-32 flex-shrink-0">Ansvarig</div>
                        <div className="hidden md:block w-24 flex-shrink-0 text-right">Deadline</div>
                        <div className="w-12 flex-shrink-0">Prior.</div>
                        <div className="w-4 flex-shrink-0" />
                    </div>
                )}

                {Object.entries(tasksByMonth)
                    .sort((a, b) => {
                        if (a[0] === 'recurring') return 1
                        if (b[0] === 'recurring') return -1
                        return Number(a[0]) - Number(b[0])
                    })
                    .map(([key, monthTasks]) => (
                        <section key={key} className="space-y-3">
                            <h2 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                                {key === 'recurring'
                                    ? 'Månatligt Återkommande'
                                    : key === '0'
                                        ? 'Utan månad'
                                        : getMonthName(Number(key))
                                }
                                <span className="ml-1 text-sm font-normal text-muted-foreground">
                                    ({monthTasks.length} uppgifter)
                                </span>
                                {monthTasks.filter(t => !t.assigned_to && t.owner_type === 'station').length > 0 && (
                                    <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50 text-xs">
                                        <UserX className="h-3 w-3 mr-1" />
                                        {monthTasks.filter(t => !t.assigned_to && t.owner_type === 'station').length} ej tilldelade
                                    </Badge>
                                )}
                            </h2>

                            {viewMode === 'card' ? (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {monthTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onStatusChange={handleStatusChange}
                                            onClick={() => handleTaskClick(task)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {monthTasks.map(task => (
                                        <TaskRow
                                            key={task.id}
                                            task={task}
                                            onStatusChange={handleStatusChange}
                                            onClick={() => handleTaskClick(task)}
                                            userId={profile?.id}
                                        />
                                    ))}
                                </div>
                            )}
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
                        {assignmentFilter === 'unassigned' && (
                            <p className="text-sm text-green-600 mt-2">
                                ✓ Alla uppgifter har en ansvarig person!
                            </p>
                        )}
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
