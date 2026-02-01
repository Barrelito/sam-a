"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMonthName, getCurrentMonth, getTertial } from "@/lib/utils"
import { TaskCard } from "@/components/task-card"
import { StatusOverview } from "@/components/status-overview"
import { StationFilter } from "@/components/station-filter"
import { Task, TaskStatus, StationGroup } from "@/lib/types"
import { CalendarDays, TrendingUp, Loader2, FolderOpen, CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()

    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
    const [stationGroups, setStationGroups] = useState<StationGroup[]>([])
    const [userStationGroup, setUserStationGroup] = useState<StationGroup | null>(null)

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

            {/* Current Focus Section - Active Tasks */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">
                        Uppgifter för {monthName}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                        ({monthTasks.filter(t => t.status !== 'done').length} aktiva)
                    </span>
                </div>

                {monthTasks.filter(t => t.status !== 'done').length === 0 ? (
                    <div className="text-center py-12 bg-secondary/30 rounded-lg">
                        <p className="text-muted-foreground">
                            Inga aktiva uppgifter för denna månad
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {monthTasks
                            .filter(task => task.status !== 'done')
                            .map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onStatusChange={handleStatusChange}
                                />
                            ))}
                    </div>
                )}
            </section>

            {/* Completed Tasks Section */}
            {monthTasks.filter(t => t.status === 'done').length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h2 className="text-xl font-semibold">
                            Klara uppgifter för {monthName}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            ({monthTasks.filter(t => t.status === 'done').length} klara)
                        </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {monthTasks
                            .filter(task => task.status === 'done')
                            .map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onStatusChange={handleStatusChange}
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
