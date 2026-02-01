"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ShieldAlert, ArrowLeft, Loader2, User, Clock } from "lucide-react"
import Link from "next/link"

interface AuditLog {
    id: string
    action: string
    resource_type: string
    timestamp: string
    details: any
    user?: {
        full_name: string
        email: string
    }
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        loadLogs()
    }, [])

    const loadLogs = async () => {
        try {
            const res = await fetch('/api/admin/audit-logs')
            if (!res.ok) throw new Error('Failed')
            const data = await res.json()
            setLogs(data.logs || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = logs.filter(log =>
        JSON.stringify(log).toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tillbaka
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground">
                        Spårbarhetslogg för systemhändelser och dataåtkomst
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-primary" />
                            Händelselogg
                        </CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Sök i loggar..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Inga loggar hittades
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground font-medium border-b">
                                    <tr>
                                        <th className="p-3">Tidpunkt</th>
                                        <th className="p-3">Användare</th>
                                        <th className="p-3">Händelse</th>
                                        <th className="p-3">Resurs</th>
                                        <th className="p-3">Detaljer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-muted/50">
                                            <td className="p-3 whitespace-nowrap text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(log.timestamp).toLocaleString('sv-SE')}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3 w-3 text-muted-foreground" />
                                                    <span className="font-medium">
                                                        {log.user?.full_name || 'Okänd'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {log.action}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-muted-foreground">
                                                {log.resource_type}
                                            </td>
                                            <td className="p-3 font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                                                {JSON.stringify(log.details)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
