"use client"

import { useState, useEffect, useRef } from "react"
import { User, UserX, Loader2, ChevronDown, Check, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AssignUser {
    id: string
    full_name: string
    role: string
}

interface TaskAssignDropdownProps {
    taskId: string
    assignedTo: string | null
    assignedName?: string | null
    stationId?: string | null
    stationGroupId?: string | null
    onAssigned?: (userId: string | null, userName: string | null) => void
}

export function TaskAssignDropdown({
    taskId,
    assignedTo,
    assignedName,
    stationId,
    stationGroupId,
    onAssigned,
}: TaskAssignDropdownProps) {
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [users, setUsers] = useState<AssignUser[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [saving, setSaving] = useState(false)
    // Internal display state for optimistic updates
    const [localId, setLocalId] = useState<string | null>(assignedTo)
    const [localName, setLocalName] = useState<string | null>(assignedName ?? null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Sync from parent when props change
    useEffect(() => { setLocalId(assignedTo) }, [assignedTo])
    useEffect(() => { setLocalName(assignedName ?? null) }, [assignedName])

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    const loadUsers = async () => {
        if (users.length > 0) return // already loaded
        setLoadingUsers(true)
        try {
            const res = await fetch('/api/admin/users')
            if (res.ok) {
                const data = await res.json()
                const validStationIds = new Set<string>()
                if (stationId) validStationIds.add(stationId)

                const filtered = (data.profiles || [])
                    .filter((u: any) => {
                        if (!['station_manager', 'assistant_manager', 'area_manager'].includes(u.role)) return false
                        // area_manager har inga user_stations — inkludera alltid
                        if (u.role === 'area_manager') return true
                        // station_manager/assistant_manager: filtrera på station om angiven
                        return u.user_stations?.some((us: any) =>
                            us.station?.id && (validStationIds.has(us.station.id) || !stationId)
                        )
                    })
                    .map((u: any) => ({
                        id: u.id,
                        full_name: u.full_name,
                        role: u.role,
                    }))
                setUsers(filtered)
            }
        } catch (err) {
            console.error('Error loading users:', err)
        } finally {
            setLoadingUsers(false)
        }
    }

    const handleSelect = async (userId: string | null, userName: string | null) => {
        setSaving(true)
        setOpen(false)

        // --- OPTIMISTIC UPDATE: show the new value immediately ---
        const prevId = localId
        const prevName = localName
        setLocalId(userId)
        setLocalName(userName)
        onAssigned?.(userId, userName)

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_to: userId }),
            })
            const ok = res.ok
            if (!ok) {
                const err = await res.json().catch(() => ({}))
                console.error('Task PUT error:', err)
            }

            if (!ok) {
                // --- ROLLBACK on failure ---
                setLocalId(prevId)
                setLocalName(prevName)
                onAssigned?.(prevId, prevName)
                toast({
                    variant: 'destructive',
                    title: 'Kunde inte spara tilldelning',
                    description: 'Kontrollera att migrationer körts i databasen.',
                })
            }
        } catch (err) {
            console.error('Error assigning task:', err)
            // Rollback
            setLocalId(prevId)
            setLocalName(prevName)
            onAssigned?.(prevId, prevName)
            toast({ variant: 'destructive', title: 'Nätverksfel', description: 'Tilldelning sparades inte.' })
        } finally {
            setSaving(false)
        }
    }

    const handleOpen = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!open) loadUsers()
        setOpen(prev => !prev)
    }

    const isAssigned = !!localId && !!localName

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className={`
                    flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-all
                    hover:bg-accent/60 cursor-pointer
                    ${isAssigned
                        ? 'border-transparent text-muted-foreground hover:border-border'
                        : 'border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100'
                    }
                    ${saving ? 'opacity-60 cursor-wait' : ''}
                `}
                onClick={handleOpen}
                disabled={saving}
            >
                {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : isAssigned ? (
                    <User className="h-3 w-3 flex-shrink-0" />
                ) : (
                    <UserX className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="max-w-[100px] truncate">
                    {saving ? 'Sparar...' : isAssigned ? localName : 'Ej tilldelad'}
                </span>
                <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 top-full mt-1 left-0 min-w-[180px] bg-popover border rounded-md shadow-lg py-1">
                    {loadingUsers ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {/* Ingen tilldelad option */}
                            <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/60 text-left transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleSelect(null, null)
                                }}
                            >
                                <UserX className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground italic">Ingen tilldelad</span>
                                {!localId && <Check className="h-3 w-3 ml-auto text-primary" />}
                            </button>

                            {users.length > 0 && <div className="h-px bg-border mx-2 my-1" />}

                            {users.map(user => (
                                <button
                                    key={user.id}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/60 text-left transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleSelect(user.id, user.full_name)
                                    }}
                                >
                                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{user.full_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {user.role === 'station_manager' ? 'Stationschef'
                                                : user.role === 'area_manager' ? 'SO-chef'
                                                    : 'Bitr. chef'}
                                        </p>
                                    </div>
                                    {localId === user.id && (
                                        <Check className="h-3 w-3 ml-auto text-primary flex-shrink-0" />
                                    )}
                                </button>
                            ))}

                            {users.length === 0 && !loadingUsers && (
                                <p className="px-3 py-2 text-sm text-muted-foreground">Inga användare hittades</p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
