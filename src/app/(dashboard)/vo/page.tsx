"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Task, statusLabels, statusColors, categoryLabels, categoryColors } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { DistributeDialog } from "@/components/distribute-dialog"
import {
    Building2,
    MapPin,
    Plus,
    Loader2,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    ChevronRight,
    ListTodo,
    Share2,
    Users
} from "lucide-react"
import { getMonthName, getCurrentMonth } from "@/lib/utils"

interface Station {
    id: string
    name: string
    vo_id: string
}

interface StationStats {
    station: Station
    total: number
    done: number
    inProgress: number
    notStarted: number
    percentage: number
}

export default function VODashboardPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [stations, setStations] = useState<Station[]>([])
    const [loading, setLoading] = useState(true)

    // Distribution dialog state
    const [distributeTask, setDistributeTask] = useState<Task | null>(null)

    // Show all tasks to distribute
    const [showAllToDistribute, setShowAllToDistribute] = useState(false)

    const currentMonth = getCurrentMonth()
    const monthName = getMonthName(currentMonth)

    const loadData = async () => {
        try {
            const [tasksRes, stationsRes] = await Promise.all([
                fetch(`/api/tasks?year=${new Date().getFullYear()}`),
                fetch('/api/admin/stations')
            ])

            if (tasksRes.ok) {
                const data = await tasksRes.json()
                setTasks(data.tasks || [])
            }

            if (stationsRes.ok) {
                const data = await stationsRes.json()
                // Filter to only VO's stations
                if (profile?.vo_id) {
                    setStations(data.stations?.filter((s: Station) => s.vo_id === profile.vo_id) || [])
                } else {
                    setStations(data.stations || [])
                }
            }
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (profile) {
            loadData()
        }
    }, [profile])

    // Redirect if not VO chief or admin
    useEffect(() => {
        if (!authLoading && profile && profile.role !== 'vo_chief' && profile.role !== 'admin') {
            router.push('/')
        }
    }, [authLoading, profile, router])

    if (authLoading || loading || (profile?.role !== 'vo_chief' && profile?.role !== 'admin')) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Separate VO tasks (templates) from station tasks
    const voTasks = tasks.filter(t => t.owner_type === 'vo')
    const stationTasks = tasks.filter(t => t.owner_type === 'station')

    // VO tasks without children (not yet distributed)
    const tasksToDistribute = voTasks.filter(t => {
        const hasChildren = stationTasks.some(st => st.parent_task_id === t.id)
        return !hasChildren
    })

    // VO tasks with children (already distributed)
    const distributedVOTasks = voTasks.filter(t => {
        const hasChildren = stationTasks.some(st => st.parent_task_id === t.id)
        return hasChildren
    })

    // Filter for current month (for distributed tasks tracking)
    const currentMonthTasks = stationTasks.filter(t => {
        if (t.is_recurring_monthly) return true
        if (!t.start_month) return false
        const end = t.end_month || t.start_month
        return currentMonth >= t.start_month && currentMonth <= end
    })

    // Calculate stats per station
    const stationStats: StationStats[] = stations.map(station => {
        const sTasks = currentMonthTasks.filter(t => t.station_id === station.id)
        const done = sTasks.filter(t => t.status === 'done' || t.status === 'reported').length
        const inProgress = sTasks.filter(t => t.status === 'in_progress').length
        const notStarted = sTasks.filter(t => t.status === 'not_started').length
        const total = sTasks.length
        const percentage = total > 0 ? Math.round((done / total) * 100) : 0

        return {
            station,
            total,
            done,
            inProgress,
            notStarted,
            percentage
        }
    })

    // Tasks needing review
    const needsReview = stationTasks.filter(t =>
        t.status === 'done' &&
        !t.vo_reviewed
    )

    // Overall stats
    const totalTasks = currentMonthTasks.length
    const completedTasks = currentMonthTasks.filter(t => t.status === 'done' || t.status === 'reported').length
    const overallPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Get distribution progress for a VO task
    const getDistributionProgress = (voTask: Task) => {
        const children = stationTasks.filter(t => t.parent_task_id === voTask.id)
        const done = children.filter(t => t.status === 'done' || t.status === 'reported').length
        return { done, total: children.length }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-primary" />
                        VO Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {profile?.verksamhetsomraden?.name || 'Verksamhetsområde'} - Översikt för {monthName}
                    </p>
                </div>
                <Button onClick={() => router.push('/vo/tasks/new')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ny uppgift
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total progress</p>
                                <p className="text-3xl font-bold">{overallPercentage}%</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-primary opacity-80" />
                        </div>
                        <Progress value={overallPercentage} className="mt-3" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Klara uppgifter</p>
                                <p className="text-3xl font-bold text-green-600">{completedTasks}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-600 opacity-80" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">av {totalTasks} denna månad</p>
                    </CardContent>
                </Card>

                <Card className={tasksToDistribute.length > 0 ? "border-amber-200" : ""}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Att fördela</p>
                                <p className="text-3xl font-bold text-amber-600">{tasksToDistribute.length}</p>
                            </div>
                            <Share2 className="h-8 w-8 text-amber-600 opacity-80" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">VO-uppgifter</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Behöver granskning</p>
                                <p className="text-3xl font-bold">{needsReview.length}</p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-primary opacity-80" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">stationsuppgifter</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tasks to Distribute */}
            {tasksToDistribute.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                            <Share2 className="h-5 w-5" />
                            Att fördela till stationer ({tasksToDistribute.length})
                        </CardTitle>
                        <CardDescription>
                            Dessa VO-uppgifter har inte fördelats till stationer än
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {(showAllToDistribute ? tasksToDistribute : tasksToDistribute.slice(0, 5)).map(task => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                                >
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => router.push(`/tasks/${task.id}`)}
                                    >
                                        <div>
                                            <p className="font-medium hover:text-primary transition-colors">{task.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className={`text-xs ${categoryColors[task.category]}`}>
                                                    {categoryLabels[task.category]}
                                                </Badge>
                                                {task.start_month && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {getMonthName(task.start_month)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setDistributeTask(task)
                                        }}
                                    >
                                        <Share2 className="h-4 w-4 mr-1" />
                                        Fördela
                                    </Button>
                                </div>
                            ))}
                            {tasksToDistribute.length > 5 && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setShowAllToDistribute(!showAllToDistribute)}
                                >
                                    {showAllToDistribute
                                        ? 'Visa färre'
                                        : `Visa alla ${tasksToDistribute.length} uppgifter`
                                    }
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Distributed Tasks Progress */}
            {distributedVOTasks.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Fördelade uppgifter
                        </CardTitle>
                        <CardDescription>
                            Sammanställning av uppgifter som fördelats till stationer
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {distributedVOTasks.slice(0, 6).map(task => {
                                const progress = getDistributionProgress(task)
                                const percent = progress.total > 0
                                    ? Math.round((progress.done / progress.total) * 100)
                                    : 0

                                return (
                                    <div
                                        key={task.id}
                                        className="p-3 bg-secondary/30 rounded-lg"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{task.title}</span>
                                                <Badge variant="outline" className={`text-xs ${categoryColors[task.category]}`}>
                                                    {categoryLabels[task.category]}
                                                </Badge>
                                            </div>
                                            <span className="text-sm font-medium">
                                                {progress.done}/{progress.total} klara
                                            </span>
                                        </div>
                                        <Progress value={percent} className="h-2" />
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Needs Review Section */}
            {needsReview.length > 0 && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                            <AlertCircle className="h-5 w-5" />
                            Väntar på granskning ({needsReview.length})
                        </CardTitle>
                        <CardDescription>
                            Dessa stationsuppgifter är markerade som klara och väntar på din granskning
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {needsReview.slice(0, 5).map(task => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:shadow-sm transition-shadow"
                                    onClick={() => router.push(`/tasks/${task.id}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="font-medium">{task.title}</p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                {task.station?.name}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            ))}
                            {needsReview.length > 5 && (
                                <Button variant="ghost" className="w-full">
                                    Visa alla {needsReview.length} uppgifter
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Station Overview */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Stationsöversikt
                </h2>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stationStats.map(({ station, total, done, inProgress, notStarted, percentage }) => (
                        <Card
                            key={station.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => router.push(`/vo/station/${station.id}`)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-primary" />
                                        {station.name}
                                    </CardTitle>
                                    <span className="text-2xl font-bold">{percentage}%</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Progress value={percentage} />
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span>{done} klara</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                        <span>{inProgress} pågående</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                                        <span>{notStarted} kvar</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Distribute Dialog */}
            {distributeTask && (
                <DistributeDialog
                    open={!!distributeTask}
                    onOpenChange={(open) => !open && setDistributeTask(null)}
                    task={{
                        id: distributeTask.id,
                        title: distributeTask.title,
                        vo_id: distributeTask.vo_id!
                    }}
                    onSuccess={() => {
                        setDistributeTask(null)
                        loadData()
                    }}
                />
            )}
        </div>
    )
}
