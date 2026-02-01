"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Mail, Phone, Calculator, Clock, Calendar, UserCircle } from "lucide-react"
import { EmployeeLogbook } from "@/components/employee-logbook"

interface EmployeeDetail {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    category: string
    current_salary: number
    experience_level: number
    employee_number?: string
    station?: {
        name: string
    }
}

export default function EmployeeDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // We can reuse the list endpoint but filter client-side for now, 
        // or effectively create a single-item fetch. Ideally we'd have a detail endpoint.
        // For speed, let's just fetch all and find one, or update the list API to support ?id= 
        // Actually, let's create a quick fetch to the salary-review endpoint which handles details well

        // OR better: Create a specific GET /api/employees/[id] endpoint.
        // But for now, I'll fetch the list and find the item to save time on backend generic code,
        // unless the list is huge.
        // Let's rely on the salary-review detail endpoint for now as it exists:
        // /api/salary-review/employees/[id] - this gives us everything we need.

        const loadEmployee = async () => {
            try {
                // Reusing salary review endpoint as it returns rich employee data including station and salary
                const res = await fetch(`/api/salary-review/employees/${id}`)
                if (!res.ok) throw new Error('Failed to load')
                const data = await res.json()
                setEmployee(data.employee) // Note: API returns { employee: ... }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        loadEmployee()
    }, [id])

    if (loading) return <div className="p-8 text-center">Laddar personakt...</div>
    if (!employee) return <div className="p-8 text-center">Medarbetaren hittades inte</div>

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tillbaka
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Profile Card */}
                <Card className="w-full md:w-[300px] shrink-0">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
                                <span className="text-2xl font-bold text-slate-500">
                                    {employee.first_name[0]}{employee.last_name[0]}
                                </span>
                            </div>
                        </div>
                        <CardTitle>{employee.first_name} {employee.last_name}</CardTitle>
                        <CardDescription>{employee.category} • {employee.station?.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="h-px bg-border my-4" />
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{employee.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{employee.phone || "Inget nummer"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <UserCircle className="h-4 w-4 text-muted-foreground" />
                                <span>Anst. nr: {employee.employee_number || "-"}</span>
                            </div>
                        </div>
                        <div className="h-px bg-border my-4" />
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Lön</span>
                                <span className="font-medium">{employee.current_salary?.toLocaleString()} kr</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Erfarenhet</span>
                                <span className="font-medium">{employee.experience_level} år</span>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Link href={`/salary-review/employees/${employee.id}`}>
                                <Button variant="outline" className="w-full">
                                    Gå till löneöversyn
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content */}
                <div className="flex-1 w-full">
                    <Tabs defaultValue="logbook" className="w-full">
                        <TabsList className="w-full md:w-auto">
                            <TabsTrigger value="logbook" className="flex-1 md:flex-none">Loggbok</TabsTrigger>
                            <TabsTrigger value="overview" className="flex-1 md:flex-none">Översikt</TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            <TabsContent value="logbook" className="m-0">
                                <EmployeeLogbook employeeId={employee.id} />
                            </TabsContent>

                            <TabsContent value="overview">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Översikt</CardTitle>
                                        <CardDescription>Samlad information om anställning och kompetens</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Huvudanställning</h4>
                                                <div className="p-4 border rounded-lg bg-slate-50">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-sm text-muted-foreground">Titel</div>
                                                            <div className="font-medium">{employee.category}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-muted-foreground">Placering</div>
                                                            <div className="font-medium">{employee.station?.name}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-muted-foreground">Anställningsform</div>
                                                            <div className="font-medium">Tillsvidare</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Kompetenser</h4>
                                                <div className="p-4 border rounded-lg">
                                                    <p className="text-muted-foreground text-sm italic">Kompetensmatris kommer snart...</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
