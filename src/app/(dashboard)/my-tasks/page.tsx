"use client"

import { useState } from "react"
import { mockTasks } from "@/lib/mock-data"
import { TaskCard } from "@/components/task-card"
import { StatusOverview } from "@/components/status-overview"
import { RecurringTask, TaskStatus } from "@/lib/types"
import { User } from "lucide-react"

// For now, simulating a logged-in user
const CURRENT_USER_ID = "user-1"

export default function MyTasksPage() {
    const [tasks, setTasks] = useState<RecurringTask[]>(
        // In real app, filter by assigned_to === currentUser.id
        // For demo, show first 4 tasks as "my tasks"
        mockTasks.slice(0, 4).map(t => ({ ...t, assigned_to: CURRENT_USER_ID }))
    )

    const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
        setTasks(prev => prev.map(task =>
            task.id === taskId
                ? { ...task, status: newStatus, updated_at: new Date().toISOString() }
                : task
        ))
    }

    return (
        <div className="space-y-8">
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

            {/* Status Overview */}
            <StatusOverview tasks={tasks} title="Min Progress" />

            {/* Task List */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Tilldelade Uppgifter</h2>

                {tasks.length === 0 ? (
                    <div className="text-center py-12 bg-secondary/30 rounded-lg">
                        <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">
                            Du har inga tilldelade uppgifter just nu
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onStatusChange={handleStatusChange}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
