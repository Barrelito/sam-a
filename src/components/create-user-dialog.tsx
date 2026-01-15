"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Copy, Check, AlertCircle } from "lucide-react"
import { roleLabels, UserRole } from "@/lib/types"

interface Station {
    id: string
    name: string
    vo_id: string
    verksamhetsomraden?: { id: string; name: string }
}

interface VO {
    id: string
    name: string
}

interface CreateUserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    editUser?: {
        id: string
        email: string
        full_name: string
        role: UserRole
        vo_id: string | null
        station_ids: string[]
    } | null
}

export function CreateUserDialog({ open, onOpenChange, onSuccess, editUser }: CreateUserDialogProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<{ password?: string; message?: string } | null>(null)
    const [copied, setCopied] = useState(false)

    // Form data
    const [email, setEmail] = useState("")
    const [fullName, setFullName] = useState("")
    const [role, setRole] = useState<UserRole>("assistant_manager")
    const [voId, setVoId] = useState<string>("")
    const [stationIds, setStationIds] = useState<string[]>([])

    // Reference data
    const [voList, setVoList] = useState<VO[]>([])
    const [stationList, setStationList] = useState<Station[]>([])

    const isEditing = !!editUser

    // Load reference data
    useEffect(() => {
        if (open) {
            fetch('/api/admin/vo')
                .then(res => res.json())
                .then(data => setVoList(data.verksamhetsomraden || []))

            fetch('/api/admin/stations')
                .then(res => res.json())
                .then(data => setStationList(data.stations || []))
        }
    }, [open])

    // Populate form when editing
    useEffect(() => {
        if (editUser) {
            setEmail(editUser.email)
            setFullName(editUser.full_name)
            setRole(editUser.role)
            setVoId(editUser.vo_id || "")
            setStationIds(editUser.station_ids || [])
        } else {
            resetForm()
        }
    }, [editUser, open])

    const resetForm = () => {
        setEmail("")
        setFullName("")
        setRole("assistant_manager")
        setVoId("")
        setStationIds([])
        setError(null)
        setSuccess(null)
    }

    const handleClose = () => {
        resetForm()
        onOpenChange(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                ...(isEditing && { user_id: editUser.id }),
                email,
                full_name: fullName,
                role,
                vo_id: voId || null,
                station_ids: stationIds
            }

            const res = await fetch('/api/admin/users', {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Något gick fel')
            }

            if (isEditing) {
                onSuccess()
                handleClose()
            } else {
                setSuccess({
                    password: data.temp_password,
                    message: 'Användare skapad!'
                })
            }

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCopyPassword = () => {
        if (success?.password) {
            navigator.clipboard.writeText(success.password)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleStationToggle = (stationId: string) => {
        setStationIds(prev =>
            prev.includes(stationId)
                ? prev.filter(id => id !== stationId)
                : [...prev, stationId]
        )
    }

    // Filter stations by selected VO
    const filteredStations = voId
        ? stationList.filter(s => s.vo_id === voId)
        : stationList

    // Determine if we need station selection (not for VO chief)
    const needsStations = role !== 'vo_chief' && role !== 'admin'

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Redigera Användare' : 'Bjud in Användare'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Uppdatera användarens information och tilldelningar.'
                            : 'Skapa en ny användare med temporärt lösenord.'
                        }
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                            <p className="text-emerald-700 font-medium mb-2">
                                ✓ {success.message}
                            </p>
                            <p className="text-sm text-emerald-600 mb-3">
                                Temporärt lösenord:
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 p-2 bg-white rounded border font-mono text-lg">
                                    {success.password}
                                </code>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCopyPassword}
                                >
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-emerald-600 mt-2">
                                ⚠️ Kopiera lösenordet nu - det visas inte igen!
                            </p>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => { onSuccess(); handleClose(); }}>
                                Klar
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            {error && (
                                <div className="p-3 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    E-postadress
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="namn@email.se"
                                    required
                                    disabled={isEditing}
                                    className="w-full px-3 py-2 border rounded-lg bg-background disabled:opacity-50"
                                />
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    Namn
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Förnamn Efternamn"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                />
                            </div>

                            {/* Role */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    Roll
                                </label>
                                <select
                                    value={role}
                                    onChange={e => {
                                        setRole(e.target.value as UserRole)
                                        // Reset stations if switching to VO chief
                                        if (e.target.value === 'vo_chief') {
                                            setStationIds([])
                                        }
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                >
                                    <option value="assistant_manager">{roleLabels.assistant_manager}</option>
                                    <option value="station_manager">{roleLabels.station_manager}</option>
                                    <option value="vo_chief">{roleLabels.vo_chief}</option>
                                </select>
                            </div>

                            {/* VO Area */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    Verksamhetsområde
                                    {role === 'vo_chief' && <span className="text-destructive ml-1">*</span>}
                                </label>
                                <select
                                    value={voId}
                                    onChange={e => {
                                        setVoId(e.target.value)
                                        // Reset stations when VO changes
                                        setStationIds([])
                                    }}
                                    required={role === 'vo_chief'}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                >
                                    <option value="">Välj VO-område...</option>
                                    {voList.map(vo => (
                                        <option key={vo.id} value={vo.id}>{vo.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Stations (for non-VO-chief roles) */}
                            {needsStations && (
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">
                                        Stationer
                                        <span className="text-destructive ml-1">*</span>
                                    </label>
                                    {filteredStations.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            {voId ? 'Inga stationer i valt VO-område' : 'Välj VO-område först'}
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {filteredStations.map(station => (
                                                <Badge
                                                    key={station.id}
                                                    variant={stationIds.includes(station.id) ? "default" : "outline"}
                                                    className="cursor-pointer"
                                                    onClick={() => handleStationToggle(station.id)}
                                                >
                                                    {station.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Avbryt
                            </Button>
                            <Button type="submit" disabled={loading || (needsStations && stationIds.length === 0)}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {isEditing ? 'Spara' : 'Skapa Användare'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
