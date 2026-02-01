"use client"

import { useState } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Flag, Loader2 } from "lucide-react"
import { priorityConfig, TaskPriority } from "@/lib/types"

interface PriorityQuickSelectProps {
    taskId: string;
    currentPriority: TaskPriority;
    onPriorityChange: (taskId: string, priority: TaskPriority) => Promise<void> | void;
    size?: "sm" | "default";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function PriorityQuickSelect({
    taskId,
    currentPriority,
    onPriorityChange,
    size = "sm",
    open: externalOpen,
    onOpenChange: externalOnOpenChange
}: PriorityQuickSelectProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Use external state if provided, otherwise use internal
    const open = externalOpen !== undefined ? externalOpen : internalOpen
    const setOpen = externalOnOpenChange || setInternalOpen

    const handleSelect = async (priority: TaskPriority) => {
        setLoading(true)
        try {
            await onPriorityChange(taskId, priority)
            setOpen(false)
        } catch (err) {
            console.error('Failed to update priority:', err)
        } finally {
            setLoading(false)
        }
    }

    // Get current priority config for button display
    const currentConfig = currentPriority ? priorityConfig[currentPriority] : null

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size={size}
                    className="h-auto p-1 hover:bg-accent"
                    title="Ändra prioritet"
                    onClick={(e) => e.stopPropagation()} // Prevent card click
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : currentConfig ? (
                        <span className="text-base">{currentConfig.icon}</span>
                    ) : (
                        <Flag className="h-4 w-4 text-muted-foreground" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel>Ändra prioritet (Eisenhower)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {([1, 2, 3, 4] as const).map(p => {
                    const config = priorityConfig[p];
                    const isSelected = currentPriority === p;
                    return (
                        <DropdownMenuItem
                            key={p}
                            onClick={() => handleSelect(p)}
                            className={`${isSelected ? 'bg-accent' : ''} cursor-pointer`}
                        >
                            <div className="flex items-start gap-3 w-full">
                                <span className="text-lg mt-0.5">{config.icon}</span>
                                <div className="flex-1">
                                    <div className="font-medium">{config.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {config.description}
                                    </div>
                                </div>
                            </div>
                        </DropdownMenuItem>
                    );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => handleSelect(null)}
                    className={`${!currentPriority ? 'bg-accent' : ''} cursor-pointer`}
                >
                    <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
                    Ingen prioritet
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
