"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Task } from "@/lib/types"
import { TaskForm } from "@/components/task-form"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"

interface Station {
    id: string
    name: string
    vo_id: string
}

export default function VONewTaskPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()
    const [stations, setStations] = useState<Station[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadStations() {
            try {
                const res = await fetch('/api/admin/stations')
                if (res.ok) {
                    const data = await res.json()
                    // Filter stations for the VO chief's VO
                    if (profile?.vo_id) {
                        setStations(data.stations?.filter((s: Station) => s.vo_id === profile.vo_id) || [])
                    } else {
                        setStations(data.stations || [])
                    }
                }
            } catch (err) {
                console.error('Failed to load stations:', err)
            } finally {
                setLoading(false)
            }
        }

        if (profile) {
            loadStations()
        }
    }, [profile])

    // Redirect if not VO chief or admin
    useEffect(() => {
        if (!authLoading && profile && profile.role !== 'vo_chief' && profile.role !== 'admin') {
            router.push('/')
        }
    }, [authLoading, profile, router])

    const handleSubmit = async (data: Partial<Task>) => {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })

        if (res.ok) {
            const result = await res.json()
            router.push(`/tasks/${result.task.id}`)
        } else {
            const error = await res.json()
            alert(error.error || 'Kunde inte skapa uppgiften')
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
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tillbaka
                </Button>
                <h1 className="text-2xl font-bold">Skapa ny uppgift</h1>
            </div>

            <div className="bg-card rounded-lg border p-6">
                <TaskForm
                    stations={stations}
                    voId={profile?.vo_id || undefined}
                    userRole={profile?.role || 'vo_chief'}
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                />
            </div>

            <div className="text-sm text-muted-foreground p-4 bg-secondary/30 rounded-lg">
                <p className="font-medium mb-2">Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>VO-uppgift:</strong> Gäller för hela verksamhetsområdet</li>
                    <li><strong>Personlig:</strong> Endast synlig för dig som VO-chef</li>
                </ul>
            </div>
        </div>
    )
}
