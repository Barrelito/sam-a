'use client'

// Delad dialog för att lägga till och redigera medarbetare.
// Används både från medarbetarvyn (/employees) och löneöversynen.

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    EXPERIENCE_LABELS,
    experienceLevelFromEmploymentDate,
    yearsOfService,
} from '@/lib/employees/experience'

export interface EmployeeFormValues {
    id?: string
    employee_number?: string | null
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    category?: string | null
    station_id?: string | null
    employment_date?: string | null
    birthdate?: string | null
    experience_level?: string | null
    current_salary?: number | string | null
    employment_rate?: number | string | null
    night_share?: number | string | null
}

interface EmployeeFormDialogProps {
    stations: Array<{ id: string; name: string }>
    /** Medarbetare att redigera. Utelämnas vid nyregistrering. */
    employee?: EmployeeFormValues
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    /** API-bas att spara mot. Default: /api/employees */
    endpoint?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSaved?: (employee: any) => void
}

const NONE = '__none__'

const CATEGORY_OPTIONS = [
    { value: 'VUB', label: 'VUB - Specialistsjuksköterska' },
    { value: 'SSK', label: 'SSK - Grundsjuksköterska' },
    { value: 'AMB', label: 'AMB - Ambulanssjukvårdare' },
]

const EXPERIENCE_OPTIONS = (Object.keys(EXPERIENCE_LABELS) as Array<keyof typeof EXPERIENCE_LABELS>).map(
    (value) => ({ value, label: EXPERIENCE_LABELS[value] })
)

function toFormState(employee: EmployeeFormValues | undefined, stations: Array<{ id: string }>) {
    return {
        first_name: employee?.first_name ?? '',
        last_name: employee?.last_name ?? '',
        employee_number: employee?.employee_number ?? '',
        email: employee?.email ?? '',
        phone: employee?.phone ?? '',
        address: employee?.address ?? '',
        category: employee?.category ?? '',
        // Förvälj enda stationen vid nyregistrering
        station_id: employee?.station_id ?? (stations.length === 1 ? stations[0].id : ''),
        employment_date: employee?.employment_date ?? '',
        birthdate: employee?.birthdate ?? '',
        experience_level: employee?.experience_level ?? '',
        current_salary: employee?.current_salary != null ? String(employee.current_salary) : '',
        employment_rate: employee?.employment_rate != null ? String(employee.employment_rate) : '',
        night_share: employee?.night_share != null ? String(employee.night_share) : '',
    }
}

export function EmployeeFormDialog({
    stations,
    employee,
    open: controlledOpen,
    onOpenChange,
    trigger,
    endpoint = '/api/employees',
    onSaved,
}: EmployeeFormDialogProps) {
    const isEdit = Boolean(employee?.id)
    const { toast } = useToast()

    const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
    const open = controlledOpen ?? uncontrolledOpen
    const setOpen = (value: boolean) => {
        if (onOpenChange) onOpenChange(value)
        else setUncontrolledOpen(value)
    }

    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState(() => toFormState(employee, stations))

    // Återställ formuläret när dialogen öppnas eller medarbetaren byts
    useEffect(() => {
        if (open) setFormData(toFormState(employee, stations))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, employee?.id])

    const setField = (key: keyof ReturnType<typeof toFormState>, value: string) =>
        setFormData((prev) => ({ ...prev, [key]: value }))

    // Erfarenhet räknas ut från anställningsdatum när det är ifyllt.
    // Det manuella fältet används bara när anställningsdatum saknas.
    const derivedLevel = experienceLevelFromEmploymentDate(formData.employment_date)
    const derivedYears = yearsOfService(formData.employment_date)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            toast({
                variant: 'destructive',
                title: 'Fyll i namn',
                description: 'Förnamn och efternamn är obligatoriska.',
            })
            return
        }
        if (!formData.category) {
            toast({ variant: 'destructive', title: 'Välj kategori', description: 'Kategori är obligatoriskt.' })
            return
        }
        if (!formData.station_id) {
            toast({ variant: 'destructive', title: 'Välj station', description: 'Station är obligatoriskt.' })
            return
        }

        setLoading(true)

        const payload = {
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            category: formData.category,
            station_id: formData.station_id,
            employee_number: formData.employee_number.trim() || null,
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            address: formData.address.trim() || null,
            employment_date: formData.employment_date || null,
            birthdate: formData.birthdate || null,
            experience_level: formData.experience_level || null,
            current_salary: formData.current_salary === '' ? null : formData.current_salary,
            employment_rate: formData.employment_rate === '' ? null : formData.employment_rate,
            night_share: formData.night_share === '' ? null : formData.night_share,
        }

        try {
            const response = await fetch(isEdit ? `${endpoint}/${employee!.id}` : endpoint, {
                method: isEdit ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.error || 'Kunde inte spara medarbetaren')
            }

            toast({
                title: isEdit ? 'Medarbetare uppdaterad' : 'Medarbetare tillagd',
                description: `${payload.first_name} ${payload.last_name} är sparad.`,
            })

            if (Array.isArray(data?.skipped_columns) && data.skipped_columns.length > 0) {
                toast({
                    variant: 'destructive',
                    title: 'Vissa fält kunde inte sparas',
                    description: `Databasen saknar kolumnerna: ${data.skipped_columns.join(', ')}. Kör migrationerna i supabase/migrations.`,
                })
            }

            setOpen(false)
            onSaved?.(data.employee)
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Något gick fel',
                description: error instanceof Error ? error.message : 'Kunde inte spara medarbetaren',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Redigera medarbetare' : 'Lägg till medarbetare'}</DialogTitle>
                        <DialogDescription>
                            {isEdit
                                ? `Uppdatera uppgifterna för ${employee?.first_name} ${employee?.last_name}.`
                                : 'Fyll i uppgifterna för den nya medarbetaren. Fält markerade med * är obligatoriska.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-4">
                        {/* Personuppgifter */}
                        <section className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Personuppgifter
                            </h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">Förnamn *</Label>
                                    <Input
                                        id="first_name"
                                        value={formData.first_name}
                                        onChange={(e) => setField('first_name', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Efternamn *</Label>
                                    <Input
                                        id="last_name"
                                        value={formData.last_name}
                                        onChange={(e) => setField('last_name', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-post</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setField('email', e.target.value)}
                                        placeholder="valfritt"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefon</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setField('phone', e.target.value)}
                                        placeholder="valfritt"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="address">Adress</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => setField('address', e.target.value)}
                                        placeholder="valfritt"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birthdate">Födelsedatum</Label>
                                    <Input
                                        id="birthdate"
                                        type="date"
                                        value={formData.birthdate}
                                        onChange={(e) => setField('birthdate', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="employee_number">Personalnummer</Label>
                                    <Input
                                        id="employee_number"
                                        value={formData.employee_number}
                                        onChange={(e) => setField('employee_number', e.target.value)}
                                        placeholder="valfritt"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Anställning */}
                        <section className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Anställning
                            </h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Kategori *</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(value) => setField('category', value)}
                                    >
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder="Välj kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORY_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {formData.category === 'AMB' && (
                                        <p className="text-xs text-muted-foreground">
                                            AMB har inte bedömning av särskild yrkesskicklighet
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="station_id">Stationstillhörighet *</Label>
                                    <Select
                                        value={formData.station_id}
                                        onValueChange={(value) => setField('station_id', value)}
                                    >
                                        <SelectTrigger id="station_id">
                                            <SelectValue placeholder="Välj station" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stations.map((station) => (
                                                <SelectItem key={station.id} value={station.id}>
                                                    {station.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {stations.length === 0 && (
                                        <p className="text-xs text-destructive">
                                            Du har inga stationer kopplade till ditt konto. Kontakta administratör.
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="employment_date">Anställningsdatum</Label>
                                    <Input
                                        id="employment_date"
                                        type="date"
                                        value={formData.employment_date}
                                        onChange={(e) => setField('employment_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="experience_level">Erfarenhet</Label>
                                    {derivedLevel ? (
                                        <>
                                            <div
                                                id="experience_level"
                                                className="flex h-10 items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                                            >
                                                {EXPERIENCE_LABELS[derivedLevel]}
                                                {derivedYears !== null && ` (${derivedYears} år)`}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Räknas ut från anställningsdatum.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Select
                                                value={formData.experience_level || NONE}
                                                onValueChange={(value) =>
                                                    setField('experience_level', value === NONE ? '' : value)
                                                }
                                            >
                                                <SelectTrigger id="experience_level">
                                                    <SelectValue placeholder="Välj erfarenhet" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={NONE}>Ej angiven</SelectItem>
                                                    {EXPERIENCE_OPTIONS.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                Fyll i anställningsdatum så räknas erfarenheten ut automatiskt.
                                            </p>
                                        </>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="employment_rate">Sysselsättningsgrad (%)</Label>
                                    <Input
                                        id="employment_rate"
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="any"
                                        value={formData.employment_rate}
                                        onChange={(e) => setField('employment_rate', e.target.value)}
                                        placeholder="t.ex. 100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="night_share">Nattandel (%)</Label>
                                    <Input
                                        id="night_share"
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="any"
                                        value={formData.night_share}
                                        onChange={(e) => setField('night_share', e.target.value)}
                                        placeholder="t.ex. 30"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Lön */}
                        <section className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Lön
                            </h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="current_salary">Nuvarande lön (kr/mån)</Label>
                                    <Input
                                        id="current_salary"
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={formData.current_salary}
                                        onChange={(e) => setField('current_salary', e.target.value)}
                                        placeholder="t.ex. 35000"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Avbryt
                        </Button>
                        <Button type="submit" disabled={loading || stations.length === 0}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? 'Spara ändringar' : 'Lägg till'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default EmployeeFormDialog
