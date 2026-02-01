"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, UserCircle, ChevronRight, Users } from "lucide-react"

interface Employee {
    id: string
    first_name: string
    last_name: string
    email: string
    category: string
    station?: {
        name: string
    }
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const res = await fetch('/api/employees')
                if (!res.ok) throw new Error('Failed to load')
                const data = await res.json()
                setEmployees(data.employees || [])
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        loadEmployees()
    }, [])

    const filtered = employees.filter(e =>
        e.first_name.toLowerCase().includes(search.toLowerCase()) ||
        e.last_name.toLowerCase().includes(search.toLowerCase()) ||
        e.station?.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Medarbetare</h1>
                    <p className="text-muted-foreground">
                        Digital personakt och loggbok för din personal
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Sök på namn eller station..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-10">Laddar medarbetare...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            Inga medarbetare hittades.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filtered.map((employee) => (
                                <Link
                                    key={employee.id}
                                    href={`/employees/${employee.id}`}
                                    className="block group"
                                >
                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <UserCircle className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="font-medium group-hover:text-primary transition-colors">
                                                    {employee.first_name} {employee.last_name}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {employee.category}
                                                    </Badge>
                                                    {employee.station && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            {employee.station.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
