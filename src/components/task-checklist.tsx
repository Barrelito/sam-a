"use client"

import { useState } from "react"
import { TaskChecklistItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckSquare, Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface TaskChecklistProps {
    taskId: string
    items: TaskChecklistItem[]
    onItemsChange: (items: TaskChecklistItem[]) => void
    onSuggestDone?: () => void
}

export function TaskChecklist({ taskId, items, onItemsChange, onSuggestDone }: TaskChecklistProps) {
    const [newItemTitle, setNewItemTitle] = useState("")
    const [addingItem, setAddingItem] = useState(false)
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null)
    const [showSuggestion, setShowSuggestion] = useState(false)

    const completedCount = items.filter(i => i.is_completed).length
    const totalCount = items.length
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const allDone = totalCount > 0 && completedCount === totalCount

    const handleAddItem = async () => {
        if (!newItemTitle.trim()) return
        setAddingItem(true)
        try {
            const res = await fetch(`/api/tasks/${taskId}/checklist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newItemTitle.trim(), sort_order: items.length })
            })
            if (res.ok) {
                const data = await res.json()
                onItemsChange([...items, data.item])
                setNewItemTitle("")
            }
        } catch (err) {
            console.error('Error adding checklist item:', err)
        } finally {
            setAddingItem(false)
        }
    }

    const handleToggleItem = async (item: TaskChecklistItem) => {
        setLoadingItemId(item.id)
        try {
            const res = await fetch(`/api/tasks/${taskId}/checklist`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: item.id, is_completed: !item.is_completed })
            })
            if (res.ok) {
                const data = await res.json()
                const updatedItems = items.map(i => i.id === item.id ? data.item : i)
                onItemsChange(updatedItems)

                // Check if all items are now done → show suggestion
                const newCompleted = updatedItems.filter(i => i.is_completed).length
                if (newCompleted === updatedItems.length && updatedItems.length > 0) {
                    setShowSuggestion(true)
                } else {
                    setShowSuggestion(false)
                }
            }
        } catch (err) {
            console.error('Error toggling checklist item:', err)
        } finally {
            setLoadingItemId(null)
        }
    }

    const handleDeleteItem = async (itemId: string) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}/checklist?item_id=${itemId}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                const updatedItems = items.filter(i => i.id !== itemId)
                onItemsChange(updatedItems)
                if (updatedItems.length === 0) setShowSuggestion(false)
            }
        } catch (err) {
            console.error('Error deleting checklist item:', err)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleAddItem()
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CheckSquare className="h-5 w-5" />
                        Checklista
                        {totalCount > 0 && (
                            <Badge
                                variant={allDone ? "default" : "secondary"}
                                className={allDone ? "bg-green-100 text-green-700 border-green-200" : ""}
                            >
                                {completedCount}/{totalCount}
                            </Badge>
                        )}
                    </CardTitle>
                </div>
                {totalCount > 0 && (
                    <div className="space-y-1">
                        <Progress value={progressPercent} className="h-1.5" />
                        <CardDescription className="text-xs">
                            {progressPercent}% klart
                        </CardDescription>
                    </div>
                )}
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Suggestion banner when all done */}
                {showSuggestion && onSuggestDone && (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Alla punkter avklarade!</span>
                        </div>
                        <Button
                            size="sm"
                            className="h-7 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                                onSuggestDone()
                                setShowSuggestion(false)
                            }}
                        >
                            Markera uppgift klar
                        </Button>
                    </div>
                )}

                {/* Item list */}
                {items.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        <AlertCircle className="h-5 w-5 mx-auto mb-1 opacity-40" />
                        Inga checklistepunkter ännu
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map(item => (
                            <li
                                key={item.id}
                                className="flex items-center gap-3 group"
                            >
                                <div className="relative flex items-center">
                                    {loadingItemId === item.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    ) : (
                                        <Checkbox
                                            checked={item.is_completed}
                                            onCheckedChange={() => handleToggleItem(item)}
                                            className="h-4 w-4"
                                        />
                                    )}
                                </div>
                                <span
                                    className={`flex-1 text-sm ${item.is_completed
                                        ? 'line-through text-muted-foreground'
                                        : 'text-foreground'
                                        }`}
                                >
                                    {item.title}
                                </span>
                                {item.is_completed && item.completed_by_profile?.full_name && (
                                    <span className="text-xs text-muted-foreground hidden group-hover:inline">
                                        {item.completed_by_profile.full_name}
                                    </span>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteItem(item.id)}
                                >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Add new item */}
                <div className="flex gap-2 pt-1">
                    <Input
                        value={newItemTitle}
                        onChange={e => setNewItemTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Lägg till punkt..."
                        className="h-8 text-sm"
                        disabled={addingItem}
                    />
                    <Button
                        size="sm"
                        className="h-8 px-3"
                        onClick={handleAddItem}
                        disabled={addingItem || !newItemTitle.trim()}
                    >
                        {addingItem ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Plus className="h-3 w-3" />
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
