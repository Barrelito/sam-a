"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMonthName, getCurrentMonth, getTertial } from "@/lib/utils"
import { TaskCard } from "@/components/task-card"
import { StatusOverview } from "@/components/status-overview"
import { Task, TaskStatus } from "@/lib/types"
import { CalendarDays, TrendingUp, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function DashboardPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()

    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    const currentMonth = getCurrentMonth()
    const currentTertial = getTertial(currentMonth)
    const monthName = getMonthName(currentMonth)

    // Fetch tasks for the current user
    useEffect(() => {
        const fetchTasks = async () => {
            if (authLoading || !profile) return

            try {
                const res = await fetch('/api/tasks')
                if (res.ok) {
                    const data = await res.json()
                    // Filter tasks for station managers:
                    // 1. Station tasks for their station(s)
                    // 2. Tasks assigned to them
                    // 3. Personal tasks they created
                    const userStationIds = profile.user_stations?.map(us => us.station.id) || []

                    let filteredTasks = data.tasks || []

                    if (profile.role === 'station_manager' || profile.role === 'assistant_manager') {
                        filteredTasks = filteredTasks.filter((task: Task) => {
                            // Show station tasks for their station(s)
                            if (task.owner_type === 'station' && task.station_id && userStationIds.includes(task.station_id)) {
                                return true
                            }
                            // Show tasks assigned to them
                            if (task.assigned_to === profile.id) {
                                return true
                            }
                            // Show personal tasks they created
                            if (task.owner_type === 'personal' && task.created_by === profile.id) {
                                return true
                            }
                            return false
                        })
                    }

                    setTasks(filteredTasks)
                }
            } catch (err) {
                console.error('Error fetching tasks:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchTasks()
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

    // Filter tasks for current month
    const monthTasks = tasks.filter(task => {
        // Match tasks for current month
        if (task.is_recurring_monthly) return true
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

    const tertialTasks = tasks.filter(task => {
        if (task.is_recurring_monthly) return true
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
    if ((profile?.role === 'station_manager' || profile?.role === 'assistant_manager') && profile?.user_stations && profile.user_stations.length > 0) {
        const stationNames = profile.user_stations.map(us => us.station.name).join(' & ')
        dashboardTitle = `Ambulansledning - Station ${stationNames}`
    } else if (profile?.verksamhetsomraden) {
        dashboardTitle = `Ambulansledning - ${profile.verksamhetsomraden.name}`
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    {dashboardTitle}
                </h1>
                <p className="text-muted-foreground mt-1">
                    Digitalt årshjul och uppgiftshantering
                </p>
            </div>

            {/* Current Focus Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">
                        Uppgifter för {monthName}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                        ({monthTasks.length} uppgifter)
                    </span>
                </div>

                {monthTasks.length === 0 ? (
                    <div className="text-center py-12 bg-secondary/30 rounded-lg">
                        <p className="text-muted-foreground">
                            Inga uppgifter för denna månad
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {monthTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onStatusChange={handleStatusChange}
                            />
                        ))}
                    </div>
                )}
            </section>

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
                        title={`Tertial ${currentTertial} Progress`}
                    />
                </div>
            </section>
        </div>
    )
}
