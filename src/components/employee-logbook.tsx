"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Calendar, User, FileText, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react"

interface Note {
    id: string
    content: string
    note_type: 'general' | 'performance' | 'check_in' | 'incident' | 'development'
    event_date: string
    created_at: string
    author: {
        full_name: string
        role: string
    }
}

const TYPE_CONFIG = {
    general: { label: 'Allmänt', icon: FileText, color: 'text-slate-500', bg: 'bg-slate-100' },
    performance: { label: 'Prestation', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-100' },
    check_in: { label: 'Avstämning', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100' },
    incident: { label: 'Händelse', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' },
    development: { label: 'Utveckling', icon: User, color: 'text-purple-500', bg: 'bg-purple-100' }
}

export function EmployeeLogbook({ employeeId }: { employeeId: string }) {
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [content, setContent] = useState("")
    const [type, setType] = useState<string>("general")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    useEffect(() => {
        loadNotes()
    }, [employeeId])

    const loadNotes = async () => {
        try {
            const res = await fetch(`/api/employees/${employeeId}/notes`)
            if (!res.ok) throw new Error('Failed to load notes')
            const data = await res.json()
            setNotes(data.notes || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!content.trim()) return

        setSubmitting(true)
        try {
            const res = await fetch(`/api/employees/${employeeId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    note_type: type,
                    event_date: date
                })
            })

            if (res.ok) {
                setContent("")
                // Reload notes to show the new one
                loadNotes()
            }
        } catch (error) {
            console.error(error)
            alert("Kunde inte spara anteckningen")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
    }

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {/* Timeline (Left/Center) */}
            <div className="md:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Loggbok
                    </h3>
                    <Badge variant="outline" className="text-muted-foreground">
                        {notes.length} anteckningar
                    </Badge>
                </div>

                <div className="space-y-4">
                    {notes.length === 0 ? (
                        <Card className="bg-muted/30 border-dashed">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                <p>Inga anteckningar än.</p>
                                <p className="text-sm">Använd formuläret för att logga händelser, samtal eller minnesanteckningar.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="relative border-l border-muted ml-3 space-y-8 pb-8">
                            {notes.map((note) => {
                                const Config = TYPE_CONFIG[note.note_type]
                                return (
                                    <div key={note.id} className="relative pl-8">
                                        {/* Timeline dot */}
                                        <div className={`absolute left-[-9px] top-1 h-4 w-4 rounded-full border-2 border-background ${Config.bg} ${Config.color}`}>
                                            <Config.icon className="h-3 w-3 m-[1px]" />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className="font-medium text-foreground">
                                                    {new Date(note.event_date).toLocaleDateString('sv-SE')}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary">
                                                    {Config.label}
                                                </span>
                                                <span className="ml-auto text-xs">
                                                    Skrivet av {note.author?.full_name}
                                                </span>
                                            </div>

                                            <div className="bg-card border rounded-lg p-4 shadow-sm mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                                                {note.content}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Input Form (Right Sidebar) */}
            <div className="md:col-span-1">
                <Card className="sticky top-6">
                    <CardHeader>
                        <CardTitle className="text-base">Ny anteckning</CardTitle>
                        <CardDescription>Logga händelse eller samtal</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Typ</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                                        <SelectItem key={key} value={key}>
                                            <div className="flex items-center gap-2">
                                                <config.icon className="h-4 w-4" />
                                                {config.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">Datum</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">Anteckning</Label>
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Skriv din minnesanteckning här..."
                                className="min-h-[150px]"
                            />
                        </div>

                        <Button
                            className="w-full"
                            disabled={submitting || !content.trim()}
                            onClick={handleSubmit}
                        >
                            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Spara till personakt
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
