"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Loader2,
    MapPin,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    UserCircle,
    UserPlus,
} from "lucide-react"
import EmployeeFormDialog from "@/components/employees/employee-form-dialog"
import DeleteEmployeeDialog from "@/components/employees/delete-employee-dialog"
import { useToast } from "@/hooks/use-toast"

interface Employee {
    id: string
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
    employee_number?: string | null
    category: string
    station_id: string
    employment_date?: string | null
    birthdate?: string | null
    experience_level?: string | null
    current_salary?: number | null
    employment_rate?: number | null
    night_share?: number | null
    station?: {
        id: string
        name: string
    } | null
}

interface Station {
    id: string
    name: string
}

const CATEGORY_COLORS: Record<string, string> = {
    VUB: "bg-blue-50 text-blue-700 border-blue-200",
    SSK: "bg-green-50 text-green-700 border-green-200",
    AMB: "bg-purple-50 text-purple-700 border-purple-200",
}

const ALL = "all"
const PAGE_SIZE = 25

export default function EmployeesPage() {
    const { toast } = useToast()

    const [employees, setEmployees] = useState<Employee[]>([])
    const [stations, setStations] = useState<Station[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string>(ALL)
    const [stationFilter, setStationFilter] = useState<string>(ALL)

    const [addOpen, setAddOpen] = useState(false)
    const [editing, setEditing] = useState<Employee | null>(null)
    const [deleting, setDeleting] = useState<Employee | null>(null)

    // Räknare så att ett långsamt svar inte skriver över ett nyare
    const requestId = useRef(0)

    // Nytt filter eller ny sökning innebär att sidnumret börjar om
    const changeSearch = (value: string) => {
        setSearch(value)
        setPage(1)
    }
    const changeCategory = (value: string) => {
        setCategoryFilter(value)
        setPage(1)
    }
    const changeStation = (value: string) => {
        setStationFilter(value)
        setPage(1)
    }

    // Sökningen görs server-side - vänta tills användaren slutat skriva
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
        return () => clearTimeout(timer)
    }, [search])

    // Stationerna hämtas en gång - de används både i filtret och i formulären
    useEffect(() => {
        let cancelled = false

        const loadStations = async () => {
            try {
                const res = await fetch("/api/stations")
                if (!res.ok) return
                const data = await res.json()
                if (!cancelled) setStations(data.stations || [])
            } catch (err) {
                // Stationslistan är inte kritisk för att kunna visa medarbetarna
                console.error(err)
            }
        }

        loadStations()
        return () => {
            cancelled = true
        }
    }, [])

    const loadEmployees = useCallback(async () => {
        const currentRequest = ++requestId.current
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                page: String(page),
                page_size: String(PAGE_SIZE),
            })
            if (debouncedSearch) params.set("search", debouncedSearch)
            if (categoryFilter !== ALL) params.set("category", categoryFilter)
            if (stationFilter !== ALL) params.set("station_id", stationFilter)

            const res = await fetch(`/api/employees?${params.toString()}`)
            const data = await res.json().catch(() => ({}))

            // Ett nyare anrop har hunnit starta - släng det här svaret
            if (currentRequest !== requestId.current) return

            if (!res.ok) {
                throw new Error(data?.error || "Kunde inte hämta medarbetare")
            }

            setEmployees(data.employees || [])
            setTotal(data.total || 0)
        } catch (err) {
            if (currentRequest !== requestId.current) return
            setError(err instanceof Error ? err.message : "Kunde inte hämta medarbetare")
            setEmployees([])
            setTotal(0)
        } finally {
            if (currentRequest === requestId.current) setLoading(false)
        }
    }, [page, debouncedSearch, categoryFilter, stationFilter])

    useEffect(() => {
        loadEmployees()
    }, [loadEmployees])

    const handleSaved = () => {
        setAddOpen(false)
        setEditing(null)
        // Hämta om sidan: namn, kategori och station kan ha ändrats så att raden
        // hamnar någon annanstans i sorteringen - eller utanför filtret.
        loadEmployees()
    }

    const handleDeleted = (employeeId: string) => {
        setDeleting(null)
        setEmployees((prev) => prev.filter((e) => e.id !== employeeId))
        setTotal((prev) => Math.max(0, prev - 1))

        // Sista raden på sista sidan? Backa ett steg, annars fyll på sidan igen
        if (employees.length === 1 && page > 1) {
            setPage((prev) => prev - 1)
        } else {
            loadEmployees()
        }
    }

    const stationOptions = useMemo(
        () => [...stations].sort((a, b) => a.name.localeCompare(b.name, "sv")),
        [stations]
    )

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const rangeEnd = Math.min(page * PAGE_SIZE, total)
    const hasFilters = Boolean(debouncedSearch) || categoryFilter !== ALL || stationFilter !== ALL

    const canAdd = stations.length > 0

    const addButton = (
        <Button
            onClick={() => {
                if (!canAdd) {
                    toast({
                        variant: "destructive",
                        title: "Inga stationer kopplade",
                        description:
                            "Ditt konto saknar stationskoppling. Kontakta en administratör för att kunna lägga till medarbetare.",
                    })
                    return
                }
                setAddOpen(true)
            }}
        >
            <Plus className="mr-2 h-4 w-4" />
            Lägg till medarbetare
        </Button>
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
                {addButton}
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Ett fel uppstod</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-2">
                        <span>{error}</span>
                        <Button variant="outline" size="sm" onClick={loadEmployees}>
                            Försök igen
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Sök på namn, personalnummer, e-post eller station..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => changeSearch(e.target.value)}
                            />
                        </div>

                        <Select value={categoryFilter} onValueChange={changeCategory}>
                            <SelectTrigger className="w-full lg:w-[180px]">
                                <SelectValue placeholder="Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>Alla kategorier</SelectItem>
                                <SelectItem value="VUB">VUB</SelectItem>
                                <SelectItem value="SSK">SSK</SelectItem>
                                <SelectItem value="AMB">AMB</SelectItem>
                            </SelectContent>
                        </Select>

                        {stationOptions.length > 1 && (
                            <Select value={stationFilter} onValueChange={changeStation}>
                                <SelectTrigger className="w-full lg:w-[200px]">
                                    <SelectValue placeholder="Station" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>Alla stationer</SelectItem>
                                    {stationOptions.map((station) => (
                                        <SelectItem key={station.id} value={station.id}>
                                            {station.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {!loading && (
                        <p className="text-sm text-muted-foreground">
                            {total === 0
                                ? "Inga medarbetare"
                                : `Visar ${rangeStart}-${rangeEnd} av ${total} medarbetare`}
                        </p>
                    )}
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Laddar medarbetare...
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                            <UserPlus className="h-10 w-10 text-muted-foreground" />
                            <div>
                                <p className="font-medium">
                                    {hasFilters
                                        ? "Inga medarbetare matchar filtret"
                                        : "Inga medarbetare registrerade ännu"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {hasFilters
                                        ? "Justera sökningen eller filtren för att se fler."
                                        : "Lägg till din första medarbetare för att bygga upp personakterna."}
                                </p>
                            </div>
                            {!hasFilters && addButton}
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {employees.map((employee) => (
                                <div
                                    key={employee.id}
                                    className="flex items-center justify-between gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <Link
                                        href={`/employees/${employee.id}`}
                                        className="flex items-center gap-4 flex-1 min-w-0 group"
                                    >
                                        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <UserCircle className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium truncate group-hover:text-primary transition-colors">
                                                {employee.first_name} {employee.last_name}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs font-normal ${CATEGORY_COLORS[employee.category] || ""}`}
                                                >
                                                    {employee.category}
                                                </Badge>
                                                {employee.station && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {employee.station.name}
                                                    </span>
                                                )}
                                                {employee.employee_number && (
                                                    <span className="text-xs">
                                                        Anst.nr {employee.employee_number}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    aria-label={`Åtgärder för ${employee.first_name} ${employee.last_name}`}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/employees/${employee.id}`} className="cursor-pointer">
                                                        <UserCircle className="mr-2 h-4 w-4" />
                                                        Öppna personakt
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="cursor-pointer"
                                                    onSelect={() => setEditing(employee)}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Redigera uppgifter
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="cursor-pointer text-destructive focus:text-destructive"
                                                    onSelect={() => setDeleting(employee)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Ta bort
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Link
                                            href={`/employees/${employee.id}`}
                                            aria-label={`Öppna personakt för ${employee.first_name} ${employee.last_name}`}
                                        >
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-4 pt-6">
                            <p className="text-sm text-muted-foreground">
                                Sida {page} av {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1 || loading}
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Föregående
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages || loading}
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                >
                                    Nästa
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialogerna ligger utanför dropdown-menyn så att de inte avmonteras när menyn stängs */}
            <EmployeeFormDialog
                stations={stations}
                open={addOpen}
                onOpenChange={setAddOpen}
                onSaved={handleSaved}
            />

            {editing && (
                <EmployeeFormDialog
                    stations={stations}
                    employee={editing}
                    open
                    onOpenChange={(open) => !open && setEditing(null)}
                    onSaved={handleSaved}
                />
            )}

            {deleting && (
                <DeleteEmployeeDialog
                    employee={deleting}
                    open
                    onOpenChange={(open) => !open && setDeleting(null)}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    )
}
