"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { mockTasks } from "@/lib/mock-data"
import { getMonthName, getCurrentMonth, getTertial } from "@/lib/utils"
import { TaskCard } from "@/components/task-card"
import { StatusOverview } from "@/components/status-overview"
import { RecurringTask, TaskStatus } from "@/lib/types"
import { CalendarDays, TrendingUp, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function DashboardPage() {
    const router = useRouter()
    const { profile, loading } = useAuth()

    // All hooks must be called before any conditional returns
    const [tasks, setTasks] = useState<RecurringTask[]>(mockTasks)

    const currentMonth = getCurrentMonth()
    const currentTertial = getTertial(currentMonth)
    const monthName = getMonthName(currentMonth)

    // Redirect admin to admin page
    useEffect(() => {
        if (!loading && profile?.role === 'admin') {
            router.push('/admin')
        }
    }, [loading, profile, router])

    // Show loading while checking auth or if admin
    if (loading || profile?.role === 'admin') {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const monthTasks = tasks.filter(
        task => task.month === currentMonth || task.is_recurring_monthly
    )

    const tertialTasks = tasks.filter(task => task.tertial === currentTertial)

    const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
        setTasks(prev => prev.map(task =>
            task.id === taskId
                ? { ...task, status: newStatus, updated_at: new Date().toISOString() }
                : task
        ))
    }

    // Determine dashboard title
    let dashboardTitle = "Ambulansledning"
    if (profile?.role === 'vo_chief' && profile.verksamhetsomraden) {
        dashboardTitle = `Ambulansledning - ${profile.verksamhetsomraden.name}`
    } else if ((profile?.role === 'station_manager' || profile?.role === 'assistant_manager') && profile?.user_stations && profile.user_stations.length > 0) {
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
