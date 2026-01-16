"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TaskCard } from "@/components/task-card"
import { StatusOverview } from "@/components/status-overview"
import { Task, TaskStatus } from "@/lib/types"
import { User, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function MyTasksPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTasks = async () => {
            if (authLoading || !profile) return

            try {
                const res = await fetch('/api/tasks')
                if (res.ok) {
                    const data = await res.json()
                    // Filter tasks assigned to the current user
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
        }

        fetchTasks()
    }, [authLoading, profile])

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

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
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
