"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { TaskCard } from "@/components/task-card"
import { Task, TaskStatus, TaskPriority, getDaysUntilDeadline } from "@/lib/types"
import { User, Loader2, AlertTriangle, CheckCircle, Clock, ListChecks, UserX, ChevronDown, ChevronRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

const getCurrentMonth = () => new Date().getMonth() + 1
const getMonthNameFull = (m: number) => {
    const names = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']
    return names[m - 1] || `Månad ${m}`
}

export default function MyTasksPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()
    const { toast } = useToast()

    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
    const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

    const currentMonth = getCurrentMonth()

    const fetchTasks = useCallback(async () => {
        if (authLoading || !profile) return
        try {
            const res = await fetch('/api/tasks')
            if (res.ok) {
                const data = await res.json()
                // My tasks: assigned to me only
                const myTasks = (data.tasks || []).filter((task: Task) =>
                    task.assigned_to === profile.id
                )
                setTasks(myTasks)
            }
        } catch (err) {
            console.error('Error fetching tasks:', err)
        } finally {
            setLoading(false)
        }
    }, [authLoading, profile])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        const task = tasks.find(t => t.id === taskId)
        if (!task) return
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))

        try {
            if (task.is_annual_cycle) {
                const withoutPrefix = taskId.slice('annual-'.length)
                const itemId = withoutPrefix.length === 73 ? withoutPrefix.slice(0, 36) : withoutPrefix
                const stationId = task.station_id || null
                let apiStatus = 'completed'
                if (newStatus === 'in_progress') apiStatus = 'in_progress'
                if (newStatus === 'not_started') apiStatus = 'todo'
                await fetch('/api/annual-cycle/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId, stationId, year: task.year, status: apiStatus }),
                })
            } else {
                await fetch(`/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                })
            }
        } catch (err) {
            console.error('Error updating status:', err)
            fetchTasks() // Rollback
        }
    }

    const handlePriorityChange = async (taskId: string, newPriority: TaskPriority) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority: newPriority } : t))
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority: newPriority }),
            })
        } catch (err) {
            console.error('Error updating priority:', err)
            fetchTasks()
        }
    }

    const handleTaskClick = (task: Task) => {
        if (task.is_annual_cycle && task.action_link && !task.station_id) {
            router.push(task.action_link)
        } else {
            router.push(`/tasks/${task.id}`)
        }
    }

    const toggleMonthCollapse = (key: string) => {
        setCollapsedMonths(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Apply priority filter
    const filteredTasks = priorityFilter === 'all'
        ? tasks
        : tasks.filter(t => t.priority === priorityFilter)

    // Risk tasks: overdue or unassigned (shouldn't happen for "mine", but overdue is relevant)
    const overdueTasks = filteredTasks.filter(t =>
        t.status !== 'done' && t.deadline_day && getDaysUntilDeadline(t.deadline_day).text.includes('sen')
    )

    // Group by month
    const tasksByMonth = filteredTasks.reduce((acc, task) => {
        const key = task.is_recurring_monthly ? 'recurring'
            : task.instance_month ? String(task.instance_month)
                : String(task.start_month || 0)
        if (!acc[key]) acc[key] = []
        acc[key].push(task)
        return acc
    }, {} as Record<string, Task[]>)

    const sortedGroups = Object.entries(tasksByMonth).sort((a, b) => {
        if (a[0] === 'recurring') return 1
        if (b[0] === 'recurring') return -1
        return Number(a[0]) - Number(b[0])
    })

    // Stats
    const totalActive = tasks.filter(t => t.status !== 'done').length
    const totalDone = tasks.filter(t => t.status === 'done').length
    const completionRate = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0
    const p1Count = tasks.filter(t => t.priority === 1 && t.status !== 'done').length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mina Uppgifter</h1>
                    <p className="text-muted-foreground mt-1">
                        Uppgifter tilldelade till dig
                    </p>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">{totalActive}</div>
                                <div className="text-xs text-muted-foreground mt-1">Aktiva uppgifter</div>
                            </div>
                            <Clock className="h-7 w-7 text-primary/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-green-600">{totalDone}</div>
                                <div className="text-xs text-muted-foreground mt-1">Klara</div>
                            </div>
                            <CheckCircle className="h-7 w-7 text-green-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">{completionRate}%</div>
                                <div className="text-xs text-muted-foreground mt-1">Slutförandegrad</div>
                            </div>
                            <ListChecks className="h-7 w-7 text-primary/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className={p1Count > 0 ? 'border-red-200 bg-red-50/50' : ''}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className={`text-2xl font-bold ${p1Count > 0 ? 'text-red-600' : ''}`}>{p1Count}</div>
                                <div className="text-xs text-muted-foreground mt-1">🔴 P1 kvar</div>
                            </div>
                            <AlertTriangle className={`h-7 w-7 ${p1Count > 0 ? 'text-red-200' : 'text-muted/30'}`} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Overdue alert */}
            {overdueTasks.length > 0 && (
                <section className="space-y-2">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <h2 className="text-base font-semibold text-orange-700">
                            {overdueTasks.length} försenad{overdueTasks.length !== 1 ? 'e' : ''} uppgift{overdueTasks.length !== 1 ? 'er' : ''}
                        </h2>
                    </div>
                    <div className="space-y-2">
                        {overdueTasks.map(task => {
                            const dl = getDaysUntilDeadline(task.deadline_day!)
                            return (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50/60 cursor-pointer hover:bg-orange-100/60 transition-colors"
                                    onClick={() => handleTaskClick(task)}
                                >
                                    <span className="text-sm font-medium truncate">{task.title}</span>
                                    <Badge variant="outline" className="border-red-300 text-red-600 bg-white text-xs ml-2 flex-shrink-0">
                                        {dl.text}
                                    </Badge>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* Priority filter */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Prioritet:</span>
                {(['all', 1, 2, 3, 4] as const).map(p => (
                    <Button
                        key={String(p)}
                        variant={priorityFilter === p ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPriorityFilter(p)}
                    >
                        {p === 'all' ? 'Alla' : p === 1 ? '🔴 P1' : p === 2 ? '🟡 P2' : p === 3 ? '🔵 P3' : '⚪ P4'}
                    </Button>
                ))}
            </div>

            {/* Empty state */}
            {tasks.length === 0 && (
                <div className="text-center py-16 bg-secondary/30 rounded-lg">
                    <UserX className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                    <p className="font-medium text-muted-foreground">Du har inga tilldelade uppgifter just nu</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Uppgifter tilldelade till dig dyker upp här</p>
                </div>
            )}

            {filteredTasks.length === 0 && tasks.length > 0 && (
                <div className="text-center py-8 bg-secondary/20 rounded-lg">
                    <p className="text-muted-foreground text-sm">Inga uppgifter matchar filtret</p>
                </div>
            )}

            {/* Monthly groups */}
            <div className="space-y-6">
                {sortedGroups.map(([key, monthTasks]) => {
                    const monthNum = key === 'recurring' ? null : Number(key)
                    const isCurrentMonth = monthNum === currentMonth
                    const label = key === 'recurring' ? 'Löpande uppgifter'
                        : key === '0' ? 'Utan månad'
                            : getMonthNameFull(monthNum!)
                    const activeTasks = monthTasks.filter(t => t.status !== 'done')
                    const doneTasks = monthTasks.filter(t => t.status === 'done')
                    const isCollapsed = collapsedMonths.has(key)

                    return (
                        <section key={key} className="space-y-3">
                            {/* Month header */}
                            <button
                                className="w-full flex items-center gap-2 text-left group"
                                onClick={() => toggleMonthCollapse(key)}
                            >
                                {isCollapsed
                                    ? <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                }
                                <h2 className={`text-lg font-semibold border-b pb-1 flex-1 flex items-center gap-2 ${isCurrentMonth ? 'text-primary' : ''}`}>
                                    {label}
                                    {isCurrentMonth && (
                                        <Badge variant="secondary" className="text-xs h-5">Denna månad</Badge>
                                    )}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        ({activeTasks.length} aktiva{doneTasks.length > 0 ? `, ${doneTasks.length} klara` : ''})
                                    </span>
                                </h2>
                            </button>

                            {!isCollapsed && (
                                <div className="space-y-4">
                                    {/* Active tasks */}
                                    {activeTasks.length > 0 && (
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {activeTasks.map(task => (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    onStatusChange={handleStatusChange}
                                                    onPriorityChange={task.is_annual_cycle ? undefined : handlePriorityChange}
                                                    onClick={() => handleTaskClick(task)}
                                                    showStation={false}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Done tasks (collapsed by default if there are active ones) */}
                                    {doneTasks.length > 0 && (
                                        <details className="group/done">
                                            <summary className="cursor-pointer text-sm text-muted-foreground flex items-center gap-1 list-none hover:text-foreground transition-colors">
                                                <ChevronRight className="h-3.5 w-3.5 group-open/done:rotate-90 transition-transform" />
                                                {doneTasks.length} klar{doneTasks.length !== 1 ? 'a' : ''} uppgift{doneTasks.length !== 1 ? 'er' : ''}
                                            </summary>
                                            <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                {doneTasks.map(task => (
                                                    <TaskCard
                                                        key={task.id}
                                                        task={task}
                                                        onStatusChange={handleStatusChange}
                                                        onClick={() => handleTaskClick(task)}
                                                        showStation={false}
                                                    />
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            )}
                        </section>
                    )
                })}
            </div>
        </div>
    )
}
