"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMonthName, getCurrentMonth, getTertial } from "@/lib/utils"
import { TaskCard } from "@/components/task-card"
import { StatusOverview } from "@/components/status-overview"
import { StationFilter } from "@/components/station-filter"
import { Task, TaskStatus, TaskPriority, StationGroup, getDaysUntilDeadline, TaskCategory, categoryLabels } from "@/lib/types"
import { CalendarDays, TrendingUp, Loader2, FolderOpen, CheckCircle, AlertCircle, Target, Filter, CheckSquare, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

export default function DashboardPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()

    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
    const [stationGroups, setStationGroups] = useState<StationGroup[]>([])
    const [userStationGroup, setUserStationGroup] = useState<StationGroup | null>(null)
    const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
    const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all')
    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())

    const currentMonth = getCurrentMonth()
    const currentTertial = getTertial(currentMonth)
    const monthName = getMonthName(currentMonth)

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (authLoading || !profile) return

            try {
                const [tasksRes, groupsRes] = await Promise.all([
                    fetch('/api/tasks'),
                    fetch('/api/admin/station-groups')
                ])

                const tasksData = await tasksRes.json()
                const groupsData = await groupsRes.json()

                const allTasks = tasksData.tasks || []
                const groups = groupsData.station_groups || []

                setStationGroups(groups)

                // Detect user's station group
                const userStationIds = profile.user_stations?.map(us => us.station.id) || []
                let activeGroup: StationGroup | null = null

                for (const group of groups) {
                    const groupStationIds = group.stations?.map((s: any) => s.id) || []
                    const allStationsInGroup = userStationIds.every(id => groupStationIds.includes(id))
                    const userStationsInGroup = userStationIds.filter(id => groupStationIds.includes(id))

                    if (allStationsInGroup && userStationsInGroup.length >= 2) {
                        activeGroup = group
                        break
                    }
                }

                setUserStationGroup(activeGroup)

                // Filter tasks for station managers
                let filteredTasks = allTasks

                if (profile.role === 'station_manager' || profile.role === 'assistant_manager') {
                    filteredTasks = filteredTasks.filter((task: Task) => {
                        // 1. Show station tasks for their station(s)
                        if (task.owner_type === 'station') {
                            // Direct station assignment
                            if (task.station_id && userStationIds.includes(task.station_id)) {
                                return true
                            }
                            // Station group assignment - show if user matches the group
                            // Logic: If user is in a group that matches the task's group
                            // OR if user is in a group that CONTAINS the task's station (though that's covered by above usually)
                            if (task.station_group_id) {
                                // Specific group assignment
                                // Check if user belongs to this group (has at least one station in it? or is manager of it?)
                                // Usually if manager has >0 stations in the group, they should see it?
                                // Let's simplify: if any of user's stations are in the task's station_group
                                const group = groups.find((g: StationGroup) => g.id === task.station_group_id)
                                if (group) {
                                    const groupStationIds = group.stations?.map((s: any) => s.id) || []
                                    const hasStationInGroup = userStationIds.some(id => groupStationIds.includes(id))
                                    if (hasStationInGroup) return true
                                }
                            }
                        }

                        // 2. Show tasks assigned to them
                        if (task.assigned_to === profile.id) {
                            return true
                        }

                        // 3. Show personal tasks they created
                        if (task.owner_type === 'personal' && task.created_by === profile.id) {
                            return true
                        }
                        return false
                    })
                }

                setTasks(filteredTasks)
            } catch (err) {
                console.error('Error fetching data:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [authLoading, profile])

    // Redirect admin to admin page
    useEffect(() => {
        if (!authLoading && profile?.role === 'admin') {
            router.push('/admin')
        }
        if (!authLoading && profile?.role === 'vo_chief') {
            router.push('/vo')
        }
    }, [authLoading, profile, router])

    // Show loading while checking auth or if admin/vo_chief
    if (authLoading || loading || profile?.role === 'admin' || profile?.role === 'vo_chief') {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Get user's stations for the filter
    const userStations = profile?.user_stations?.map(us => us.station) || []
    const showStationFilter = userStations.length > 1 && !userStationGroup

    // Apply station filter to tasks - if user has a station group, show all by default
    const stationFilteredTasks = selectedStationId
        ? tasks.filter(task => task.station_id === selectedStationId)
        : selectedGroupId
            ? tasks.filter(task => {
                // If filtering by specific group
                if (task.station_group_id === selectedGroupId) return true

                // Or if filtering by group, show tasks for stations in that group
                const group = stationGroups.find(g => g.id === selectedGroupId)
                const groupStationIds = group?.stations?.map((s: any) => s.id) || []
                return task.station_id && groupStationIds.includes(task.station_id)
            })
            : tasks

    // Filter tasks for current month
    const monthTasks = stationFilteredTasks.filter(task => {
        // Never show master tasks on dashboard (they're just templates)
        if (task.is_recurring_master) {
            return false
        }

        // For recurring task instances, check if this instance is for current month/year
        if (task.recurring_master_id && task.instance_month && task.instance_year) {
            const currentDate = new Date()
            return task.instance_month === currentMonth &&
                task.instance_year === currentDate.getFullYear()
        }

        // Legacy: Old recurring monthly tasks (will be migrated)
        if (task.is_recurring_monthly) {
            // Safety check: hide if completed in a previous month
            if (task.status === 'done' && task.completed_at) {
                const completedDate = new Date(task.completed_at)
                const currentDate = new Date()
                if (completedDate.getMonth() + 1 !== currentMonth ||
                    completedDate.getFullYear() !== currentDate.getFullYear()) {
                    return false
                }
            }
            return true
        }

        // Regular tasks: Match tasks for current month
        if (task.start_month === currentMonth) return true
        if (task.start_month && task.end_month) {
            // Check if current month is within range
            if (task.start_month <= task.end_month) {
                return currentMonth >= task.start_month && currentMonth <= task.end_month
            }
        }
        return false
    })

    // Tasks for tertial calculation
    const tertialMonths = currentTertial === 1 ? [1, 2, 3, 4]
        : currentTertial === 2 ? [5, 6, 7, 8]
            : [9, 10, 11, 12]

    const tertialTasks = stationFilteredTasks.filter(task => {
        // Never show master tasks
        if (task.is_recurring_master) return false

        // For task instances in this tertial
        if (task.recurring_master_id && task.instance_month) {
            return tertialMonths.includes(task.instance_month)
        }

        // Legacy recurring monthly
        if (task.is_recurring_monthly) return true

        // Regular tasks
        if (task.start_month && tertialMonths.includes(task.start_month)) return true
        return false
    })

    const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                setTasks(prev => prev.map(task =>
                    task.id === taskId
                        ? { ...task, status: newStatus, updated_at: new Date().toISOString() }
                        : task
                ))
            }
        } catch (err) {
            console.error('Error updating status:', err)
        }
    }

    const handlePriorityChange = async (taskId: string, newPriority: TaskPriority) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority: newPriority })
            })
            if (res.ok) {
                setTasks(prev => prev.map(task =>
                    task.id === taskId
                        ? { ...task, priority: newPriority }
                        : task
                ))
            }
        } catch (error) {
            console.error('Error updating task priority:', error)
        }
    }

    const toggleTaskSelection = (taskId: string) => {
        const newSelected = new Set(selectedTasks)
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId)
        } else {
            newSelected.add(taskId)
        }
        setSelectedTasks(newSelected)
    }

    const bulkSetPriority = async (priority: TaskPriority) => {
        try {
            const promises = Array.from(selectedTasks).map(taskId =>
                handlePriorityChange(taskId, priority)
            )
            await Promise.all(promises)
            setSelectedTasks(new Set())
            setSelectionMode(false)
        } catch (error) {
            console.error('Error updating bulk priorities:', error)
        }
    }

    const bulkSetStatus = async (status: TaskStatus) => {
        try {
            const promises = Array.from(selectedTasks).map(taskId =>
                handleStatusChange(taskId, status)
            )
            await Promise.all(promises)
            setSelectedTasks(new Set())
            setSelectionMode(false)
        } catch (error) {
            console.error('Error updating bulk statuses:', error)
        }
    }

    // Sort tasks by priority (higher priority first), then status, then deadline
    const sortTasksByPriority = (tasksToSort: Task[]) => {
        return [...tasksToSort].sort((a, b) => {
            // First by priority (1 = highest, 4 = lowest, null = last)
            const aPriority = a.priority || 999
            const bPriority = b.priority || 999
            if (aPriority !== bPriority) {
                return aPriority - bPriority
            }

            // Then by status (not_started, in_progress, done)
            const statusOrder: TaskStatus[] = ['not_started', 'in_progress', 'done', 'reported']
            const aStatusIndex = statusOrder.indexOf(a.status)
            const bStatusIndex = statusOrder.indexOf(b.status)
            if (aStatusIndex !== bStatusIndex) {
                return aStatusIndex - bStatusIndex
            }

            // Finally by deadline (earliest first)
            if (a.deadline_day && b.deadline_day) {
                return a.deadline_day - b.deadline_day
            }
            return 0
        })
    }

    const sortedMonthTasks = sortTasksByPriority(monthTasks)

    // Apply priority and category filters
    let filteredMonthTasks = priorityFilter === 'all'
        ? sortedMonthTasks
        : sortedMonthTasks.filter(t => t.priority === priorityFilter)

    filteredMonthTasks = categoryFilter === 'all'
        ? filteredMonthTasks
        : filteredMonthTasks.filter(t => t.category === categoryFilter)

    // Determine dashboard title
    let dashboardTitle = "Ambulansledning"
    if (userStationGroup) {
        dashboardTitle = `Ambulansledning - ${userStationGroup.name}`
    } else if ((profile?.role === 'station_manager' || profile?.role === 'assistant_manager') && profile?.user_stations && profile.user_stations.length > 0) {
        const stationNames = profile.user_stations.map(us => us.station.name).join(' & ')
        dashboardTitle = `Ambulansledning - Station ${stationNames}`
    } else if (profile?.verksamhetsomraden) {
        dashboardTitle = `Ambulansledning - ${profile.verksamhetsomraden.name}`
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {dashboardTitle}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Digitalt årshjul och uppgiftshantering
                    </p>
                </div>
                {/* Station Group Badge */}
                {userStationGroup && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {userStationGroup.name} ({userStations.length} stationer)
                    </Badge>
                )}
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
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* P1 Tasks Remaining */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-red-600">
                                    {monthTasks.filter(t => t.priority === 1 && t.status !== 'done').length}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    🔴 P1 kvar
                                </div>
                            </div>
                            <Target className="h-8 w-8 text-red-200" />
                        </div>
                    </CardContent>
                </Card>

                {/* Completed Tasks */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">
                                    {monthTasks.filter(t => t.status === 'done').length}/{monthTasks.length}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    ✓ Klara uppgifter
                                </div>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-200" />
                        </div>
                    </CardContent>
                </Card>

                {/* Overdue Tasks */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-orange-600">
                                    {monthTasks.filter(t => {
                                        if (!t.deadline_day || t.status === 'done') return false
                                        const deadline = getDaysUntilDeadline(t.deadline_day)
                                        return deadline.text.includes('sen')
                                    }).length}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    ⚠️ Försenade
                                </div>
                            </div>
                            <AlertCircle className="h-8 w-8 text-orange-200" />
                        </div>
                    </CardContent>
                </Card>

                {/* Completion Rate */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">
                                    {monthTasks.length > 0
                                        ? Math.round((monthTasks.filter(t => t.status === 'done').length / monthTasks.length) * 100)
                                        : 0}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    📊 Slutförandegrad
                                </div>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-200" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bulk Action Toolbar (when tasks selected) */}
            {selectionMode && selectedTasks.size > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="h-5 w-5 text-primary" />
                            <span className="font-medium">{selectedTasks.size} uppgifter markerade</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => bulkSetPriority(1)}>
                                Sätt P1
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => bulkSetPriority(2)}>
                                Sätt P2
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => bulkSetPriority(3)}>
                                Sätt P3
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => bulkSetPriority(4)}>
                                Sätt P4
                            </Button>
                            <div className="h-4 w-px bg-border" />
                            <Button variant="outline" size="sm" onClick={() => bulkSetStatus('done')}>
                                Markera klara
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                                setSelectedTasks(new Set())
                                setSelectionMode(false)
                            }}>
                                <X className="h-4 w-4" />
                                Avbryt
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Focus Section - Active Tasks */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-semibold">
                            Uppgifter för {monthName}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            ({filteredMonthTasks.filter(t => t.status !== 'done').length} aktiva)
                        </span>
                    </div>

                    {/* Priority Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={priorityFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPriorityFilter('all')}
                        >
                            Alla
                        </Button>
                        <Button
                            variant={priorityFilter === 1 ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPriorityFilter(1)}
                            className={priorityFilter === 1 ? '' : 'hover:bg-red-50'}
                        >
                            🔴 P1
                        </Button>
                        <Button
                            variant={priorityFilter === 2 ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPriorityFilter(2)}
                            className={priorityFilter === 2 ? '' : 'hover:bg-yellow-50'}
                        >
                            🟡 P2
                        </Button>
                        <Button
                            variant={priorityFilter === 3 ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPriorityFilter(3)}
                            className={priorityFilter === 3 ? '' : 'hover:bg-blue-50'}
                        >
                            🔵 P3
                        </Button>
                        <Button
                            variant={priorityFilter === 4 ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPriorityFilter(4)}
                            className={priorityFilter === 4 ? '' : 'hover:bg-gray-50'}
                        >
                            ⚪ P4
                        </Button>

                        {/* Category Filter Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant={categoryFilter === 'all' ? 'outline' : 'default'} size="sm">
                                    <Filter className="h-4 w-4 mr-2" />
                                    {categoryFilter === 'all' ? 'Kategori' : categoryLabels[categoryFilter]}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setCategoryFilter('all')}>
                                    Alla kategorier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setCategoryFilter('Operations')}>
                                    {categoryLabels.Operations}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCategoryFilter('Finance')}>
                                    {categoryLabels.Finance}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCategoryFilter('HR')}>
                                    {categoryLabels.HR}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCategoryFilter('Safety')}>
                                    {categoryLabels.Safety}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Selection Mode Toggle */}
                        <Button
                            variant={selectionMode ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                                setSelectionMode(!selectionMode)
                                setSelectedTasks(new Set())
                            }}
                        >
                            <CheckSquare className="h-4 w-4 mr-2" />
                            {selectionMode ? 'Avmarkera alla' : 'Markera flera'}
                        </Button>
                    </div>
                </div>

                {filteredMonthTasks.filter(t => t.status !== 'done').length === 0 ? (
                    <div className="text-center py-12 bg-secondary/30 rounded-lg">
                        <p className="text-muted-foreground">
                            {priorityFilter === 'all' ? 'Inga aktiva uppgifter för denna månad' : `Inga ${priorityFilter === 1 ? 'P1' : priorityFilter === 2 ? 'P2' : priorityFilter === 3 ? 'P3' : 'P4'}-uppgifter`}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredMonthTasks.filter(task => task.status !== 'done').map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onStatusChange={handleStatusChange}
                                onPriorityChange={handlePriorityChange}
                                selectionMode={selectionMode}
                                isSelected={selectedTasks.has(task.id)}
                                onToggleSelect={toggleTaskSelection}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Completed Tasks Section */}
            {filteredMonthTasks.filter(t => t.status === 'done').length === 0 ? (
                <div className="text-center py-12 bg-secondary/30 rounded-lg">
                    <p className="text-muted-foreground">
                        Inga klara uppgifter för denna månad
                    </p>
                </div>
            ) : (
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-semibold">Klara uppgifter</h3>
                        <span className="text-sm text-muted-foreground">
                            ({filteredMonthTasks.filter(t => t.status === 'done').length})
                        </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredMonthTasks.filter(task => task.status === 'done').map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onStatusChange={handleStatusChange}
                                onPriorityChange={handlePriorityChange}
                                selectionMode={selectionMode}
                                isSelected={selectedTasks.has(task.id)}
                                onToggleSelect={toggleTaskSelection}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Status Overview */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">
                        Tertial {currentTertial} Översikt
                    </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <StatusOverview
                        tasks={monthTasks}
                        title={`${monthName} Progress`}
                    />
                    <StatusOverview
                        tasks={tertialTasks}
                        title={`Tertial {currentTertial} Progress`}
                    />
                </div>
            </section>
        </div>
    )
}
