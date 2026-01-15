"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Building2, MapPin, Users, UserPlus, Edit, Loader2 } from "lucide-react"
import { roleLabels, UserRole } from "@/lib/types"
import { CreateUserDialog } from "@/components/create-user-dialog"

interface Profile {
    id: string
    email: string
    full_name: string
    role: UserRole
    vo_id: string | null
    verksamhetsomraden?: { id: string; name: string } | null
    user_stations?: Array<{
        station: { id: string; name: string; vo_id: string }
    }>
}

interface VO {
    id: string
    name: string
    description?: string
}

interface Station {
    id: string
    name: string
    vo_id: string
    verksamhetsomraden?: { id: string; name: string }
}

type TabType = 'vo' | 'stations' | 'users'

const roleColors: Record<UserRole, string> = {
    admin: "bg-purple-100 text-purple-700",
    vo_chief: "bg-blue-100 text-blue-700",
    station_manager: "bg-emerald-100 text-emerald-700",
    assistant_manager: "bg-amber-100 text-amber-700"
}

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<TabType>('vo')
    const [loading, setLoading] = useState(true)

    // Data
    const [users, setUsers] = useState<Profile[]>([])
    const [voList, setVoList] = useState<VO[]>([])
    const [stations, setStations] = useState<Station[]>([])

    // Dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<{
        id: string
        email: string
        full_name: string
        role: UserRole
        vo_id: string | null
        station_ids: string[]
    } | null>(null)

    // Load data
    const loadData = async () => {
        setLoading(true)
        try {
            const [usersRes, voRes, stationsRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/admin/vo'),
                fetch('/api/admin/stations')
            ])

            const [usersData, voData, stationsData] = await Promise.all([
                usersRes.json(),
                voRes.json(),
                stationsRes.json()
            ])

            setUsers(usersData.profiles || [])
            setVoList(voData.verksamhetsomraden || [])
            setStations(stationsData.stations || [])
        } catch (error) {
            console.error('Failed to load admin data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleEditUser = (user: Profile) => {
        setEditingUser({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            vo_id: user.vo_id,
            station_ids: user.user_stations?.map(us => us.station.id) || []
        })
        setCreateDialogOpen(true)
    }

    const handleCloseDialog = () => {
        setEditingUser(null)
        setCreateDialogOpen(false)
    }

    const tabs = [
        { id: 'vo' as const, label: 'Verksamhetsområden', icon: Building2 },
        { id: 'stations' as const, label: 'Stationer', icon: MapPin },
        { id: 'users' as const, label: 'Användare', icon: Users },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
                    <p className="text-muted-foreground mt-1">
                        Hantera verksamhetsområden, stationer och användare
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {tabs.map(tab => (
                    <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "default" : "outline"}
                        onClick={() => setActiveTab(tab.id)}
                        className="gap-2"
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </Button>
                ))}
            </div>

            {/* VO Tab */}
            {activeTab === 'vo' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Verksamhetsområden</h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {voList.map(vo => {
                            const voStations = stations.filter(s => s.vo_id === vo.id)
                            const voUsers = users.filter(u => u.vo_id === vo.id)

                            return (
                                <Card key={vo.id}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-primary" />
                                            {vo.name}
                                        </CardTitle>
                                        {vo.description && (
                                            <CardDescription>{vo.description}</CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <MapPin className="h-4 w-4" />
                                                <span>{voStations.length} stationer</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Users className="h-4 w-4" />
                                                <span>{voUsers.length} användare</span>
                                            </div>
                                            {voStations.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {voStations.slice(0, 5).map(s => (
                                                        <Badge key={s.id} variant="secondary" className="text-xs">
                                                            {s.name}
                                                        </Badge>
                                                    ))}
                                                    {voStations.length > 5 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{voStations.length - 5}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Stations Tab */}
            {activeTab === 'stations' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Stationer</h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {stations.map(station => {
                            const stationUsers = users.filter(u =>
                                u.user_stations?.some(us => us.station.id === station.id)
                            )

                            return (
                                <Card key={station.id}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <MapPin className="h-5 w-5 text-primary" />
                                            {station.name}
                                        </CardTitle>
                                        {station.verksamhetsomraden && (
                                            <CardDescription>
                                                {station.verksamhetsomraden.name}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Users className="h-4 w-4" />
                                                <span>{stationUsers.length} användare</span>
                                            </div>
                                            {stationUsers.length > 0 && (
                                                <div className="space-y-1 mt-2">
                                                    {stationUsers.slice(0, 3).map(user => (
                                                        <div key={user.id} className="flex items-center gap-2">
                                                            <span className="text-sm">{user.full_name}</span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {roleLabels[user.role]}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                    {stationUsers.length > 3 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            +{stationUsers.length - 3} fler
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Användare</h2>
                        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Bjud in Användare
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {users.map(user => (
                            <Card key={user.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg">{user.full_name || 'Namn saknas'}</CardTitle>
                                            <CardDescription>{user.email}</CardDescription>
                                        </div>
                                        <Badge className={roleColors[user.role]}>
                                            {roleLabels[user.role]}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* VO */}
                                    {user.verksamhetsomraden && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Building2 className="h-4 w-4" />
                                            {user.verksamhetsomraden.name}
                                        </div>
                                    )}

                                    {/* Stations */}
                                    {user.user_stations && user.user_stations.length > 0 && (
                                        <div className="flex items-start gap-2 text-sm">
                                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            <div className="flex flex-wrap gap-1">
                                                {user.user_stations.map(us => (
                                                    <Badge key={us.station.id} variant="outline" className="text-xs">
                                                        {us.station.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2"
                                        onClick={() => handleEditUser(user)}
                                    >
                                        <Edit className="h-4 w-4" />
                                        Redigera
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Create/Edit User Dialog */}
            <CreateUserDialog
                open={createDialogOpen}
                onOpenChange={handleCloseDialog}
                onSuccess={loadData}
                editUser={editingUser}
            />
        </div>
    )
}
