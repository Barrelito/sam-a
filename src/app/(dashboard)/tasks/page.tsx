"use client"

import { useState } from "react"
import { mockTasks } from "@/lib/mock-data"
import { getMonthName } from "@/lib/utils"
import { TaskCard } from "@/components/task-card"
import { RecurringTask, TaskStatus, TaskCategory } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ListFilter } from "lucide-react"

const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const categories: TaskCategory[] = ['HR', 'Finance', 'Safety', 'Operations']
const statuses: TaskStatus[] = ['not_started', 'in_progress', 'done']

const statusLabels: Record<TaskStatus, string> = {
    not_started: 'Ej Påbörjad',
    in_progress: 'Pågående',
    done: 'Klar'
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<RecurringTask[]>(mockTasks)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null)
    const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null)

    const filteredTasks = tasks.filter(task => {
        if (selectedMonth !== null && task.month !== selectedMonth && !task.is_recurring_monthly) {
            return false
        }
        if (selectedCategory && task.category !== selectedCategory) {
            return false
        }
        if (selectedStatus && task.status !== selectedStatus) {
            return false
        }
        return true
    })

    const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
        setTasks(prev => prev.map(task =>
            task.id === taskId
                ? { ...task, status: newStatus, updated_at: new Date().toISOString() }
                : task
        ))
    }

    const clearFilters = () => {
        setSelectedMonth(null)
        setSelectedCategory(null)
        setSelectedStatus(null)
    }

    // Group tasks by month
    const tasksByMonth = filteredTasks.reduce((acc, task) => {
        const key = task.is_recurring_monthly ? 'recurring' : String(task.month)
        if (!acc[key]) acc[key] = []
        acc[key].push(task)
        return acc
    }, {} as Record<string, RecurringTask[]>)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Alla Uppgifter</h1>
                <p className="text-muted-foreground mt-1">
                    Komplett översikt av årshjulets uppgifter
                </p>
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
                                variant={selectedCategory === category ? category : "outline"}
                                className="cursor-pointer"
                                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                            >
                                {category}
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
                                variant={selectedStatus === status ? status : "outline"}
                                className="cursor-pointer"
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
                                {key === 'recurring' ? 'Månatligt Återkommande' : getMonthName(Number(key))}
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    ({monthTasks.length} uppgifter)
                                </span>
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {monthTasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onStatusChange={handleStatusChange}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}

                {filteredTasks.length === 0 && (
                    <div className="text-center py-12 bg-secondary/30 rounded-lg">
                        <p className="text-muted-foreground">
                            Inga uppgifter matchar dina filter
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
