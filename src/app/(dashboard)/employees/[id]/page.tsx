"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    AlertCircle,
    ArrowLeft,
    Cake,
    CalendarDays,
    Loader2,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Trash2,
    UserCircle,
} from "lucide-react"
import { EmployeeLogbook } from "@/components/employee-logbook"
import EmployeeFormDialog from "@/components/employees/employee-form-dialog"
import DeleteEmployeeDialog from "@/components/employees/delete-employee-dialog"
import { formatExperience, resolveExperience } from "@/lib/employees/experience"

interface EmployeeDetail {
    id: string
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
    employee_number?: string | null
    category: string
    station_id: string
    birthdate?: string | null
    employment_date?: string | null
    experience_level?: string | null
    current_salary?: number | null
    employment_rate?: number | null
    night_share?: number | null
    station?: {
        id: string
        name: string
    } | null
    managers?: Array<{
        role: string
        manager?: { id: string; full_name: string; email: string } | null
    }>
}

interface Station {
    id: string
    name: string
}

const CATEGORY_LABELS: Record<string, string> = {
    VUB: "VUB - Specialistsjuksköterska",
    SSK: "SSK - Grundsjuksköterska",
    AMB: "AMB - Ambulanssjukvårdare",
}

function formatDate(value?: string | null) {
    if (!value) return "Ej angivet"
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? "Ej angivet" : parsed.toLocaleDateString("sv-SE")
}

function formatNumber(value?: number | null, suffix = "") {
    if (value === null || value === undefined) return "Ej angivet"
    return `${Number(value).toLocaleString("sv-SE")}${suffix}`
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
        </div>
    )
}

export default function EmployeeDetailPage() {
    const params = useParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const router = useRouter()

    const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
    const [stations, setStations] = useState<Station[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const loadEmployee = useCallback(async () => {
        if (!id) return
        setError(null)
        try {
            const [employeeRes, stationsRes] = await Promise.all([
                fetch(`/api/employees/${id}`),
                fetch("/api/stations"),
            ])

            if (!employeeRes.ok) {
                const data = await employeeRes.json().catch(() => ({}))
                throw new Error(
                    data?.error ||
                    (employeeRes.status === 404
                        ? "Medarbetaren hittades inte eller så saknar du behörighet"
                        : "Kunde inte hämta personakten")
                )
            }

            const data = await employeeRes.json()
            setEmployee(data.employee)

            if (stationsRes.ok) {
                const stationsData = await stationsRes.json()
                setStations(stationsData.stations || [])
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Kunde inte hämta personakten")
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        loadEmployee()
    }, [loadEmployee])

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Laddar personakt...
            </div>
        )
    }

    if (error || !employee) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => router.push("/employees")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tillbaka till medarbetare
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Kunde inte visa personakten</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-2">
                        <span>{error || "Medarbetaren hittades inte"}</span>
                        <Button variant="outline" size="sm" onClick={loadEmployee}>
                            Försök igen
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    const primaryManagers = (employee.managers || [])
        .map((m) => m.manager?.full_name)
        .filter(Boolean) as string[]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push("/employees")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tillbaka
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Redigera
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteOpen(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Ta bort
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Profile Card */}
                <Card className="w-full md:w-[300px] shrink-0">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
                                <span className="text-2xl font-bold text-slate-500">
                                    {employee.first_name.charAt(0)}
                                    {employee.last_name.charAt(0)}
                                </span>
                            </div>
                        </div>
                        <CardTitle>
                            {employee.first_name} {employee.last_name}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap justify-center items-center gap-2">
                            <Badge variant="outline">{employee.category}</Badge>
                            {employee.station && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {employee.station.name}
                                </span>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="h-px bg-border" />
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                {employee.email ? (
                                    <a href={`mailto:${employee.email}`} className="truncate hover:underline">
                                        {employee.email}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground">Ingen e-post</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                {employee.phone ? (
                                    <a href={`tel:${employee.phone}`} className="hover:underline">
                                        {employee.phone}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground">Inget nummer</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span>Anst. nr: {employee.employee_number || "-"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span>Anställd: {formatDate(employee.employment_date)}</span>
                            </div>
                            {employee.birthdate && (
                                <div className="flex items-center gap-2">
                                    <Cake className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span>Född: {formatDate(employee.birthdate)}</span>
                                </div>
                            )}
                        </div>
                        <div className="h-px bg-border" />
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Lön</span>
                                <span className="font-medium">
                                    {employee.current_salary != null
                                        ? `${formatNumber(employee.current_salary)} kr`
                                        : "Ej angiven"}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Erfarenhet</span>
                                <span className="font-medium">
                                    {formatExperience(resolveExperience(employee))}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Sysselsättningsgrad</span>
                                <span className="font-medium">
                                    {formatNumber(employee.employment_rate, " %")}
                                </span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Link href={`/salary-review/employees/${employee.id}`}>
                                <Button variant="outline" className="w-full">
                                    Gå till löneöversyn
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content */}
                <div className="flex-1 w-full min-w-0">
                    <Tabs defaultValue="logbook" className="w-full">
                        <TabsList className="w-full md:w-auto">
                            <TabsTrigger value="logbook" className="flex-1 md:flex-none">
                                Loggbok
                            </TabsTrigger>
                            <TabsTrigger value="overview" className="flex-1 md:flex-none">
                                Översikt
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            <TabsContent value="logbook" className="m-0">
                                <EmployeeLogbook employeeId={employee.id} />
                            </TabsContent>

                            <TabsContent value="overview">
                                <Card>
                                    <CardHeader className="flex-row items-start justify-between space-y-0">
                                        <div>
                                            <CardTitle>Översikt</CardTitle>
                                            <CardDescription>
                                                Samlad information om anställning och placering
                                            </CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Redigera
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                                                Anställning
                                            </h4>
                                            <dl className="grid gap-4 sm:grid-cols-2 p-4 border rounded-lg bg-slate-50">
                                                <InfoRow
                                                    label="Titel"
                                                    value={CATEGORY_LABELS[employee.category] || employee.category}
                                                />
                                                <InfoRow
                                                    label="Stationstillhörighet"
                                                    value={employee.station?.name || "Ej angiven"}
                                                />
                                                <InfoRow
                                                    label="Anställningsdatum"
                                                    value={formatDate(employee.employment_date)}
                                                />
                                                <InfoRow
                                                    label="Erfarenhet"
                                                    value={formatExperience(resolveExperience(employee))}
                                                />
                                                <InfoRow
                                                    label="Sysselsättningsgrad"
                                                    value={formatNumber(employee.employment_rate, " %")}
                                                />
                                                <InfoRow
                                                    label="Nattandel"
                                                    value={formatNumber(employee.night_share, " %")}
                                                />
                                                <InfoRow
                                                    label="Personalnummer"
                                                    value={employee.employee_number || "Ej angivet"}
                                                />
                                            </dl>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                                                Chefer
                                            </h4>
                                            <div className="p-4 border rounded-lg">
                                                {primaryManagers.length > 0 ? (
                                                    <ul className="text-sm space-y-1">
                                                        {primaryManagers.map((name) => (
                                                            <li key={name}>• {name}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-muted-foreground text-sm">
                                                        Ingen chef kopplad.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                                                Kompetenser
                                            </h4>
                                            <div className="p-4 border rounded-lg">
                                                <p className="text-muted-foreground text-sm italic">
                                                    Kompetensmatris kommer snart...
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>

            <EmployeeFormDialog
                stations={stations}
                employee={employee}
                open={editOpen}
                onOpenChange={setEditOpen}
                onSaved={(saved) => {
                    if (saved) setEmployee(saved)
                    else loadEmployee()
                }}
            />

            <DeleteEmployeeDialog
                employee={employee}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                onDeleted={() => router.push("/employees")}
            />
        </div>
    )
}
