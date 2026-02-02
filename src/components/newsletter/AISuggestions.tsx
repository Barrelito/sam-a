"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Cake, ListTodo, Calendar, TrendingUp, Plus, Loader2 } from 'lucide-react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/components/ui/collapsible'

interface Suggestions {
    birthdays: { name: string; date: string }[]
    upcomingTasks: { title: string; due_date: string; category: string }[]
    seasonalReminders: string[]
    stats: {
        completedLastWeek: number
        pendingTasks: number
    }
}

interface AISuggestionsProps {
    newsletterId: string
    onAddBullet: (bullet: string) => void
}

export default function AISuggestions({ newsletterId, onAddBullet }: AISuggestionsProps) {
    const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(true)

    useEffect(() => {
        loadSuggestions()
    }, [newsletterId])

    const loadSuggestions = async () => {
        try {
            const res = await fetch(`/api/chefstod/newsletters/${newsletterId}/suggestions`)
            if (res.ok) {
                const data = await res.json()
                setSuggestions(data.suggestions)
            }
        } catch (error) {
            console.error('Error loading suggestions:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    if (!suggestions) return null

    const hasAnySuggestions =
        suggestions.birthdays.length > 0 ||
        suggestions.upcomingTasks.length > 0 ||
        suggestions.seasonalReminders.length > 0

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-3">
                    <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-600" />
                            <CardTitle className="text-lg">AI-förslag</CardTitle>
                            {hasAnySuggestions && (
                                <Badge variant="secondary" className="ml-2">
                                    {(suggestions.birthdays.length + suggestions.upcomingTasks.length + suggestions.seasonalReminders.length)} förslag
                                </Badge>
                            )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {isOpen ? 'Dölj' : 'Visa'}
                        </span>
                    </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        {!hasAnySuggestions ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Inga specifika förslag denna vecka
                            </p>
                        ) : (
                            <>
                                {/* Birthdays */}
                                {suggestions.birthdays.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Cake className="h-4 w-4 text-pink-500" />
                                            <span>Födelsedagar denna vecka</span>
                                        </div>
                                        <div className="space-y-1">
                                            {suggestions.birthdays.map((birthday, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-2 border">
                                                    <span className="text-sm">{birthday.name}</span>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onAddBullet(`Grattis på födelsedagen ${birthday.name}! 🎂`)}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Lägg till
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Upcoming Tasks */}
                                {suggestions.upcomingTasks.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <ListTodo className="h-4 w-4 text-blue-500" />
                                            <span>Kommande uppgifter</span>
                                        </div>
                                        <div className="space-y-1">
                                            {suggestions.upcomingTasks.slice(0, 3).map((task, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-2 border">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{task.title}</p>
                                                        <p className="text-xs text-muted-foreground">{task.due_date}</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onAddBullet(`Påminnelse: ${task.title} (${task.due_date})`)}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Lägg till
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Seasonal Reminders */}
                                {suggestions.seasonalReminders.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Calendar className="h-4 w-4 text-green-500" />
                                            <span>Aktuellt för säsongen</span>
                                        </div>
                                        <div className="space-y-1">
                                            {suggestions.seasonalReminders.map((reminder, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-2 border">
                                                    <span className="text-sm">{reminder}</span>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onAddBullet(reminder)}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Lägg till
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="pt-2 border-t">
                                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                        <TrendingUp className="h-4 w-4 text-purple-500" />
                                        <span>Statistik från förra veckan</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white rounded-lg p-2 border text-center">
                                            <p className="text-lg font-bold text-green-600">{suggestions.stats.completedLastWeek}</p>
                                            <p className="text-xs text-muted-foreground">Slutförda</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 border text-center">
                                            <p className="text-lg font-bold text-orange-600">{suggestions.stats.pendingTasks}</p>
                                            <p className="text-xs text-muted-foreground">Pågående</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}
