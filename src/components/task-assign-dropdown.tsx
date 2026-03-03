"use client"

import { useState, useEffect, useRef } from "react"
import { User, UserX, Loader2, ChevronDown, Check } from "lucide-react"

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
    const [open, setOpen] = useState(false)
    const [users, setUsers] = useState<AssignUser[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [saving, setSaving] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

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
                    .filter((u: any) =>
                        (u.role === 'station_manager' || u.role === 'assistant_manager') &&
                        u.user_stations?.some((us: any) =>
                            us.station?.id && (validStationIds.has(us.station.id) || !stationId)
                        )
                    )
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
        try {
            // For annual cycle virtual tasks, use the dedicated assign endpoint
            const isVirtualAnnualTask = taskId.startsWith('annual-')
            if (isVirtualAnnualTask) {
                // Parse the composite virtual ID to get itemId and stationId
                const withoutPrefix = taskId.slice('annual-'.length)
                const itemId = withoutPrefix.length === 73 ? withoutPrefix.slice(0, 36) : withoutPrefix
                const embeddedStationId = withoutPrefix.length === 73 ? withoutPrefix.slice(37) : (stationId ?? null)

                const res = await fetch('/api/annual-cycle/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        itemId,
                        stationId: embeddedStationId,
                        year: new Date().getFullYear(),
                        assignedTo: userId,
                    }),
                })
                if (res.ok) {
                    onAssigned?.(userId, userName)
                }
            } else {
                // Regular task: use the standard PUT endpoint
                const res = await fetch(`/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assigned_to: userId }),
                })
                if (res.ok) {
                    onAssigned?.(userId, userName)
                }
            }
        } catch (err) {
            console.error('Error assigning task:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleOpen = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!open) loadUsers()
        setOpen(prev => !prev)
    }

    const isAssigned = !!assignedTo && !!assignedName

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
                    {saving ? 'Sparar...' : isAssigned ? assignedName : 'Ej tilldelad'}
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
                                {!assignedTo && <Check className="h-3 w-3 ml-auto text-primary" />}
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
                                            {user.role === 'station_manager' ? 'Stationschef' : 'Bitr. chef'}
                                        </p>
                                    </div>
                                    {assignedTo === user.id && (
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
